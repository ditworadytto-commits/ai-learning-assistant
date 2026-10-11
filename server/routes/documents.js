import { Router } from "express";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import auth from "../middleware/auth.js";
import Doc from "../models/Document.js";
import { summarize, answer, makeFlashcards, makeQuiz } from "../services/ai.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
router.use(auth);

const mine = async (req, res) => {
  const doc = await Doc.findOne({ _id: req.params.id, user: req.userId });
  if (!doc) res.status(404).json({ message: "Document not found" });
  return doc;
};

router.get("/", async (req, res, next) => {
  try {
    res.json(await Doc.find({ user: req.userId }).select("title createdAt").sort("-createdAt"));
  } catch (e) { next(e); }
});

router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Choose a PDF to upload" });
    if (req.file.mimetype !== "application/pdf") return res.status(400).json({ message: "Only PDF files are supported" });
    let text;
try {
  const parser = new PDFParse({ data: req.file.buffer });
  ({ text } = await parser.getText());
  await parser.destroy();
} catch {
  return res.status(422).json({ message: "Could not read this PDF. Try re-saving it with Print > Save as PDF." });
}
    if (!text.trim()) return res.status(422).json({ message: "No readable text found. Scanned PDFs are not supported." });
    const doc = await Doc.create({ user: req.userId, title: req.file.originalname.replace(/\.pdf$/i, ""), text });
    res.status(201).json({ _id: doc._id, title: doc.title });
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const doc = await mine(req, res);
    if (doc) res.json({ ...doc.toObject(), text: undefined });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await Doc.deleteOne({ _id: req.params.id, user: req.userId });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post("/:id/summary", async (req, res, next) => {
  try {
    const doc = await mine(req, res); if (!doc) return;
    doc.summary = await summarize(doc.text);
    await doc.save();
    res.json({ summary: doc.summary });
  } catch (e) { next(e); }
});

router.post("/:id/chat", async (req, res, next) => {
  try {
    const doc = await mine(req, res); if (!doc) return;
    const question = (req.body.message || "").trim();
    if (!question) return res.status(400).json({ message: "Type a question" });
    const reply = await answer(doc.text, doc.chat.slice(-10), question);
    doc.chat.push({ role: "user", content: question }, { role: "assistant", content: reply });
    await doc.save();
    res.json({ reply });
  } catch (e) { next(e); }
});

router.post("/:id/flashcards", async (req, res, next) => {
  try {
    const doc = await mine(req, res); if (!doc) return;
    doc.flashcards = await makeFlashcards(doc.text);
    await doc.save();
    res.json({ flashcards: doc.flashcards });
  } catch (e) { next(e); }
});

router.post("/:id/quiz", async (req, res, next) => {
  try {
    const doc = await mine(req, res); if (!doc) return;
    doc.quiz = await makeQuiz(doc.text);
    await doc.save();
    res.json({ quiz: doc.quiz });
  } catch (e) { next(e); }
});

export default router;
