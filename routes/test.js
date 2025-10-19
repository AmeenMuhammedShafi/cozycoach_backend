import mongoose from 'mongoose';
import Station from '../models/stations.js';
import ENV from '../config/config.js';

async function runTests() {
  console.log('Connecting to:', ENV.MONGO_URL);
  await mongoose.connect(ENV.MONGO_URL);

  const all = await Station.find({});
  console.log('All stations:', all); // should print all seeded stations

  const results = await Station.find({ name: { $regex: 'kozh', $options: 'i' } });
  console.log('Search results for "kozh":', results);

  await mongoose.disconnect();
}

runTests().catch(console.error);
