// seedTrain.js
import mongoose from 'mongoose';
import trains from './models/trains.js';
import ENV from './config/config.js';
import stations from './models/stations.js';

mongoose.connect(ENV.MONGO_URL)
  .then(async () => {
    console.log('MongoDB connected for seeding train');

    const stns = await stations.find({}).sort({ stationid: 1 });

    const route = stns.map((s, idx) => ({
      stationid: s._id,
      order: idx + 1,
      downboards: [
        { position: 'front', count: 0 },
        { position: 'middle', count: 0 },
        { position: 'rear', count: 0 }
      ]
    }));

    const trainData = {
      name: 'Morning Local Express',
      number: 101,
      seedlevel: [
        { position: 'front', seed: 50 },
        { position: 'middle', seed: 50 },
        { position: 'rear', seed: 50 }
      ],
      route,
      coaches: [
        { position: 'front', crowdlevel: 30 },
        { position: 'middle', crowdlevel: 50 },
        { position: 'rear', crowdlevel: 70 }
      ]
    };

    await trains.deleteMany({}); // clear old
    await trains.create(trainData);

    console.log('Train seeded successfully');
    mongoose.disconnect();
  })
  .catch(err => console.error(err));
