import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import ENV from './config/config.js';

// Import your routers
import userRoutes from './routes/auth.js';
import trainRoutes from './routes/trains.js';

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// --- DB CONNECTION ---
mongoose.connect(ENV.MONGO_URL).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- ROUTES ---
app.use('/api/users', userRoutes);
app.use('/api/trains', trainRoutes);

// --- HEALTH CHECK ---
app.get('/', (req, res) => {
    res.status(200).json({ msg: 'Server is running!' });
});

// --- ERROR HANDLING ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ msg: 'Server error', error: err.message });
});

// --- SERVER START ---

app.listen(ENV.PORT, () => {
    console.log(`Server listening on port ${ENV.PORT}`);
});

