import { NavLink } from "react-router-dom";

export const LecturerShell = ({ user, onLogout, title, subtitle, children }) => (
  <div className="lecturer-shell">
    <aside className="lecturer-shell__sidebar card">
      <div className="brand-block">
        <p className="eyebrow">Lecturer Workspace</p>
        <h2>Attendance HQ</h2>
        <p className="muted">Separate pages for courses, live scan, and attendance records.</p>
      </div>

      <nav className="nav-stack">
        <NavLink to="/lecturer/courses" className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`}>
          Course Management
        </NavLink>
        <NavLink to="/lecturer/scan" className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`}>
          Scan Session
        </NavLink>
        <NavLink to="/lecturer/records" className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`}>
          Attendance Records
        </NavLink>
        <NavLink to="/lecturer/summary" className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`}>
          Attendance Summary
        </NavLink>
      </nav>

      <div className="workspace-card card card--subtle">
        <strong>{user.name}</strong>
        <span>{user.email}</span>
      </div>

      <button className="ghost-button" onClick={onLogout}>
        Logout
      </button>
    </aside>

    <section className="lecturer-shell__main">
      <header className="page-topbar card">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
      </header>
      <div className="page-body">{children}</div>
    </section>
  </div>
);