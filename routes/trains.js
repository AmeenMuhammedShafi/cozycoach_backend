import express from 'express';
import trains from '../models/trains.js';
import stations from '../models/stations.js';
import votes from '../models/votes.js';
import users from '../models/users.js';
import AggregateCache from '../models/aggregatecache.js'; // your model
import aggregatecache from '../models/aggregatecache.js';
const router = express.Router();

// --- STATIONS SEARCH ---
router.get('/stations', async (req, res) => {
	try {
		const { search } = req.query;
		const results = await stations.find({ name: { $regex: search, $options: "i" } }).limit(10);
		res.status(200).json(results);
	} catch (err) {
		return res.status(500).json({ msg: "server error" });
	}
});

// --- TRAIN LIST BETWEEN STATIONS ---
router.get('/search', async (req, res) => {
	try {
		const { from, to } = req.query;
		if (!from || !to) return res.status(400).json({ msg: "both from and to are required" });

		const alltrains = await trains.find().populate("route.stationid");
		const validtrains = alltrains.filter(train => {
			const route = train.route;
			const fromIndex = route.findIndex(r => r.stationid._id.toString() === from);
			const toIndex = route.findIndex(s => s.stationid._id.toString() === to);
			return fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex;
		});
		return res.status(200).json(validtrains);
	} catch (err) {
		return res.status(500).json({ msg: "server error" });
	}
});

// --- TRAIN DETAILS & PREDICTION ---
router.get('/train-details', async (req, res) => {
	try {
		const { trainId, from, to, deviceId } = req.query;
		if (!trainId || !from || !to || !deviceId) 
			return res.status(400).json({ msg: "trainId, from, to, and deviceId are required" });

		const train = await trains.findById(trainId).populate('route.stationid');
		if (!train) return res.status(404).json({ msg: "Train not found" });

		const route = train.route;
		const fromIndex = route.findIndex(r => r.stationid._id.toString() === from);
		const toIndex = route.findIndex(r => r.stationid._id.toString() === to);
		if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) 
			return res.status(400).json({ msg: "Invalid from/to stations for this train" });

		// --- Load or create AggregateCache for 'from' station ---
		let aggCache = await AggregateCache.findOne({ trainId, stationId: from });
		if (!aggCache) {
			aggCache = await AggregateCache.create({
				trainId,
				stationId: from,
				coachdata: train.coaches.map(c => ({
					position: c.position,
					crowdlevel: c.crowdlevel,
					totalsampleweight: 0,
					downboard: 0,
					running_totalweight: 0
				}))
			});
		}

		// --- Compute running_totalweight dynamically from previous station ---
		for (const coach of aggCache.coachdata) {
			let prevRunning = 0;
			if (fromIndex > 0) {
				const prevStationId = route[fromIndex - 1].stationid._id.toString();
				const prevAgg = await AggregateCache.findOne({ trainId, stationId: prevStationId });
				if (prevAgg) {
					const prevCoach = prevAgg.coachdata.find(c => c.position === coach.position);
					if (prevCoach) prevRunning = prevCoach.running_totalweight || 0;
				}
			}
			coach.running_totalweight = prevRunning + (coach.totalsampleweight || 0) - (coach.downboard || 0);

			// Apply decay based on station order
			const decayFactor = 1 - (fromIndex * 0.05); // adjust 0.05 for stronger/weaker decay
			coach.crowdlevel = Math.max(0, (coach.crowdlevel * decayFactor) + coach.running_totalweight);
		}
		await aggCache.save();

		// --- Predict least crowded coach ---
		let predictedCoach = aggCache.coachdata.reduce(
			(minC, c) => (c.crowdlevel < minC.crowdlevel ? c : minC), 
			aggCache.coachdata[0]
		);
		let predictedPosition = predictedCoach.position;

		// --- Passive vote ---
		await votes.create({ deviceId, trainId, from, to, position: predictedPosition, weight: 0.5 });

		// --- Update totalsampleweight at 'from' and downboard at 'to' ---
		await AggregateCache.updateOne(
			{ trainId, stationId: from, "coachdata.position": predictedPosition },
			{ $inc: { "coachdata.$.totalsampleweight": 0.5 } }
		);
		await AggregateCache.updateOne(
			{ trainId, stationId: to, "coachdata.position": predictedPosition },
			{ $inc: { "coachdata.$.downboard": 0.5 } }
		);

		// --- Award 10 XP ---
		const user = await users.findOne({ deviceId });
		if (user) {
			user.xp = (user.xp || 0) + 10;
			await user.save();
		}

		return res.status(200).json({
			msg: "Crowdlevels updated, 10 XP awarded for viewing",
			coaches: aggCache.coachdata.map(c => ({ position: c.position, crowdlevel: c.crowdlevel }))
		});

	} catch (err) {
		console.error(err);
		return res.status(500).json({ msg: "Server error" });
	}
});

