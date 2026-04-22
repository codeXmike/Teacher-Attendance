import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
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

const chooseBackCamera = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter((device) => device.kind === "videoinput");

  if (videoDevices.length === 0) {
    return null;
  }

  const preferred = videoDevices.find((device) =>
    /back|rear|environment|main/i.test(`${device.label} ${device.deviceId}`)
  );

  return preferred?.deviceId || videoDevices[0].deviceId;
};

export const StudentScanPage = () => {
  const { token, user } = useAuth();
  const videoRef = useRef(null);
  const readerRef = useRef(null);
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

    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }

    const video = videoRef.current;
    if (video?.srcObject) {
      const tracks = video.srcObject.getTracks?.() || [];
      tracks.forEach((track) => track.stop());
      video.srcObject = null;
    }
  };

  const handleDecodedText = async (decodedText) => {
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
      await startScanner();
    }
  };

  const startScanner = async () => {
    if (!mountedRef.current || !videoRef.current) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setState((current) => ({
        ...current,
        cameraReady: false,
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
      status: "Opening the back camera...",
      error: ""
    }));

    try {
      const preferredDeviceId = await chooseBackCamera();
      const constraints = preferredDeviceId
        ? { audio: false, video: { deviceId: { exact: preferredDeviceId } } }
        : {
            audio: false,
            video: {
              facingMode: { ideal: "environment" }
            }
          };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!mountedRef.current || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.setAttribute("playsinline", "true");
      await video.play();

      const reader = new BrowserMultiFormatReader(150);
      readerRef.current = reader;

      setState((current) => ({
        ...current,
        cameraReady: true,
        status: "Camera live. Hold the QR inside the box."
      }));

      void reader.decodeFromVideoElementContinuously(video, (result, error) => {
        if (!mountedRef.current || scanLockRef.current) {
          return;
        }

        if (result) {
          void handleDecodedText(result.getText());
          return;
        }

        if (error && error.name && error.name !== "NotFoundException") {
          setState((current) => ({
            ...current,
            cameraReady: true,
            status: "Camera is live. Keep the QR steady inside the box."
          }));
        }
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
