export const ModeToggle = ({ mode, setMode }) => (
  <div className="mode-toggle">
    <button
      type="button"
      className={mode === "login" ? "toggle-active" : ""}
      onClick={() => setMode("login")}
    >
      Login
    </button>
    <button
      type="button"
      className={mode === "register" ? "toggle-active" : ""}
      onClick={() => setMode("register")}
    >
      Register
    </button>
  </div>
);