// --- CONFIRM VOTE ---

router.post('/vote/confirm', async (req, res) => {
	try {
		const { deviceId, trainId, from, to, chosenPosition } = req.body;
		if (!deviceId || !trainId || !from || !to || !chosenPosition) 
			return res.status(400).json({ msg: "All fields are required" });

		const train = await trains.findById(trainId).populate('route.stationid');
		if (!train) return res.status(404).json({ msg: "Train not found" });

		const route = train.route;
		const fromIndex = route.findIndex(r => r.stationid._id.toString() === from);
		if (fromIndex === -1) return res.status(400).json({ msg: "From station not on this train route" });

		// --- 1. Check if there was a predicted vote ---
		let predictedVote = await votes.findOne({ deviceId, trainId, from, to });

		if (predictedVote) {
			if (predictedVote.position !== chosenPosition) {
				// Subtract weight from old predicted coach
				await AggregateCache.updateOne(
					{ trainId, stationId: from, "coachdata.position": predictedVote.position },
					{ $inc: { "coachdata.$.totalsampleweight": -predictedVote.weight } }
				);

				// Remove old predicted vote
				await predictedVote.remove();

				// Create new confirmed vote
				predictedVote = await votes.create({ deviceId, trainId, from, to, position: chosenPosition, weight: 1 });
			} else {
				// Predicted position matches confirmed, just normalize weight
				predictedVote.weight = 1;
				await predictedVote.save();
			}
		} else {
			// No predicted vote, just create confirmed vote
			predictedVote = await votes.create({ deviceId, trainId, from, to, position: chosenPosition, weight: 1 });
		}

		// --- 2. Normalize totalsampleweight at FROM station for confirmed position ---
		await AggregateCache.updateOne(
			{ trainId, stationId: from, "coachdata.position": chosenPosition },
			{ $set: { "coachdata.$.totalsampleweight": 1 } }
		);

		// --- 3. Increment downboard at TO station ---
		await AggregateCache.updateOne(
			{ trainId, stationId: to, "coachdata.position": chosenPosition },
			{ $inc: { "coachdata.$.downboard": 1 } }
		);

		// --- 4. Update running_totalweight and recompute crowdlevel at FROM ---
		const aggCache = await AggregateCache.findOne({ trainId, stationId: from });
		for (const coach of aggCache.coachdata) {
			let prevRunning = 0;
			if (fromIndex > 0) {
				const prevStationId = route[fromIndex - 1].stationid._id.toString();
				const prevAgg = await AggregateCache.findOne({ trainId, stationId: prevStationId });
				if (prevAgg) {
					const prevCoach = prevAgg.coachdata.find(c => c.position === coach.position);
					if (prevCoach) prevRunning = prevCoach.running_totalweight || 0;
				}
			}
			coach.running_totalweight = prevRunning + (coach.totalsampleweight || 0) - (coach.downboard || 0);
			coach.crowdlevel = Math.max(0, coach.running_totalweight);
		}
		await aggCache.save();

		// --- 5. Award XP ---
		const user = await users.findOne({ deviceId });
		if (user) {
			user.xp = (user.xp || 0) + 50;
			await user.save();
		}

		return res.status(200).json({
			msg: "Vote confirmed, crowdlevels updated, 50 XP awarded",
			coaches: aggCache.coachdata.map(c => ({ position: c.position, crowdlevel: c.crowdlevel }))
		});

	} catch (err) {
		console.error(err);
		return res.status(500).json({ msg: "Server error" });
	}
});

export default router;