import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name should be at least 2 characters"],
      maxlength: [50, "First name should be maximum 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name should be at least 2 characters"],
      maxlength: [50, "Last name should be maximum 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
        "Enter a valid email address",
      ],
      minlength: [3, "Email should be at least 3 characters"],
      maxlength: [100, "Email should be maximum 100 characters"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      minlength: [7, "Phone number should be at least 7 characters"],
      maxlength: [20, "Phone number should be maximum 20 characters"],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      minlength: [3, "Subject should be at least 3 characters"],
      maxlength: [150, "Subject should be maximum 150 characters"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [10, "Message should be at least 10 characters"],
      maxlength: [3000, "Message should be maximum 3000 characters"],
    },
    status: {
      type: String,
      default: "unread",
      enum: ["unread", "read", "replied", "archived"],
    },
  },
  { timestamps: true }
);

export const MessageModel = mongoose.model("message", messageSchema);
