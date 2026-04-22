import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

const SCAN_CONFIG = {
  fps: 10,
  qrbox: { width: 300, height: 300 },
  aspectRatio: 1,
  videoConstraints: {
    facingMode: { ideal: "environment" }
  },
  showTorchButtonIfSupported: false,
  showZoomSliderIfSupported: false
};

const parseSessionTokenFromQr = (decodedText) => {
  try {
    const payload = JSON.parse(decodedText);
    if (payload?.type !== "attendance-session-token") {
      return null;
    }

    const sessionToken = typeof payload.token === "string" ? payload.token.trim() : "";
    return sessionToken || null;
  } catch {
    return null;
  }
};

export const StudentScanPage = () => {
  const { token, user } = useAuth();
  const [state, setState] = useState({ loading: false, error: "", result: null });
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  const clearScanner = async () => {
    if (!scannerInstanceRef.current) {
      return;
    }

    try {
      await scannerInstanceRef.current.clear();
    } catch {
      // Ignore scanner clear errors during restart/teardown.
    } finally {
      scannerInstanceRef.current = null;
    }
  };

  const onScanError = () => {
    // Keep scanning and ignore frame-level decode errors.
  };

  const renderScanner = () => {
    if (scannerInstanceRef.current) {
      return;
    }

    scannerInstanceRef.current = new Html5QrcodeScanner("qr-reader", SCAN_CONFIG, false);
    scannerInstanceRef.current.render(onScanSuccess, onScanError);
  };

  const onScanSuccess = async (decodedText) => {
    await clearScanner();

    const scannedSessionToken = parseSessionTokenFromQr(decodedText);
    if (!scannedSessionToken) {
      setState((current) => ({
        ...current,
        loading: false,
        error: "Invalid QR code. Please scan the live attendance QR from your lecturer."
      }));
      renderScanner();
      return;
    }

    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const result = await apiRequest("/attendance/scan", {
        method: "POST",
        token,
        body: {
          token: scannedSessionToken
        }
      });
      setState((current) => ({ ...current, loading: false, result }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message }));
      renderScanner();
    }
  };

  useEffect(() => {
    renderScanner();

    return () => {
      clearScanner();
    };
  }, []);

  return (
    <div className="student-scan">
      <div className="student-scan__header">
        <div>
          <strong>{user.name}</strong>
          <span>{user.matricNo}</span>
        </div>
      </div>
      <div className="student-scan__body">
        <div className="section-head">
          <span>Scan QR Code</span>
        </div>
        <p className="muted">Use your back camera to scan the live QR code displayed by your lecturer.</p>

        {!state.result ? (
          <div className="scan-container">
            <div id="qr-reader" ref={scannerRef} className="qr-scanner"></div>
            {state.loading && (
              <div className="scan-overlay">
                <div className="scan-loading">Processing...</div>
              </div>
            )}
          </div>
        ) : null}

        {state.error ? <p className="error-text">{state.error}</p> : null}

        {state.result ? (
          <div className="success-block">
            <h1>Attendance Recorded</h1>
            <p>
              {state.result.course.courseCode} - {state.result.course.courseTitle}
            </p>
            <p>{new Date(state.result.timestamp).toLocaleString()}</p>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setState({ loading: false, error: "", result: null });
                renderScanner();
              }}
            >
              Scan Another Code
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
