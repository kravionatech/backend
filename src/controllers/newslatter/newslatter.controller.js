import { newsLatterModel } from "../../models/newslatter/newslatter.model.js";

export const createNewsLatter = async (req,res)=>{
    try {
        const {email}= req.body;
        if(!email) return res.status(400).json({message:"Email is required"})

            // check subscriber are exits
        const isExist  = await newsLatterModel.findOne({email}).select("email")

        if(isExist) return res.status(400).json({message:"Subscriber already exits"})

const subscriber = await newsLatterModel.create({email})

return res.status(201).json({message:"Subscriber created successfully",success:true,data:subscriber})
    } catch (error) {
     return res.status(500).json({message:error.message,success:false})
       
    }
}


// get all user 
export const getAllSubscribers = async (req,res)=>{

    try {
        const user = req.user;
        if(!user) return res.status(401).json({message:"Unauthorized",success:false})
        if(user.role !== "admin" && user.role !== "super_admin") return res.status(403).json({message:"Forbidden",success:false})
            // check subscriber are exits
const isSubscriber = await newsLatterModel.find({}).sort({ createdAt: -1 })

return res.status(200).json({message:"Subscriber fetched successfully",success:true,data:isSubscriber})
    } catch (error) {
        return res.status(500).json({message:error.message,success:false})
       
    
    }
}

// delete Subscriber

export const deleteSubscriber = async (req,res)=>{
    try {
        const user = req.user;
        if(!user) return res.status(401).json({message:"Unauthorized",success:false})
            if(user.role !== "admin" && user.role !== "super_admin")
                return res.status(403).json({message:"Forbidden",success:false})

            // check subscriber are exits
        const isSubscriber = await newsLatterModel.findById(req.params.id)
        if(!isSubscriber) return res.status(404).json({message:"Subscriber not found",success:false})

const deleteSubscriber = await newsLatterModel.findByIdAndDelete(req.params.id)
           

        return res.status(200).json({message:"Subscriber deleted successfully",success:true,data:isSubscriber})


    }catch(error){
        return res.status(500).json({message:error.message,success:false})
    
    }
}
