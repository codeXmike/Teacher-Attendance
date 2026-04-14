import { Link } from "react-router-dom";

export const AuthShell = ({ title, subtitle, children, oppositeLabel, oppositeHref }) => (
  <div className="shell">
    <div className="shell__masthead">
      <Link to="/" className="shell__brand">
        Attendance Command
      </Link>
      <div className="shell__switch">
        <span>{subtitle}</span>
        <Link to={oppositeHref}>{oppositeLabel}</Link>
      </div>
    </div>
    <div className="auth-panel">
      <div className="section-head">
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  </div>
);
