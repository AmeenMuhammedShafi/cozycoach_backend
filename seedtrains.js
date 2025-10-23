// seedTrain.js
import mongoose from 'mongoose';
import Train from './models/trains.js';
import Station from './models/stations.js';
import ENV from './config/config.js';

mongoose.connect(ENV.MONGO_URL)
  .then(async () => {
    console.log('✅ MongoDB connected for seeding train');

    const stations = await Station.find({}).sort({ stationid: 1 });

    // Map stations to route format
    const route = stations.map((s, idx) => ({
      stationid: s._id,
      order: idx + 1,
      downboards: [
        { position: 'front', count: 0 },
        { position: 'middle', count: 0 },
        { position: 'rear', count: 0 }
      ],
      totalsample_weight: [
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
        { position: 'front', crowdlevel: 50 },
        { position: 'middle', crowdlevel: 50 },
        { position: 'rear', crowdlevel: 50 }
      ]
    };

    await Train.deleteMany({}); // clear old trains
    await Train.create(trainData);

    console.log('✅ Train seeded successfully');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Error seeding train:', err);
  });
