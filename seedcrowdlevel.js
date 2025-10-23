// seedAggregateCache.js
import mongoose from "mongoose";
import AggregateCache from "./models/aggregatecache.js";
import Train from "./models/trains.js";
import ENV from './config/config.js';

// Helper to generate slight randomness around seed (optional)
function randomAround(seed, spread = 2) {
  return seed + Math.floor(Math.random() * (spread * 2 + 1)) - spread;
}

async function seedFirstStation(trainId, route) {
  if (!route || route.length === 0) return;

  const firstStation = route[0];
  const stationId = firstStation._id || firstStation;

  const existing = await AggregateCache.findOne({ trainId, stationId });
  if (existing) {
    console.log(`⚙️ Cache already exists for first station: ${firstStation.name || stationId}`);
    return;
  }

  // Fetch train to get seedlevel
  const train = await Train.findById(trainId);
  if (!train) throw new Error("Train not found");

  const coachdata = ['front', 'middle', 'rear'].map(pos => {
    const seedValue = train.seedlevel.find(s => s.position === pos)?.seed || 50;
    return {
      position: pos,
      crowdlevel: randomAround(seedValue), // initial crowdlevel based on seed
      totalsampleweight: 0,
      downboard: 0,
      running_totalweight: 0
    };
  });

  await AggregateCache.create({ trainId, stationId, coachdata });
  console.log(`✅ Seeded first station: ${firstStation.name || stationId} using train seed`);
}

async function main() {
  try {
    await mongoose.connect(ENV.MONGO_URL);
    console.log("✅ Connected to MongoDB");

    const trainId = "68f4b572dd2b6850754bfd99"; // replace with actual train ID
    const train = await Train.findById(trainId).populate("route.stationid");

    if (!train) {
      console.error("❌ Train not found!");
      process.exit(1);
    }

    await seedFirstStation(train._id, train.route.map(r => r.stationid));

    console.log("🎯 First station aggregate cache seeding complete!");
    mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error seeding aggregate cache:", err);
    process.exit(1);
  }
}

main();
