import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

const SCAN_DELAY_MS = 180;

const CAMERA_ATTEMPTS = [
  { audio: false, video: { facingMode: { exact: "environment" } } },
  { audio: false, video: { facingMode: { ideal: "environment" } } },
  { audio: false, video: true }
];

const parseSessionTokenFromQr = (value) => {
  const rawValue = typeof value === "string" ? value.trim() : "";
  if (!rawValue) return "";

  if (/^https?:\/\//i.test(rawValue)) {
    try {
      const url = new URL(rawValue);
      const tokenFromQuery = url.searchParams.get("token");
      if (tokenFromQuery) return tokenFromQuery.trim();

      const tokenFromHash = url.hash.replace(/^#/, "").trim();
      if (tokenFromHash) return tokenFromHash;
    } catch {
      return rawValue;
    }
  }

  const queryMatch = rawValue.match(/[?&]token=([^&]+)/i);
  if (queryMatch?.[1]) {
    try {
      return decodeURIComponent(queryMatch[1]).trim();
    } catch {
      return queryMatch[1].trim();
    }
  }

  return rawValue;
};

const isNoQrError = (error) => {
  const message = typeof error === "string" ? error : error?.message || "";
  if (!message) return true;
  return /no qr code found/i.test(message) || message === QrScanner.NO_QR_CODE_FOUND;
};

const stopMediaStream = (stream) => {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
};

export const StudentScanPage = () => {
  const { token, user, logout } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef = useRef(null);
  const mountedRef = useRef(false);
  const submittingRef = useRef(false);
  const scanInProgressRef = useRef(false);

  const [status, setStatus] = useState("Starting camera...");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const clearLoop = () => {
    if (loopRef.current) {
      window.clearTimeout(loopRef.current);
      loopRef.current = null;
    }
  };

  const stopScanner = async () => {
    clearLoop();

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (mountedRef.current) {
      setCameraReady(false);
    }
  };

  const destroyEngine = () => {
    const engine = engineRef.current;
    engineRef.current = null;
    if (engine && typeof engine.terminate === "function") {
      engine.terminate();
    }
  };

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera access is not supported on this browser.");
    }

    let lastError = null;
    for (const constraints of CAMERA_ATTEMPTS) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Unable to start camera. Please try again.");
  };

  const recordAttendance = async (sessionToken) => {
    return apiRequest("/attendance/scan", {
      method: "POST",
      token,
      body: {
        token: sessionToken
      }
    });
  };

  const decodeCurrentFrame = async ({ snapshot = false } = {}) => {
    if (!mountedRef.current || submittingRef.current || scanInProgressRef.current) return false;

    scanInProgressRef.current = true;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    try {
      if (!video || !canvas || !streamRef.current) {
        return false;
      }

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
        return false;
      }

      const result = await QrScanner.scanImage(video, {
        qrEngine: engineRef.current,
        canvas,
        returnDetailedScanResult: true,
        alsoTryWithoutScanRegion: true
      });

      const sessionToken = parseSessionTokenFromQr(result?.data || result);
      if (!sessionToken) {
        return false;
      }

      submittingRef.current = true;
      setSubmitting(true);
      setStatus("QR found. Recording attendance...");
      await stopScanner();

      try {
        const response = await recordAttendance(sessionToken);
        if (!mountedRef.current) return;

        setSuccess({
          course: response.course,
          timestamp: response.timestamp
        });
        setError("");
        setStatus("Attendance recorded.");
        return true;
      } catch (submitError) {
        if (!mountedRef.current) return;

        submittingRef.current = false;
        setSubmitting(false);
        const message = typeof submitError === "string" ? submitError : submitError?.message || "Unable to record attendance.";
        setError(message);
        setStatus("QR captured, but the attendance request failed.");
        return false;
      }
    } catch (error) {
      if (!mountedRef.current) return;

      if (!isNoQrError(error)) {
        const message = typeof error === "string" ? error : error?.message || "Unable to read QR code.";
        setError(message);
        setStatus(snapshot ? "Snapshot failed. Try again." : "Camera is on, keep the QR code inside the frame.");
      } else if (snapshot) {
        setStatus("No QR code found in the snapshot.");
      }

      if (!submittingRef.current) {
        setSubmitting(false);
      }

      return false;
    } finally {
      scanInProgressRef.current = false;
    }
  };

  const scanLoop = async () => {
    if (!mountedRef.current || submittingRef.current) return;

    const decoded = await decodeCurrentFrame();
    if (!mountedRef.current || submittingRef.current) return;

    if (!decoded) {
      loopRef.current = window.setTimeout(scanLoop, SCAN_DELAY_MS);
    }
  };

  const startScanner = async () => {
    setError("");
    setSuccess(null);
    setStatus("Starting camera...");
    submittingRef.current = false;
    setSubmitting(false);

    await stopScanner();

    try {
      const stream = await openCamera();
      if (!mountedRef.current) {
        stopMediaStream(stream);
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopMediaStream(stream);
        throw new Error("Camera preview is unavailable.");
      }

      video.srcObject = stream;
      await video.play();

      if (!engineRef.current) {
        engineRef.current = await QrScanner.createQrEngine();
      }

      if (!mountedRef.current) return;

      setCameraReady(true);
      setStatus("Point the QR code at the frame.");
      loopRef.current = window.setTimeout(scanLoop, SCAN_DELAY_MS);
    } catch (error) {
      await stopScanner();
      destroyEngine();
      if (!mountedRef.current) return;

      const message = typeof error === "string" ? error : error?.message || "Unable to start camera.";
      setError(message);
      setStatus("Camera could not be started.");
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    startScanner();

    return () => {
      mountedRef.current = false;
      clearLoop();
      stopMediaStream(streamRef.current);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      streamRef.current = null;
      destroyEngine();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestart = async () => {
    await startScanner();
  };

  const handleSnapScan = async () => {
    if (!cameraReady || submittingRef.current) return;

    setError("");
    setStatus("Taking a snapshot...");

    const decoded = await decodeCurrentFrame({ snapshot: true });
    if (!decoded && mountedRef.current) {
      setStatus("No QR found yet. Try snapping again or hold the code steady.");
    }
  };

  const courseLabel = success?.course
    ? `${success.course.courseCode || ""}${success.course.courseCode && success.course.courseTitle ? " - " : ""}${success.course.courseTitle || ""}`.trim()
    : "";

  return (
    <div className="student-scan">
      <header className="student-scan__header">
        <div>
          <strong>Student Scan</strong>
          <span>{user?.name || "Ready to record attendance"}</span>
        </div>
        <button className="btn btn-secondary" type="button" onClick={logout}>
          Logout
        </button>
      </header>

      <main className="student-scan__body">
        <div className="section-head">
          <span>{success ? "Attendance captured" : "Scan the QR code"}</span>
        </div>

        <p className="muted">
          {success
            ? "You are marked present for this session."
            : "Keep the QR code inside the frame and hold the phone steady."}
        </p>

        {error ? <div className="error-text">{error}</div> : null}

        {success ? (
          <div className="success-block">
            <h1>Attendance recorded</h1>
            {courseLabel ? <p>{courseLabel}</p> : null}
            <p>{success.timestamp ? new Date(success.timestamp).toLocaleTimeString() : "Recorded just now"}</p>
          </div>
        ) : (
          <div className="scan-container">
            <div className="scan-frame">
              <div className="scan-surface">
                <video
                  ref={videoRef}
                  className="scan-video"
                  autoPlay
                  muted
                  playsInline
                />
                <canvas ref={canvasRef} className="scan-canvas" />
              </div>
              <div className="scan-frame__guide" />
              {!cameraReady ? (
                <div className="scan-overlay">
                  <div className="scan-loading">{status}</div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        <p className="scan-status">{status}</p>

        <div className="scan-actions">
          <div className="scan-actions__group">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={handleSnapScan}
              disabled={submitting || !cameraReady || !!success}
            >
              Snap QR
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={handleRestart}
              disabled={submitting}
            >
              {success ? "Scan another code" : "Restart camera"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
