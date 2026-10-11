import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api.js";

export default function Dashboard() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const load = () => api.get("/documents").then((r) => setDocs(r.data)).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    setError("");
    try {
      await api.post("/documents", fd);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
      fileRef.current.value = "";
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this document and its study material?")) return;
    await api.delete(`/documents/${id}`);
    load();
  };

  return (
    <section>
      <div className="row between">
        <h2>Your documents</h2>
        <button onClick={() => fileRef.current.click()} disabled={uploading}>{uploading ? "Reading PDF..." : "Upload PDF"}</button>
        <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={upload} />
      </div>
      {error && <p className="error">{error}</p>}
      {loading ? <p className="muted">Loading...</p> : docs.length === 0 ? (
        <p className="empty">Nothing here yet. Upload a PDF of your notes or a chapter to get started (up to 10 MB, text-based PDFs only).</p>
      ) : (
        <ul className="docs">
          {docs.map((d) => (
            <li key={d._id}>
              <Link to={`/doc/${d._id}`}>
                <strong>{d.title}</strong>
                <span className="muted">{new Date(d.createdAt).toLocaleDateString()}</span>
              </Link>
              <button className="ghost" onClick={() => remove(d._id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
