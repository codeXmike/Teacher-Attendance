import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import { AuthShell } from "../components/AuthShell";
import { ModeToggle } from "../components/ModeToggle";
import { useAuth } from "../context/AuthContext";

export const StudentAuthPage = () => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    matricNo: "",
    lecturerEmail: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = await apiRequest(`/auth/${mode}`, {
        method: "POST",
        body: { ...form, role: "student" }
      });
      login(payload);
      navigate(`/scan${location.search || ""}`);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Student Access"
      subtitle="Lecturer?"
      oppositeLabel="Open lecturer console"
      oppositeHref="/lecturer/auth"
    >
      <ModeToggle mode={mode} setMode={setMode} />
      <form className="auth-form" onSubmit={submit}>
        {mode === "register" ? (
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
        ) : null}
        
        <label>
          <span>Matric Number</span>
          <input
            value={form.matricNo}
            onChange={(event) => setForm({ ...form, matricNo: event.target.value })}
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
          {loading ? "Processing..." : mode === "login" ? "Login" : "Create Student Access"}
        </button>
      </form>
    </AuthShell>
  );
};