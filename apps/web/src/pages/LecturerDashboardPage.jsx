import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { apiRequest, getApiUrl } from "../api/client";
import { LecturerShell } from "../components/LecturerShell";
import { useAuth } from "../context/AuthContext";
import { useLecturerWorkspace } from "../hooks/useLecturerWorkspace";
import { QRPanel } from "../components/QRPanel";

export const LecturerDashboardPage = () => {
  const { token, user, logout } = useAuth();
  const { courses, selectedCourseId, setSelectedCourseId, error, setError } = useLecturerWorkspace(token);
  const [session, setSession] = useState(null);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [refreshingQr, setRefreshingQr] = useState(false);

  const selectedCourse = useMemo(
    () => courses.find((c) => c._id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const loadAttendance = async (sessionId) => {
    const data = await apiRequest(`/attendance/session/${sessionId}`, { token });
    setAttendanceRows(data.rows);
  };

  const loadSessions = async () => {
    if (!selectedCourseId) { setSession(null); setAttendanceRows([]); return; }
    try {
      const data = await apiRequest(`/session?courseId=${selectedCourseId}`, { token });
      const active = data.find((e) => e.isActive) || null;
      if (active) {
        const detail = await apiRequest(`/session/${active.id}/rotate`, { method: "POST", token });
        setSession({ ...detail, id: active.id, isActive: true, qrAttendanceCount: detail.qrAttendanceCount ?? 0 });
        await loadAttendance(active.id);
      } else {
        setSession(null);
        setAttendanceRows([]);
      }
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { loadSessions(); }, [selectedCourseId, token]);

  useEffect(() => {
    if (!token || !session?.id) return undefined;
    const socket = io(getApiUrl(), { auth: { token }, query: { sessionId: session.id } });

    socket.on("attendance:created", (payload) => {
      setAttendanceRows((curr) => {
        if (curr.some((r) => r.id === payload.id)) return curr;
        return [{ id: payload.id, student: payload.student, timestamp: payload.timestamp }, ...curr];
      });
      setSession((curr) => (curr ? { ...curr, qrAttendanceCount: payload.qrAttendanceCount ?? curr.qrAttendanceCount } : curr));
    });
    socket.on("attendance:deleted", (payload) => {
      setAttendanceRows((curr) => curr.filter((r) => r.id !== payload.id));
      setSession((curr) => (curr ? { ...curr, qrAttendanceCount: payload.qrAttendanceCount ?? curr.qrAttendanceCount } : curr));
    });
    socket.on("session:rotated", ({ expiresAt, token: nextToken, qrAttendanceCount }) => {
      setSession((curr) => (
        curr
          ? {
              ...curr,
              expiresAt,
              token: nextToken || curr.token,
              qrAttendanceCount: qrAttendanceCount ?? 0
            }
          : curr
      ));
    });
    socket.on("session:stopped", () => { setSession(null); setAttendanceRows([]); });

    return () => socket.disconnect();
  }, [token, session?.id]);

  const startSession = async () => {
    if (!selectedCourseId) { setError("Select a course first."); return; }
    try {
      const created = await apiRequest("/session/start", {
        method: "POST", token,
        body: { courseId: selectedCourseId }
      });
      setSession({ ...created, qrAttendanceCount: created.qrAttendanceCount ?? 0 });
      setAttendanceRows([]);
      await loadAttendance(created.id);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const stopSession = async () => {
    if (!session?.id) return;
    try {
      await apiRequest(`/session/${session.id}/stop`, { method: "POST", token });
      setSession(null);
      setAttendanceRows([]);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const refreshQr = async () => {
    if (!session?.id) return;
    try {
      setRefreshingQr(true);
      const refreshed = await apiRequest(`/session/${session.id}/rotate`, { method: "POST", token });
      setSession((curr) => (curr ? { ...curr, ...refreshed, qrAttendanceCount: refreshed.qrAttendanceCount ?? 0 } : curr));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshingQr(false);
    }
  };

  const deleteAttendance = async (attendanceId) => {
    try {
      await apiRequest(`/attendance/${attendanceId}`, { method: "DELETE", token });
      setAttendanceRows((curr) => curr.filter((row) => row.id !== attendanceId));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const searchStudents = async (query) => {
    setStudentSearch(query);
    if (!session?.id) return;
    if (!query.trim()) {
      setAvailableStudents([]);
      return;
    }
    try {
      const data = await apiRequest(`/attendance/available/students?sessionId=${session.id}&searchQuery=${query}`, { token });
      setAvailableStudents(data);
    } catch (err) {
      console.error("Failed to search students:", err);
    }
  };

  const addStudentManually = async (studentId) => {
    try {
      setAddingStudent(true);
      await apiRequest("/attendance/manual", {
        method: "POST",
        token,
        body: { sessionId: session.id, studentId }
      });
      setStudentSearch("");
      setAvailableStudents([]);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingStudent(false);
    }
  };

  return (
    <LecturerShell user={user} onLogout={logout} title="Live session">
      {error && <div className="shell-banner shell-banner--error">{error}</div>}

      <div className="page-dashboard">
        {/* Toolbar */}
        <div className="dash-toolbar">
          <div className="field field--inline">
            <label className="field__label">Course</label>
            <select
              className="field__select"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              {courses.map((c) => (
                <option key={c._id} value={c._id}>{c.courseCode} — {c.courseTitle}</option>
              ))}
            </select>
          </div>
          <div className="dash-toolbar__right">
            <button
              className={`btn ${session ? "btn--danger" : "btn--primary"}`}
              onClick={session ? stopSession : startSession}
            >
              {session ? "Stop session" : "Start session"}
            </button>
          </div>
        </div>

        {/* Main grid */}
        <div className="dash-grid">
          {/* QR panel */}
          <QRPanel
            session={session}
            selectedCourse={selectedCourse}
            onRefresh={refreshQr}
            isRefreshing={refreshingQr}
          />

          {/* Attendance list */}
          <div className="pane pane--table">
            <div className="pane__head">
              <span className="pane__title">Check-ins</span>
              <span className="badge">{attendanceRows.length}</span>
            </div>
            {session?.isActive && (
              <div style={{ padding: "12px", borderBottom: "1px solid #e5e7eb", position: "relative" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#666" }}>
                  Add student without phone
                </label>
                <div style={{ display: "flex", gap: "8px", position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Search by name or matric no..."
                    value={studentSearch}
                    onChange={(e) => searchStudents(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      fontSize: "14px"
                    }}
                  />
                  {studentSearch && (
                    <button
                      onClick={() => {
                        setStudentSearch("");
                        setAvailableStudents([]);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#999",
                        fontSize: "18px",
                        padding: "0 4px"
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {availableStudents.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "white",
                      border: "1px solid #d1d5db",
                      borderTop: "none",
                      maxHeight: "200px",
                      overflowY: "auto",
                      zIndex: 10,
                      margin: "-1px 12px 0"
                    }}
                  >
                    {availableStudents.map((student) => (
                      <div
                        key={student._id}
                        style={{
                          padding: "10px 12px",
                          borderBottom: "1px solid #f3f4f6",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f9fafb";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "500", fontSize: "14px" }}>{student.name}</div>
                          <div style={{ fontSize: "12px", color: "#666" }}>{student.matricNo}</div>
                        </div>
                        <button
                          onClick={() => addStudentManually(student._id)}
                          disabled={addingStudent}
                          style={{
                            padding: "4px 8px",
                            background: "#2563eb",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          {addingStudent ? "Adding..." : "Add"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="table-wrap">
              <table className="att-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Reg no.</th>
                    <th>Time</th>
                    <th style={{ width: "50px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.student.name}</td>
                      <td className="mono">{row.student.matricNo}</td>
                      <td className="mono">{new Date(row.timestamp).toLocaleTimeString()}</td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="icon-button"
                          onClick={() => deleteAttendance(row.id)}
                          title="Remove from attendance"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#ef4444",
                            fontSize: "18px",
                            padding: "4px"
                          }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {attendanceRows.length === 0 && (
                <p className="empty-hint">No check-ins yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </LecturerShell>
  );
};
