import mongoose from 'mongoose';

const stationschema = new mongoose.Schema({
	stationid:{
		type:Number
	},
	name:{
		type:String
	}
});

export default mongoose.model('stations',stationschema);