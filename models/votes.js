import mongoose from "mongoose";

const votesschema = new mongoose.Schema({
	deviceId:{
		type:String
	},
	trainId:{
		type:mongoose.Schema.Types.ObjectId,
		ref:'trains'
	},
	from:{
		type:mongoose.Schema.Types.ObjectId,
		ref:'stations'
	},
	to:{
		type:mongoose.Schema.Types.ObjectId,
		ref:'stations'
	},
	position:{
		type:String,
		enum:['front','middle','rear']
	},
	weight:{
		type:Number,
		default:0
	},
	timestamp:{
		type:Date,
		default:Date.now
	}
});
votesschema.index({trainId:1,from:1,position:1});
votesschema.index({deviceId:1});
votesschema.index({timestamp:-1});
export default mongoose.model('votes',votesschema);