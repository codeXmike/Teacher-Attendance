import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

export const AdminAuthPage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user?.role === "admin") return <Navigate to="/management" replace />;

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      
      const auth = await apiRequest("/auth/login", { method: "POST", body: { ...form, role: "admin" } });
      login(auth); navigate("/management", { replace: true });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return <main className="admin-auth"><form className="admin-auth__panel card" onSubmit={submit}>
    <p className="eyebrow">Attendance HQ · Administration</p><h1>Administrator sign in</h1>
    <p className="muted">Use your provisioned administrator account to manage platform records.</p>
    <label>Email<input type="email" autoComplete="username" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
    <label>Password<input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    <Link to="/">Return to home</Link>
  </form></main>;
};
