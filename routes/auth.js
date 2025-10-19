import express from 'express';
import users from '../models/users.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post('/identify',async (req,res)=>{
	try{
		const {deviceId} = req.body;
	    let user = await users.findOne({deviceId});
	    if (!user)
	    {
		    user=await users.create({deviceId});
	    }
	    const token = jwt.sign({userId:user._id,deviceId:user.deviceId},process.env.JWT_SECRET,{expiresIn:'1h'});
	    return res.status(200).json({user:{
			deviceId:user.deviceId,
			xp:user.xp,
			streak:user.streak
		},token});
	}
	catch(err)
	{
		return res.status(500).json(err);
	}
});

export default router;