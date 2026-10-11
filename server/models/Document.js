import mongoose from "mongoose";

const docSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    text: { type: String, required: true },
    summary: { type: String, default: "" },
    flashcards: [{ question: String, answer: String }],
    quiz: [{ question: String, options: [String], answerIndex: Number, explanation: String }],
    chat: [{ role: { type: String, enum: ["user", "assistant"] }, content: String }],
  },
  { timestamps: true }
);

export default mongoose.model("Document", docSchema);
