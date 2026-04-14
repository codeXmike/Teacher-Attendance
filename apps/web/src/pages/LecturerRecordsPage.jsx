import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client";
import { LecturerShell } from "../components/LecturerShell";
import { useAuth } from "../context/AuthContext";
import { useLecturerWorkspace } from "../hooks/useLecturerWorkspace";

export const LecturerRecordsPage = () => {
  const { token, user, logout } = useAuth();
  const { courses, selectedCourseId, setSelectedCourseId, error, setError } = useLecturerWorkspace(token);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [records, setRecords] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const query = selectedCourseId ? `?courseId=${selectedCourseId}` : "";
        const data = await apiRequest(`/session${query}`, { token });
        setSessions(data);
        setSelectedSessionId((curr) =>
          data.some((s) => s.id === curr) ? curr : data[0]?.id || ""
        );
        setError("");
      } catch (err) {
        setError(err.message);
      }
    };
    load();
  }, [selectedCourseId, token]);

  useEffect(() => {
    if (!selectedSessionId) { setRecords([]); return; }
    const load = async () => {
      try {
        const data = await apiRequest(`/attendance/session/${selectedSessionId}`, { token });
        setRecords(data.rows);
        setError("");
      } catch (err) {
        setError(err.message);
      }
    };
    load();
  }, [selectedSessionId, token]);

  const deleteAttendance = async (attendanceId) => {
    try {
      await apiRequest(`/attendance/${attendanceId}`, { method: "DELETE", token });
      setRecords((curr) => curr.filter((row) => row.id !== attendanceId));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const searchStudents = async (query) => {
    setStudentSearch(query);
    if (!selectedSessionId) return;
    if (!query.trim()) {
      setAvailableStudents([]);
      return;
    }
    try {
      const data = await apiRequest(`/attendance/available/students?sessionId=${selectedSessionId}&searchQuery=${query}`, { token });
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
        body: { sessionId: selectedSessionId, studentId }
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
    <LecturerShell user={user} onLogout={logout} title="Records">
      {error && <div className="shell-banner shell-banner--error">{error}</div>}

      <div className="page-records">
        <div className="records-bar">
          <div className="field field--inline">
            <label className="field__label">Filter by course</label>
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
        </div>

        <div className="records-grid">
          <div className="pane pane--list">
            <div className="pane__head">
              <span className="pane__title">Sessions</span>
              <span className="badge">{sessions.length}</span>
            </div>
            <div className="session-list">
              {sessions.length === 0 && <p className="empty-hint">No sessions found.</p>}
              {sessions.map((s) => (
                <button
                  key={s.id}
                  className={`session-row ${selectedSessionId === s.id ? "session-row--active" : ""}`}
                  onClick={() => setSelectedSessionId(s.id)}
                >
                  <span className="session-row__code">{s.course?.courseCode || "—"}</span>
                  <span className="session-row__date">{new Date(s.createdAt).toLocaleString()}</span>
                  <span className="session-row__count">{s.attendanceCount} students</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pane pane--table">
            <div className="pane__head">
              <span className="pane__title">
                {selectedSession
                  ? `${selectedSession.course?.courseCode} · ${new Date(selectedSession.createdAt).toLocaleDateString()}`
                  : "Students"}
              </span>
              <span className="badge">{records.length}</span>
            </div>
            {selectedSessionId && (
              <div style={{ padding: "12px", borderBottom: "1px solid #e5e7eb", position: "relative" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#666" }}>
                  Add student to this session
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
                  {records.map((row) => (
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
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {records.length === 0 && (
                <p className="empty-hint">
                  {selectedSessionId ? "No records for this session." : "Select a session to view records."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </LecturerShell>
  );
};