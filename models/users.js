import mongoose from "mongoose";

const userschema = new mongoose.Schema({
	deviceId:{
		type:String,
		unique:true
	},
	xp:{
		type:Number,
		default:0
	},
	lastactive:{
		type:Date,
		default:Date.now
	},
	streak:{
		type:Number,
		default:0
	}
});

export default mongoose.model('users',userschema);