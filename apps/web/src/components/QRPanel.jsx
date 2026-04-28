import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const MaximizeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

const MinimizeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
  </svg>
);

export const QRPanel = ({ session, selectedCourse }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const qrPayload = session?.token
    ? JSON.stringify({ type: "attendance-session-token", token: session.token })
    : "";
  const attendanceCount = session?.attendanceCount ?? 0;
  const studentLimit = session?.studentLimit ?? 0;

  return (
    <>
      <div className="pane pane--qr">
        <div className="qr-header">
          <div className="qr-header-left">
            <span className="pane__title">QR code</span>
            {session && <span className="badge badge--live">LIVE</span>}
          </div>
          {session?.token && (
            <div className="qr-header-actions">
              <button className="qr-action-btn" onClick={() => setIsMaximized(true)} title="Maximize">
                <MaximizeIcon />
              </button>
            </div>
          )}
        </div>
        <div className="qr-body">
          {session?.token ? (
            <>
              <div className="qr-frame">
                <QRCodeSVG
                  value={qrPayload}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                  includeMargin
                />
              </div>
              <div className="qr-meta">
                <span className="qr-meta__code">{selectedCourse?.courseCode}</span>
                <span className="qr-meta__title">{selectedCourse?.courseTitle}</span>
                <span className="qr-meta__limit">{attendanceCount}/{studentLimit} students recorded</span>
              </div>
            </>
          ) : (
            <div className="qr-empty">
              <div className="qr-empty__icon">QR</div>
              <p>Start a session to generate a QR code.</p>
            </div>
          )}
        </div>
      </div>

      {isMaximized && session?.token && (
        <div className="qr-modal-overlay" onClick={() => setIsMaximized(false)}>
          <div className="qr-modal" onClick={(event) => event.stopPropagation()}>
            <div className="qr-modal__header">
              <h3>QR Code - {selectedCourse?.courseCode}</h3>
              <button className="qr-modal__close" onClick={() => setIsMaximized(false)}>
                <MinimizeIcon />
              </button>
            </div>
            <div className="qr-modal__body">
              <div className="qr-modal__frame">
                <QRCodeSVG
                  value={qrPayload}
                  size={300}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                  includeMargin
                />
              </div>
              <div className="qr-modal__info">
                <div className="qr-modal__code">{selectedCourse?.courseCode}</div>
                <div className="qr-modal__title">{selectedCourse?.courseTitle}</div>
                <div className="qr-modal__title">{attendanceCount}/{studentLimit} students recorded</div>
                <div className="qr-modal__badge">
                  <span>Live</span> Session Active
                </div>
              </div>
            </div>
            <div className="qr-modal__footer">
              <button className="btn btn-secondary" onClick={() => setIsMaximized(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
