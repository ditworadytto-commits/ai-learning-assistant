import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { errorMessage } from "../api.js";

const TABS = ["Chat", "Summary", "Flashcards", "Quiz"];

export default function DocumentView() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [tab, setTab] = useState("Chat");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/documents/${id}`).then((r) => setDoc(r.data)).catch((e) => setError(errorMessage(e)));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!doc) return <p className="muted">Loading...</p>;

  return (
    <section>
      <Link to="/" className="back">Back to documents</Link>
      <h2>{doc.title}</h2>
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? "tab active" : "tab"} onClick={() => setTab(t)}>{t}</button>
        ))}
      </nav>
      {tab === "Chat" && <Chat id={id} initial={doc.chat} />}
      {tab === "Summary" && <Summary id={id} initial={doc.summary} />}
      {tab === "Flashcards" && <Flashcards id={id} initial={doc.flashcards} />}
      {tab === "Quiz" && <Quiz id={id} initial={doc.quiz} />}
    </section>
  );
}

function Chat({ id, initial }) {
  const [messages, setMessages] = useState(initial || []);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const end = useRef();
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const send = async () => {
    const message = text.trim();
    if (!message || busy) return;
    setMessages((m) => [...m, { role: "user", content: message }]);
    setText("");
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(`/documents/${id}/chat`, { message });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="chat">
      <div className="messages">
        {messages.length === 0 && <p className="empty">Ask anything about this document, for example: "Explain the main idea in simple words."</p>}
        {messages.map((m, i) => <div key={i} className={`bubble ${m.role}`}>{m.content}</div>)}
        {busy && <div className="bubble assistant muted">Thinking...</div>}
        <div ref={end} />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question" onKeyDown={(e) => e.key === "Enter" && send()} />
        <button onClick={send} disabled={busy}>Send</button>
      </div>
    </div>
  );
}

function Generator({ label, busy, error, onRun, hasData }) {
  return (
    <div>
      <button onClick={onRun} disabled={busy}>{busy ? "Working..." : hasData ? `Regenerate ${label}` : `Generate ${label}`}</button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function useGenerate(path, key, initial) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.post(path);
      setData(res.data[key]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return { data, busy, error, run };
}

function Summary({ id, initial }) {
  const g = useGenerate(`/documents/${id}/summary`, "summary", initial);
  return (
    <div>
      <Generator label="summary" {...g} onRun={g.run} hasData={!!g.data} />
      {g.data && <div className="panel prose">{g.data}</div>}
    </div>
  );
}

function Flashcards({ id, initial }) {
  const g = useGenerate(`/documents/${id}/flashcards`, "flashcards", initial || []);
  const [flipped, setFlipped] = useState({});
  return (
    <div>
      <Generator label="flashcards" {...g} onRun={() => { setFlipped({}); g.run(); }} hasData={g.data.length > 0} />
      <div className="cards">
        {g.data.map((c, i) => (
          <button key={i} className={`card ${flipped[i] ? "flipped" : ""}`} onClick={() => setFlipped({ ...flipped, [i]: !flipped[i] })}>
            {flipped[i] ? c.answer : c.question}
          </button>
        ))}
      </div>
      {g.data.length > 0 && <p className="muted">Tap a card to flip it.</p>}
    </div>
  );
}

function Quiz({ id, initial }) {
  const g = useGenerate(`/documents/${id}/quiz`, "quiz", initial || []);
  const [picked, setPicked] = useState({});
  const answered = Object.keys(picked).length;
  const score = g.data.filter((q, i) => picked[i] === q.answerIndex).length;

  return (
    <div>
      <Generator label="quiz" {...g} onRun={() => { setPicked({}); g.run(); }} hasData={g.data.length > 0} />
      {g.data.map((q, i) => (
        <div className="panel" key={i}>
          <p><strong>{i + 1}. {q.question}</strong></p>
          {q.options.map((o, j) => {
            const done = picked[i] !== undefined;
            const cls = done ? (j === q.answerIndex ? "opt right" : j === picked[i] ? "opt wrong" : "opt") : "opt";
            return <button key={j} className={cls} disabled={done} onClick={() => setPicked({ ...picked, [i]: j })}>{o}</button>;
          })}
          {picked[i] !== undefined && <p className="muted">{q.explanation}</p>}
        </div>
      ))}
      {g.data.length > 0 && answered === g.data.length && <p className="score">You scored {score} out of {g.data.length}.</p>}
    </div>
  );
}
