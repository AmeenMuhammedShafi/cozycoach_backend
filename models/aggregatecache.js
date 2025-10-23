import mongoose from "mongoose";

const coachDataSchema = new mongoose.Schema({
    position: {
        type: String,
        enum: ['front', 'middle', 'rear'],
        required: true
    },
    crowdlevel: {
        type: Number,
        min: 0,
        max: 100,
        default: 50
    },
    totalsampleweight: {
        type: Number,
        default: 0
    },
    downboard:{
        type:Number,
        default:0
    },
    running_totalweight:{
        type:Number,
        default:0
    }
}, { _id: false });

const aggregateCacheSchema = new mongoose.Schema({
    trainId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'trains',
        required: true
    },
    stationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'stations',
        required: true
    },
    coachdata: {
        type: [coachDataSchema],
        default: [
            { position: 'front' },
            { position: 'middle' },
            { position: 'rear' }
        ]
    }
}, { timestamps: true });

aggregateCacheSchema.index({ trainId: 1, stationId: 1 }, { unique: true });

export default mongoose.model('aggregatecache', aggregateCacheSchema);
