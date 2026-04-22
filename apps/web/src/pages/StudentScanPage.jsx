import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/library";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

const CAMERA_CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
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
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const streamRef = useRef(null);
  const mountedRef = useRef(false);
  const scanLockRef = useRef(false);
  const [state, setState] = useState({
    loading: false,
    error: "",
    result: null,
    status: "Opening back camera...",
    cameraReady: false
  });

  const stopScanner = () => {
    scanLockRef.current = false;

    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  };

  const startScanner = async ({ preserveError = false } = {}) => {
    if (!videoRef.current) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setState((current) => ({
        ...current,
        cameraReady: false,
        loading: false,
        status: "This browser cannot open the camera.",
        error: "Camera access is not supported on this device."
      }));
      return;
    }

    stopScanner();

    setState((current) => ({
      ...current,
      loading: false,
      cameraReady: false,
      status: "Opening back camera...",
      error: preserveError ? current.error : ""
    }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      if (!mountedRef.current || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.setAttribute("playsinline", "true");
      await videoRef.current.play();

      const reader = new BrowserQRCodeReader(200);
      readerRef.current = reader;

      setState((current) => ({
        ...current,
        cameraReady: true,
        status: "Back camera is live. Point it at the lecturer's QR."
      }));

      void reader
        .decodeFromVideoElementContinuously(videoRef.current, (result, error) => {
          if (!mountedRef.current || scanLockRef.current) {
            return;
          }

          if (result) {
            scanLockRef.current = true;
            void handleDecodedText(result.getText());
            return;
          }

          const transientErrors = new Set([
            "NotFoundException",
            "ChecksumException",
            "FormatException"
          ]);

          if (error && !transientErrors.has(error.name)) {
            setState((current) => ({
              ...current,
              cameraReady: true,
              status: "Camera is live. Hold the QR steady inside the frame."
            }));
          }
        })
        .catch((error) => {
          if (!mountedRef.current) {
            return;
          }

          setState((current) => ({
            ...current,
            cameraReady: false,
            status: "Camera stopped.",
            error: current.error || error.message || "Scanner stopped unexpectedly."
          }));
        });
    } catch (error) {
      const message =
        error?.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access and try again."
          : error?.name === "NotFoundError"
            ? "No camera was found on this device."
            : "Unable to start the camera. Try again.";

      setState((current) => ({
        ...current,
        loading: false,
        cameraReady: false,
        status: "Camera could not be started.",
        error: message
      }));
    }
  };

  const handleDecodedText = async (decodedText) => {
    stopScanner();

    const scannedSessionToken = parseSessionTokenFromQr(decodedText);
    if (!scannedSessionToken) {
      setState((current) => ({
        ...current,
        loading: false,
        cameraReady: false,
        status: "That code is not a valid attendance QR.",
        error: "Invalid QR code. Please scan the live attendance QR from your lecturer."
      }));
      await startScanner({ preserveError: true });
      return;
    }

    setState((current) => ({
      ...current,
      loading: true,
      cameraReady: false,
      status: "Processing QR...",
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

      setState({
        loading: false,
        error: "",
        result,
        status: "Attendance recorded.",
        cameraReady: false
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        result: null,
        cameraReady: false,
        status: "Scan failed. Camera will restart.",
        error: error.message
      }));
      await startScanner({ preserveError: true });
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
        <p className="muted">Use your back camera to scan the live QR code displayed by your lecturer.</p>

        {!state.result ? (
          <>
            <div className="scan-container">
              <div className="qr-scanner">
                <video ref={videoRef} className="scan-video" autoPlay muted playsInline />
              </div>
              {state.loading ? (
                <div className="scan-overlay">
                  <div className="scan-loading">Processing...</div>
                </div>
              ) : null}
            </div>
            <p className="scan-status">{state.status}</p>
            <div className="scan-actions">
              <button className="btn btn-secondary" onClick={() => void startScanner({ preserveError: true })}>
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
                  status: "Opening back camera...",
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
