// seedStations.js
import mongoose from 'mongoose';
import stations from './models/stations.js'; // adjust path if needed
import ENV from './config/config.js';

const stationsData = [
  { stationid: 1, name: 'Trivandrum Central' },
  { stationid: 2, name: 'Kollam Junction' },
  { stationid: 3, name: 'Alappuzha' },
  { stationid: 4, name: 'Ernakulam Junction' },
  { stationid: 5, name: 'Thrissur' },
  { stationid: 6, name: 'Kozhikode' }
];

mongoose.connect(ENV.MONGO_URL)
  .then(async () => {
    console.log('MongoDB connected for seeding stations');
    await stations.deleteMany({}); // clear old
    await stations.insertMany(stationsData);
    console.log('Stations seeded successfully');
    mongoose.disconnect();
  })
  .catch(err => console.error(err));
