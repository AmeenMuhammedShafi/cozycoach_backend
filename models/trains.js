import mongoose from "mongoose";

const trainschema = new mongoose.Schema({
	name:{
		type:String
	},
	number:{
		type:Number
	},
	seedlevel:[
		{
			position:{
				type:String,
				enum:['front','middle','rear']
			},
			seed:{
				type:Number,
				default:50
			}
		}
	],
	route:[{
			stationid:{type:mongoose.Schema.Types.ObjectId,
				ref:'stations'
			},
			order:{
				type:Number
			},
		}],
	coaches:[
			{
				position:{
					type:String,
					enum:['front','middle','rear']
				},
				crowdlevel:{
					type:Number,
					min:0,
					max:100
				}
			}
		]
});
trainschema.index({number:1});
trainschema.index({name:1});
trainschema.index({'route.stationid':1});
export default mongoose.model('trains',trainschema);