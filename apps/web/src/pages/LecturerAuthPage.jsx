import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import { AuthShell } from "../components/AuthShell";
import { ModeToggle } from "../components/ModeToggle";
import { useAuth } from "../context/AuthContext";

export const LecturerAuthPage = () => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, user, logout } = useAuth();

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = await apiRequest(`/auth/${mode}`, {
        method: "POST",
        body: { ...form, role: "lecturer" }
      });
      login(payload);
      navigate("/lecturer");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setForm({ name: "", email: "", password: "" });
    setMode("login");
  };

  return (
    <AuthShell
      title="Lecturer Access"
      subtitle="Student?"
      oppositeLabel="Open student access"
      oppositeHref="/student/auth"
    >
      {user && user.role === "lecturer" ? (
        <div style={{ marginBottom: "20px", padding: "12px", background: "#f0f9ff", borderRadius: "6px", textAlign: "center" }}>
          <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#666" }}>
            Currently logged in as:<br />
            <strong>{user.name}</strong> • {user.email}
          </p>
          <button
            onClick={handleLogout}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Logout & Switch Account
          </button>
        </div>
      ) : null}
      <ModeToggle mode={mode} setMode={setMode} />
      <form className="auth-form" onSubmit={submit}>
        {mode === "register" ? (
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
        ) : null}
        <label>
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </label>
        <label>
          <span>Password</span>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : mode === "login" ? "Login" : "Create Lecturer Workspace"}
        </button>
      </form>
      
    </AuthShell>
  );
};
