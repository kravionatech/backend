import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    authorDetails:{
name:{
    type:String,required:true
},
email:{
    type:String,required:true

},username:{
        type:String,

}
    },
    userID:{
type:mongoose.Schema.Types.ObjectId,
ref:"user"

    },

    originalName: {
      type: String,
      required: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    publicId: {
      type: String,
      default: null,
    },

    mimeType: {
      type: String,
      required: true,
    },

    extension: {
      type: String,
    },

    fileSize: {
      type: Number,
      required: true,
    },

    mediaType: {
      type: String,
      enum: ["image", "video", "audio", "document", "other"],
      required: true,
    },

    width: {
      type: Number,
      default: null,
    },

    height: {
      type: Number,
      default: null,
    },

    duration: {
      type: Number,
      default: null,
    },

 

    altText: {
      type: String,
      default: "",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);



export const mediaModel= mongoose.model("Media",mediaSchema) 