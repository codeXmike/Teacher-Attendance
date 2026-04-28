import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client";
import { ActionModal } from "../components/ActionModal";
import { LecturerShell } from "../components/LecturerShell";
import { useAuth } from "../context/AuthContext";
import { useLecturerWorkspace } from "../hooks/useLecturerWorkspace";

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);

export const LecturerRecordsPage = () => {
  const { token, user, logout } = useAuth();
  const { courses, selectedCourseId, setSelectedCourseId, error, setError } = useLecturerWorkspace(token);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [records, setRecords] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [addingStudentId, setAddingStudentId] = useState("");
  const [busyDeleteSessionId, setBusyDeleteSessionId] = useState("");
  const [removingAttendanceId, setRemovingAttendanceId] = useState("");
  const [pendingAttendanceDelete, setPendingAttendanceDelete] = useState(null);
  const [pendingSessionDelete, setPendingSessionDelete] = useState(null);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  const loadSessions = async () => {
    try {
      const query = selectedCourseId ? `?courseId=${selectedCourseId}` : "";
      const data = await apiRequest(`/session${query}`, { token });
      setSessions(data);
      setSelectedSessionId((current) => (data.some((session) => session.id === current) ? current : data[0]?.id || ""));
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  const loadRecords = async () => {
    if (!selectedSessionId) {
      setRecords([]);
      return;
    }

    try {
      const data = await apiRequest(`/attendance/session/${selectedSessionId}`, { token });
      setRecords(data.rows);
      setSessions((current) => current.map((session) => (
        session.id === selectedSessionId
          ? {
              ...session,
              attendanceCount: data.rows.length,
              studentLimit: data.session?.studentLimit ?? session.studentLimit,
              isActive: data.session?.isActive ?? session.isActive
            }
          : session
      )));
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [selectedCourseId, token]);

  useEffect(() => {
    loadRecords();
  }, [selectedSessionId, token]);

  const deleteAttendance = async () => {
    if (!pendingAttendanceDelete) return;

    try {
      setRemovingAttendanceId(pendingAttendanceDelete.id);
      await apiRequest(`/attendance/${pendingAttendanceDelete.id}`, { method: "DELETE", token });
      setRecords((current) => current.filter((row) => row.id !== pendingAttendanceDelete.id));
      setSessions((current) => current.map((session) => (
        session.id === selectedSessionId
          ? { ...session, attendanceCount: Math.max((session.attendanceCount ?? 1) - 1, 0) }
          : session
      )));
      setPendingAttendanceDelete(null);
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setRemovingAttendanceId("");
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
      const data = await apiRequest(`/attendance/available/students?sessionId=${selectedSessionId}&searchQuery=${encodeURIComponent(query)}`, { token });
      setAvailableStudents(data);
    } catch (nextError) {
      console.error("Failed to search students:", nextError);
    }
  };

  const addStudentManually = async (studentId) => {
    try {
      setAddingStudentId(studentId);
      await apiRequest("/attendance/manual", {
        method: "POST",
        token,
        body: { sessionId: selectedSessionId, studentId }
      });
      setStudentSearch("");
      setAvailableStudents([]);
      await loadRecords();
      await loadSessions();
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setAddingStudentId("");
    }
  };

  const deleteSession = async () => {
    if (!pendingSessionDelete) return;

    try {
      setBusyDeleteSessionId(pendingSessionDelete.id);
      await apiRequest(`/session/${pendingSessionDelete.id}`, { method: "DELETE", token });
      const nextSessions = sessions.filter((session) => session.id !== pendingSessionDelete.id);
      setSessions(nextSessions);
      setSelectedSessionId((current) => (current === pendingSessionDelete.id ? nextSessions[0]?.id || "" : current));
      if (selectedSessionId === pendingSessionDelete.id) {
        setRecords([]);
        setStudentSearch("");
        setAvailableStudents([]);
      }
      setPendingSessionDelete(null);
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusyDeleteSessionId("");
    }
  };

  return (
    <LecturerShell user={user} onLogout={logout} title="Records">
      {error ? <div className="shell-banner shell-banner--error">{error}</div> : null}

      <div className="page-records">
        <div className="records-bar">
          <div className="field field--inline">
            <label className="field__label">Filter by course</label>
            <select
              className="field__select"
              value={selectedCourseId}
              onChange={(event) => setSelectedCourseId(event.target.value)}
            >
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.courseCode} - {course.courseTitle}
                </option>
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
              {sessions.length === 0 ? <p className="empty-hint">No sessions found.</p> : null}

              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`session-row session-row--with-action ${selectedSessionId === session.id ? "session-row--active" : ""}`}
                >
                  <button
                    className="session-row__main"
                    type="button"
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <span className="session-row__code">{session.course?.courseCode || "-"}</span>
                    <span className="session-row__date">{new Date(session.createdAt).toLocaleString()}</span>
                    <span className="session-row__count">
                      {session.attendanceCount} / {session.studentLimit} students
                    </span>
                  </button>

                  <button
                    className="session-row__trash"
                    type="button"
                    title="Delete session"
                    disabled={busyDeleteSessionId === session.id}
                    onClick={() => setPendingSessionDelete(session)}
                  >
                    <TrashIcon />
                  </button>
                </div>
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
              <span className="badge">
                {records.length}
                {selectedSession?.studentLimit ? ` / ${selectedSession.studentLimit}` : ""}
              </span>
            </div>

            {selectedSessionId && !selectedSession?.isActive ? (
              <div style={{ padding: "12px", borderBottom: "1px solid #e5e7eb", position: "relative" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#666" }}>
                  Add student to this session
                </label>
                <div style={{ display: "flex", gap: "8px", position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Search by name or matric no..."
                    value={studentSearch}
                    onChange={(event) => searchStudents(event.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      fontSize: "14px"
                    }}
                  />
                  {studentSearch ? (
                    <button
                      type="button"
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
                      x
                    </button>
                  ) : null}
                </div>

                {availableStudents.length > 0 ? (
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
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "500", fontSize: "14px" }}>{student.name}</div>
                          <div style={{ fontSize: "12px", color: "#666" }}>{student.matricNo}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addStudentManually(student._id)}
                          disabled={!!addingStudentId}
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
                          {addingStudentId === student._id ? "Adding..." : "Add"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {selectedSessionId && selectedSession?.isActive ? (
              <p className="empty-hint" style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>
                End the session before adding students manually.
              </p>
            ) : null}

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
                          type="button"
                          onClick={() => setPendingAttendanceDelete(row)}
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
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {records.length === 0 ? (
                <p className="empty-hint">
                  {selectedSessionId ? "No records for this session." : "Select a session to view records."}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <ActionModal
        open={!!pendingAttendanceDelete}
        title="Remove student"
        message="Remove this student from the attendance record for this session?"
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={deleteAttendance}
        onCancel={() => setPendingAttendanceDelete(null)}
        busy={removingAttendanceId === pendingAttendanceDelete?.id}
      />

      <ActionModal
        open={!!pendingSessionDelete}
        title="Delete session"
        message="Delete this session and all attendance under it? This cannot be undone."
        confirmLabel="Delete session"
        confirmVariant="danger"
        onConfirm={deleteSession}
        onCancel={() => setPendingSessionDelete(null)}
        busy={busyDeleteSessionId === pendingSessionDelete?.id}
      />
    </LecturerShell>
  );
};
