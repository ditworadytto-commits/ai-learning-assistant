import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api.js";

export default function Auth() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(`/auth/${mode}`, form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/";
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <section className="auth">
      <h1>Turn your notes into something you can study from.</h1>
      <p className="muted">Upload a PDF, then ask questions, get a summary, flip flashcards and take a quiz.</p>
      <div className="panel">
        {mode === "register" && <input placeholder="Your name" value={form.name} onChange={set("name")} />}
        <input placeholder="Email" type="email" value={form.email} onChange={set("email")} />
        <input placeholder="Password (6+ characters)" type="password" value={form.password} onChange={set("password")}
          onKeyDown={(e) => e.key === "Enter" && submit()} />
        {error && <p className="error">{error}</p>}
        <button onClick={submit} disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}</button>
        <button className="ghost" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "New here? Create an account" : "Have an account? Log in"}
        </button>
      </div>
    </section>
  );
}
