import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import Auth from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DocumentView from "./pages/DocumentView.jsx";

function Guard({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">Study Desk</Link>
        {user && (
          <div className="who">
            <span>{user.name}</span>
            <button className="ghost" onClick={logout}>Log out</button>
          </div>
        )}
      </header>
      <main className="page">
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/" element={<Guard><Dashboard /></Guard>} />
          <Route path="/doc/:id" element={<Guard><DocumentView /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
