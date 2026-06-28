import mongoose from "mongoose";

const newsLatterSchema = new mongoose.Schema({
    
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      match: [
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
        "Enter a valid email address",
      ],
      minlength: [3, "Email should be at least 3 characters"],
      maxlength: [50, "Email should be maximum 50 characters"],
    },
    status: {
      type: String,
      default: "subscriber",
      enum: ["subscriber", "subscriber_blocked"],
    },
  
},{timestamps:true})

export const newsLatterModel = mongoose.model("newslatter",newsLatterSchema)