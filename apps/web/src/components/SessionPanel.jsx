import { QRCodeSVG } from "qrcode.react";

export const SessionPanel = ({
  selectedCourse,
  session,
  attendanceRows,
  lecturerLocation,
  sessionUrl,
  sessionStatus,
  onLocationChange,
  onStartSession,
  onStopSession
}) => (
  <main className="panel">
    <div className="page-hero card">
      <div>
        <p className="eyebrow">Session Control</p>
        <h1>{selectedCourse ? `${selectedCourse.courseCode} - ${selectedCourse.courseTitle}` : "Select a course"}</h1>
        <p className="muted">
          Lecturer sessions are isolated by workspace and QR tokens rotate automatically.
        </p>
      </div>
      {selectedCourse ? (
        <div className="inline-actions inline-actions--row">
          {!session?.isActive ? (
            <button onClick={onStartSession}>Start Session</button>
          ) : (
            <button className="danger-button" onClick={onStopSession}>
              Stop Session
            </button>
          )}
        </div>
      ) : null}
    </div>

    {selectedCourse ? (
      <div className="stats-grid">
        <div className="card stat-card">
          <span className="stat-label">Status</span>
          <strong>{sessionStatus}</strong>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Attendance</span>
          <strong>{attendanceRows.length}</strong>
        </div>
      </div>
    ) : null}

    {selectedCourse ? (
      <div className="content-grid">
        <section className="card content-card">
          <div className="section-head">
            <span>Lecturer Location</span>
          </div>
          <div className="inline-form inline-form--double">
            <label>
              <span>Latitude</span>
              <input
                value={lecturerLocation.lat}
                onChange={(event) => onLocationChange("lat", event.target.value)}
                placeholder="6.5244"
              />
            </label>
            <label>
              <span>Longitude</span>
              <input
                value={lecturerLocation.lng}
                onChange={(event) => onLocationChange("lng", event.target.value)}
                placeholder="3.3792"
              />
            </label>
          </div>
          <p className="muted">Students must be within the configured attendance radius when submitting.</p>
        </section>

        <section className="card content-card qr-column">
          <div className="section-head">
            <span>Current QR</span>
          </div>
          {session && session.isActive && session.token ? (
            <>
              <div className="qr-wrap">
                <QRCodeSVG value={sessionUrl} size={260} bgColor="#111827" fgColor="#F9FAFB" />
              </div>
              <div className="qr-meta qr-meta--inline">
                <span>{selectedCourse.courseCode}</span>
                <span>{attendanceRows.length} checked in</span>
              </div>
              <code className="qr-url">{sessionUrl}</code>
            </>
          ) : (
            <p className="muted">Start a session to generate a rotating QR link.</p>
          )}
        </section>

        <section className="card content-card">
          <div className="section-head">
            <span>Live Attendance</span>
            <span className="pill">{attendanceRows.length}</span>
          </div>
          <div className="attendance-list">
            {attendanceRows.map((row) => (
              <div key={row.id} className="attendance-row card card--subtle">
                <div>
                  <strong>{row.student.name}</strong>
                  <small>{row.student.matricNo}</small>
                </div>
                <div className="attendance-row__meta">
                  <span>{new Date(row.timestamp).toLocaleTimeString()}</span>
                  <span>{Math.round(row.distanceMeters || 0)}m</span>
                </div>
              </div>
            ))}
            {attendanceRows.length === 0 ? <p className="muted">No attendance recorded yet.</p> : null}
          </div>
        </section>
      </div>
    ) : (
      <div className="empty-state card">
        <p>Create a course in the sidebar and select it to begin.</p>
      </div>
    )}
  </main>
);
