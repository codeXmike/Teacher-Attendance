import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

export const StudentScanPage = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const [state, setState] = useState({ loading: false, error: "", result: null });
  const tokenFromUrl = useMemo(() => new URLSearchParams(location.search).get("token"), [location.search]);

  const submitAttendance = async () => {
    if (!tokenFromUrl) {
      setState((current) => ({ ...current, error: "No QR token found in this link." }));
      return;
    }

    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const result = await apiRequest("/attendance/scan", {
        method: "POST",
        token,
        body: {
          token: tokenFromUrl
        }
      });
      setState((current) => ({ ...current, loading: false, result }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message }));
    }
  };

  return (
    <div className="student-shell">
      <div className="student-shell__header">
        <div>
          <strong>{user.name}</strong>
          <span>{user.matricNo}</span>
        </div>
      </div>
      <div className="student-shell__body">
        <div className="section-head">
          <span>Attendance Check-in</span>
        </div>
        <p className="muted">
          This page acts as the iPhone and mobile web fallback. The QR code opens this link directly with a
          short-lived token.
        </p>
        <div className="scan-meta">
          <span>Token present: {tokenFromUrl ? "Yes" : "No"}</span>
        </div>
        <button className="btn btn-primary" onClick={submitAttendance} disabled={state.loading || !tokenFromUrl}>
          {state.loading ? "Submitting..." : "Record Attendance"}
        </button>
        {state.error ? <p className="error-text">{state.error}</p> : null}
        {state.result ? (
          <div className="success-block">
            <h1>Attendance Recorded</h1>
            <p>
              {state.result.course.courseCode} - {state.result.course.courseTitle}
            </p>
            <p>{new Date(state.result.timestamp).toLocaleString()}</p>
          </div>
        ) : null}
        {!tokenFromUrl ? (
          <p className="muted">
            Open this page from a scanned QR link. <Link to="/">Return home</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
};
