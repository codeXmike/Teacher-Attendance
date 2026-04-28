import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { apiRequest, getApiUrl } from "../api/client";
import { ActionModal } from "../components/ActionModal";
import { LecturerShell } from "../components/LecturerShell";
import { QRPanel } from "../components/QRPanel";
import { useAuth } from "../context/AuthContext";
import { useLecturerWorkspace } from "../hooks/useLecturerWorkspace";

export const LecturerDashboardPage = () => {
  const { token, user, logout } = useAuth();
  const { courses, selectedCourseId, setSelectedCourseId, error, setError } = useLecturerWorkspace(token);
  const [session, setSession] = useState(null);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [stoppingSession, setStoppingSession] = useState(false);
  const [studentLimitInput, setStudentLimitInput] = useState("1");

  const selectedCourse = useMemo(
    () => courses.find((course) => course._id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const loadAttendance = async (sessionId) => {
    const data = await apiRequest(`/attendance/session/${sessionId}`, { token });
    setAttendanceRows(data.rows);
    setSession((current) => (
      current && current.id === sessionId
        ? {
            ...current,
            studentLimit: data.session?.studentLimit ?? current.studentLimit,
            attendanceCount: data.rows.length,
            qrAttendanceCount: data.rows.length
          }
        : current
    ));
  };

  const loadSessions = async () => {
    if (!selectedCourseId) {
      setSession(null);
      setAttendanceRows([]);
      return;
    }

    try {
      const data = await apiRequest(`/session?courseId=${selectedCourseId}`, { token });
      const active = data.find((entry) => entry.isActive) || null;

      if (active) {
        setSession({
          ...active,
          attendanceCount: active.attendanceCount ?? 0,
          qrAttendanceCount: active.attendanceCount ?? 0
        });
        await loadAttendance(active.id);
      } else {
        setSession(null);
        setAttendanceRows([]);
      }

      setError("");
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [selectedCourseId, token]);

  useEffect(() => {
    if (!token || !session?.id) return undefined;

    const socket = io(getApiUrl(), { auth: { token }, query: { sessionId: session.id } });

    socket.on("attendance:created", (payload) => {
      setAttendanceRows((current) => {
        if (current.some((row) => row.id === payload.id)) return current;
        return [{ id: payload.id, student: payload.student, timestamp: payload.timestamp }, ...current];
      });
      setSession((current) => (
        current
          ? {
              ...current,
              attendanceCount: payload.attendanceCount ?? current.attendanceCount,
              qrAttendanceCount: payload.qrAttendanceCount ?? payload.attendanceCount ?? current.qrAttendanceCount
            }
          : current
      ));
    });

    socket.on("attendance:deleted", (payload) => {
      setAttendanceRows((current) => current.filter((row) => row.id !== payload.id));
      setSession((current) => (
        current
          ? {
              ...current,
              attendanceCount: payload.attendanceCount ?? current.attendanceCount,
              qrAttendanceCount: payload.qrAttendanceCount ?? payload.attendanceCount ?? current.qrAttendanceCount
            }
          : current
      ));
    });

    socket.on("session:stopped", () => {
      setSession(null);
      setAttendanceRows([]);
    });

    socket.on("session:deleted", () => {
      setSession(null);
      setAttendanceRows([]);
    });

    return () => socket.disconnect();
  }, [token, session?.id]);

  const startSession = async () => {
    if (!selectedCourseId) {
      setError("Select a course first.");
      return;
    }

    try {
      setStartingSession(true);
      const created = await apiRequest("/session/start", {
        method: "POST",
        token,
        body: {
          courseId: selectedCourseId,
          studentLimit: Number(studentLimitInput)
        }
      });

      setSession({
        ...created,
        attendanceCount: created.attendanceCount ?? 0,
        qrAttendanceCount: created.qrAttendanceCount ?? created.attendanceCount ?? 0
      });
      setAttendanceRows([]);
      setShowStartModal(false);
      await loadAttendance(created.id);
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setStartingSession(false);
    }
  };

  const stopSession = async () => {
    if (!session?.id) return;

    try {
      setStoppingSession(true);
      await apiRequest(`/session/${session.id}/stop`, { method: "POST", token });
      setSession(null);
      setAttendanceRows([]);
      setShowStopModal(false);
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setStoppingSession(false);
    }
  };

  const deleteAttendance = async (attendanceId) => {
    try {
      await apiRequest(`/attendance/${attendanceId}`, { method: "DELETE", token });
      setAttendanceRows((current) => current.filter((row) => row.id !== attendanceId));
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  return (
    <LecturerShell user={user} onLogout={logout} title="Live session">
      {error ? <div className="shell-banner shell-banner--error">{error}</div> : null}

      <div className="page-dashboard">
        <div className="dash-toolbar">
          <div className="field field--inline">
            <label className="field__label">Course</label>
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

          <div className="dash-toolbar__right">
            <button
              className={`btn ${session ? "btn-danger" : "btn-primary"}`}
              type="button"
              onClick={() => {
                if (session) {
                  setShowStopModal(true);
                  return;
                }

                setStudentLimitInput(String(selectedCourse?.studentCount || 1));
                setShowStartModal(true);
              }}
            >
              {session ? "Stop session" : "Start session"}
            </button>
          </div>
        </div>

        <div className="dash-grid">
          <QRPanel session={session} selectedCourse={selectedCourse} />

          <div className="pane pane--table">
            <div className="pane__head">
              <span className="pane__title">Check-ins</span>
              <span className="badge">
                {session?.attendanceCount ?? attendanceRows.length}
                {session?.studentLimit ? ` / ${session.studentLimit}` : ""}
              </span>
            </div>

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
                          type="button"
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
                          x
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {attendanceRows.length === 0 ? <p className="empty-hint">No check-ins yet.</p> : null}
            </div>
          </div>
        </div>
      </div>

      <ActionModal
        open={showStartModal}
        title="Start session"
        message="Enter how many students should be allowed to take attendance before this session closes to new scans."
        confirmLabel="Start session"
        onConfirm={startSession}
        onCancel={() => setShowStartModal(false)}
        confirmDisabled={!Number.isInteger(Number(studentLimitInput)) || Number(studentLimitInput) < 1}
        busy={startingSession}
      >
        <label htmlFor="student-limit-input">Number of students</label>
        <input
          id="student-limit-input"
          type="number"
          min="1"
          value={studentLimitInput}
          onChange={(event) => setStudentLimitInput(event.target.value)}
        />
      </ActionModal>

      <ActionModal
        open={showStopModal}
        title="End session"
        message="End this session now? Students will no longer be able to scan this QR code."
        confirmLabel="End session"
        confirmVariant="danger"
        onConfirm={stopSession}
        onCancel={() => setShowStopModal(false)}
        busy={stoppingSession}
      />
    </LecturerShell>
  );
};
