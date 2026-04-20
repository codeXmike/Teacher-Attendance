import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const LandingPage = () => {
  const { token, user } = useAuth();

  // If logged in as student, show quick scan link
  if (token && user?.role === "student") {
    return (
      <div className="landing">
        <div className="landing__content">
          <p className="eyebrow">Welcome, {user.name}</p>
          <h1>Ready to check in?</h1>
          <p className="muted">
            Use your camera to scan QR codes and record attendance directly in your browser.
          </p>
          <div className="inline-actions">
            <Link to="/scan" className="button-link">
              Scan QR Code
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If logged in as lecturer, show console link
  if (token && user?.role === "lecturer") {
    return (
      <div className="landing">
        <div className="landing__content">
          <p className="eyebrow">Welcome, {user.name}</p>
          <h1>Ready to take attendance?</h1>
          <p className="muted">
            Manage your courses and sessions.
          </p>
          <div className="inline-actions">
            <Link to="/lecturer/scan" className="button-link">
              Lecturer Console
            </Link>
            <Link to="/lecturer/auth" className="ghost-link">
              Switch Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in - show auth options
  return (
    <div className="landing">
      <div className="landing__content">
        <p className="eyebrow">Multi-tenant QR attendance</p>
        <h1>Secure attendance for lecturers, students, desktop, and mobile web.</h1>
        <p className="muted">
          Rotating QR tokens, JWT-authenticated submissions, geofencing, and workspace isolation by lecturer.
        </p>
        <div className="inline-actions">
          <Link to="/lecturer/auth" className="button-link">
            Lecturer Console
          </Link>
          <Link to="/student/auth" className="ghost-link">
            Student Access
          </Link>
        </div>
      </div>
    </div>
  );
};
