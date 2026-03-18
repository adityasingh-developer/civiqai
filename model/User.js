import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema(
  {
    promptEnc: { type: String, required: true },
    answerEnc: { type: String, required: true },
    userTime: { type: Date, required: true },
    assistantTime: { type: Date, required: true },
  },
  { _id: true }
);

const SavedMessageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    contentEnc: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    image: { type: String },
    provider: { type: String },
    profileEnc: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    chatHistory: { type: [ChatSchema], default: [] },
    savedMessages: { type: [SavedMessageSchema], default: [] },
  },
  { collection: "userData" }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
