const MAX_CHARS = 60000;
const clip = (t) => (t.length > MAX_CHARS ? t.slice(0, MAX_CHARS) : t);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

async function callModel(model, body) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error(`AI request failed (${res.status}): ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
}

// Retries temporary Google errors (busy/overloaded) before giving up.
async function gemini({ system, contents, json = false }) {
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: json ? { responseMimeType: "application/json" } : {},
  };
  const models = [process.env.GEMINI_MODEL || "gemini-3.8-flash", process.env.GEMINI_FALLBACK_MODEL].filter(Boolean);
  let lastErr;
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await callModel(model, body);
      } catch (e) {
        lastErr = e;
        if (!RETRYABLE.has(e.status)) throw e;
        await sleep(1000 * 2 ** attempt);
      }
    }
  }
  if (RETRYABLE.has(lastErr.status)) {
    const busy = new Error("The AI service is busy right now. Please try again in a moment.");
    busy.status = 503;
    throw busy;
  }
  throw lastErr;
}

const asUser = (text) => [{ role: "user", parts: [{ text }] }];
const parseJSON = (s) => JSON.parse(s.replace(/^```json|```$/g, "").trim());

export const summarize = (text) =>
  gemini({
    system: "You are a study assistant. Summarize the material clearly for a student: a short overview, then key points as bullets.",
    contents: asUser(clip(text)),
  });

export const answer = (text, history, question) =>
  gemini({
    system: `You are a friendly tutor. Answer using the study material below. If the answer is not in it, say so, then help with general knowledge.\n\nMATERIAL:\n${clip(text)}`,
    contents: [
      ...history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      { role: "user", parts: [{ text: question }] },
    ],
  });

export const makeFlashcards = async (text, n = 8) =>
  parseJSON(
    await gemini({
      system: `Create ${n} flashcards from the material. Return ONLY a JSON array of {"question": string, "answer": string}.`,
      contents: asUser(clip(text)),
      json: true,
    })
  );

export const makeQuiz = async (text, n = 5) =>
  parseJSON(
    await gemini({
      system: `Create ${n} multiple-choice questions from the material. Return ONLY a JSON array of {"question": string, "options": [4 strings], "answerIndex": number 0-3, "explanation": string}.`,
      contents: asUser(clip(text)),
      json: true,
    })
  );