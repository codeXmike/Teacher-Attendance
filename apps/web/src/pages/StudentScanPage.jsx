import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

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

const SCAN_REGION_RATIO = 0.82;

export const StudentScanPage = () => {
  const { token, user } = useAuth();
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const mountedRef = useRef(false);
  const scanLockRef = useRef(false);
  const [state, setState] = useState({
    loading: false,
    error: "",
    result: null,
    status: "Starting camera...",
    cameraReady: false
  });

  const stopScanner = ({ resetLock = true } = {}) => {
    if (resetLock) {
      scanLockRef.current = false;
    }

    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (scanner) {
      try {
        scanner.stop();
      } catch {
        // Ignore stop errors if the scanner is already idle or still starting.
      }

      try {
        scanner.destroy();
      } catch {
        // Ignore cleanup errors from partially initialized scanner instances.
      }
    }

    const video = videoRef.current;
    if (video?.srcObject) {
      const tracks = video.srcObject.getTracks?.() || [];
      tracks.forEach((track) => track.stop());
      video.srcObject = null;
    }
  };

  const recordAttendance = async (decodedText) => {
    scanLockRef.current = true;
    stopScanner({ resetLock: false });

    const scannedSessionToken = parseSessionTokenFromQr(decodedText);
    if (!scannedSessionToken) {
      setState((current) => ({
        ...current,
        loading: false,
        cameraReady: false,
        status: "Only the live attendance QR works here.",
        error: "Invalid QR code. Please scan the lecturer's live QR."
      }));
      scanLockRef.current = false;
      return;
    }

    setState((current) => ({
      ...current,
      loading: true,
      cameraReady: false,
      status: "QR detected. Recording attendance...",
      error: ""
    }));

    try {
      const result = await apiRequest("/attendance/scan", {
        method: "POST",
        token,
        body: {
          token: scannedSessionToken
        }
      });

      if (!mountedRef.current) {
        return;
      }

      setState({
        loading: false,
        error: "",
        result,
        status: "Attendance recorded.",
        cameraReady: false
      });
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      setState((current) => ({
        ...current,
        loading: false,
        result: null,
        cameraReady: false,
        status: "Scan failed. Restarting camera...",
        error: error.message
      }));
      scanLockRef.current = false;
      void startScanner();
    }
  };

  const startScanner = async () => {
    if (!mountedRef.current || !videoRef.current) {
      return;
    }

    stopScanner();

    setState((current) => ({
      ...current,
      loading: false,
      cameraReady: false,
      status: "Opening the back camera...",
      error: ""
    }));

    try {
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          if (!mountedRef.current || scanLockRef.current) {
            return;
          }

          void recordAttendance(result.data);
        },
        {
          returnDetailedScanResult: true,
          preferredCamera: "environment",
          maxScansPerSecond: 18,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          calculateScanRegion: (video) => {
            const size = Math.round(Math.min(video.videoWidth, video.videoHeight) * SCAN_REGION_RATIO);
            return {
              x: Math.round((video.videoWidth - size) / 2),
              y: Math.round((video.videoHeight - size) / 2),
              width: size,
              height: size,
              downScaledWidth: 960,
              downScaledHeight: 960
            };
          },
          onDecodeError: () => {}
        }
      );

      scannerRef.current = scanner;

      await scanner.start();

      if (!mountedRef.current) {
        stopScanner({ resetLock: false });
        return;
      }

      setState((current) => ({
        ...current,
        cameraReady: true,
        status: "Camera live. Hold the QR inside the box."
      }));
    } catch (error) {
      stopScanner({ resetLock: false });

      const message =
        error?.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access and try again."
          : error?.name === "NotFoundError"
            ? "No camera was found on this device."
            : error?.message || String(error) || "Unable to start the camera. Try again.";

      setState((current) => ({
        ...current,
        loading: false,
        cameraReady: false,
        status: "Camera could not be started.",
        error: message
      }));
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    void startScanner();

    return () => {
      mountedRef.current = false;
      stopScanner();
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
        <p className="muted">Use your back camera and keep the QR fully inside the box.</p>

        {!state.result ? (
          <>
            <div className="scan-container">
              <div className="scan-frame">
                <video ref={videoRef} className="scan-video" autoPlay muted playsInline />
                <div className="scan-frame__guide" />
              </div>
              {state.loading ? (
                <div className="scan-overlay">
                  <div className="scan-loading">Processing...</div>
                </div>
              ) : null}
            </div>
            <p className="scan-status">{state.status}</p>
            <div className="scan-actions">
              <button className="btn btn-secondary" onClick={() => void startScanner()}>
                Restart Camera
              </button>
            </div>
          </>
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
                setState({
                  loading: false,
                  error: "",
                  result: null,
                  status: "Starting camera...",
                  cameraReady: false
                });
                void startScanner();
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
