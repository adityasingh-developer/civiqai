import mongoose from "mongoose";

const ChatImageSchema = new mongoose.Schema(
  {
    cacheKey: { type: String, required: true },
    name: { type: String, required: true },
    mimeType: { type: String, required: true },
  },
  { _id: false }
);

const ChatSchema = new mongoose.Schema(
  {
    promptEnc: { type: String, required: true },
    answerEnc: { type: String, required: true },
    promptImages: { type: [ChatImageSchema], default: [] },
    userTime: { type: Date, required: true },
    assistantTime: { type: Date, required: true },
    savedUser: { type: Boolean, default: false },
    savedAssistant: { type: Boolean, default: false },
    savedUserAt: { type: Date, default: null },
    savedAssistantAt: { type: Date, default: null },
  },
  { _id: true }
);

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: { type: String },
    image: { type: String },
    provider: { type: String },
    profileEnc: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    chatHistory: { type: [ChatSchema], default: [] },
  },
  { collection: "userData" }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
