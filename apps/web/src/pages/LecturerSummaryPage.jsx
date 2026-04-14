import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client";
import { LecturerShell } from "../components/LecturerShell";
import { useAuth } from "../context/AuthContext";
import { useLecturerWorkspace } from "../hooks/useLecturerWorkspace";

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const LecturerSummaryPage = () => {
  const { token, user, logout } = useAuth();
  const { courses, selectedCourseId, setSelectedCourseId, error, setError } = useLecturerWorkspace(token);
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [averageAttendance, setAverageAttendance] = useState(0);

  const selectedCourse = useMemo(
    () => courses.find((c) => c._id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  // Fetch attendance summary when course changes
  useEffect(() => {
    if (!selectedCourseId) {
      setSummaryData([]);
      setTotalStudents(0);
      setAverageAttendance(0);
      return;
    }

    const fetchSummary = async () => {
      setLoading(true);
      try {
        const data = await apiRequest(`/attendance/summary/${selectedCourseId}`, { token });
        setSummaryData(data.students || []);
        setTotalStudents(data.totalStudents || 0);
        setAverageAttendance(data.averageAttendance || 0);
        setError("");
      } catch (err) {
        setError(err.message);
        setSummaryData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [selectedCourseId, token, setError]);

  // Calculate attendance percentage and fraction of 5
  const calculateAttendance = (presentCount, totalSessions) => {
    if (!totalSessions || totalSessions === 0) {
      return { 
        percentage: 0, 
        fraction: 0, 
        fractionDisplay: "0/5",
        presentCount: presentCount || 0,
        totalSessions: totalSessions || 0
      };
    }
    
    const present = Number(presentCount) || 0;
    const total = Number(totalSessions) || 0;
    
    const percentage = (present / total) * 100;
    const fraction = (present / total) * 5;
    
    return {
      percentage: Math.round(percentage),
      fraction: Number(fraction.toFixed(1)),
      fractionDisplay: `${fraction.toFixed(1)}/5`,
      presentCount: present,
      totalSessions: total
    };
  };

  // Get color class based on percentage
  const getPercentClass = (percentage) => {
    if (percentage >= 75) return "high";
    if (percentage >= 50) return "medium";
    return "low";
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!summaryData.length) return;
    
    const headers = ["Student Name", "Matric Number", "Attendance Percentage", "Attendance (out of 5)", "Present Count", "Total Sessions"];
    const rows = summaryData.map(student => {
      const { percentage, fractionDisplay, presentCount, totalSessions } = calculateAttendance(
        student.presentCount, 
        student.totalSessions
      );
      return [
        `"${student.name}"`,
        `"${student.matricNo}"`,
        `${percentage}%`,
        fractionDisplay,
        presentCount,
        totalSessions
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedCourse?.courseCode || "course"}_attendance_summary.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalSessionsCount = summaryData[0]?.totalSessions || 0;

  return (
    <LecturerShell 
      user={user} 
      onLogout={logout} 
      title="Attendance Summary"
      subtitle="Track student attendance performance"
    >
      {error && <div className="shell-banner shell-banner--error">{error}</div>}

      <div className="page-summary">
        {/* Header with course selector and stats */}
        <div className="summary-header">
          <div className="field field--inline" style={{ flex: 1 }}>
            <label className="field__label">Select Course</label>
            <select
              className="field__select"
              value={selectedCourseId || ""}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              style={{ minWidth: "200px" }}
            >
              <option value="">Choose a course...</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.courseCode} — {c.courseTitle}
                </option>
              ))}
            </select>
          </div>
          
          {selectedCourse && summaryData.length > 0 && (
            <div className="summary-stats">
              <div className="summary-stat">
                <span className="summary-stat__label">Total Students</span>
                <span className="summary-stat__value">{totalStudents}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-stat__label">Total Sessions</span>
                <span className="summary-stat__value">{totalSessionsCount}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-stat__label">Average Attendance</span>
                <span className="summary-stat__value">
                  {Math.round(averageAttendance)}<span className="summary-stat__unit">%</span>
                </span>
              </div>
              <button className="summary-export-btn" onClick={exportToCSV}>
                <DownloadIcon />
                Export CSV
              </button>
            </div>
          )}
        </div>

        {/* Main content - Just the table */}
        {!selectedCourse ? (
          <div className="empty-summary card">
            <div className="empty-summary__icon">📊</div>
            <p>Select a course to view attendance summary</p>
          </div>
        ) : loading ? (
          <div className="empty-summary card">
            <div className="empty-summary__icon">⏳</div>
            <p>Loading attendance data...</p>
          </div>
        ) : summaryData.length === 0 ? (
          <div className="empty-summary card">
            <div className="empty-summary__icon">📭</div>
            <p>No students found for this course</p>
            <p className="muted">Students need to register for this course to see attendance data</p>
          </div>
        ) : (
          <div className="summary-table-container">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Attendance</th>
                  <th>Score (out of 5)</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.map((student) => {
                  const { percentage, fractionDisplay, presentCount, totalSessions } = 
                    calculateAttendance(student.presentCount, student.totalSessions);
                  const percentClass = getPercentClass(percentage);
                  
                  return (
                    <tr key={student.id || student._id}>
                      <td>
                        <div className="student-name">{student.name}</div>
                        <div className="student-matric">{student.matricNo}</div>
                      </td>
                      <td>
                        <span className={`attendance-percent ${percentClass}`}>
                          {percentage}%
                        </span>
                        <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: "0.25rem" }}>
                          {presentCount} / {totalSessions} sessions
                        </div>
                       </td>
                      <td>
                        <div className="attendance-fraction">{fractionDisplay}</div>
                       </td>
                      <td style={{ minWidth: "150px" }}>
                        <div className="progress-bar-container">
                          <div 
                            className={`progress-bar ${percentClass}`} 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: "0.25rem", textAlign: "right" }}>
                          {percentage}% complete
                        </div>
                       </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </LecturerShell>
  );
};