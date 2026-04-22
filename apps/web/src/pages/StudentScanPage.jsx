import { useEffect, useRef, useState } from "react";
import { BarcodeFormat, BrowserMultiFormatReader, DecodeHintType } from "@zxing/library";
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

const hasNativeQrDetector = () =>
  typeof window !== "undefined" && typeof window.BarcodeDetector !== "undefined";

const isIosDevice = () => {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || "";
  return /iPad|iPhone|iPod/i.test(userAgent) || (userAgent.includes("Mac") && navigator.maxTouchPoints > 1);
};

const SCANNER_ELEMENT_ID = "student-scan-reader";

export const StudentScanPage = () => {
  const { token, user } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scannerRef = useRef(null);
  const readerRef = useRef(null);
  const detectorRef = useRef(null);
  const html5QrcodeRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mountedRef = useRef(false);
  const scanLockRef = useRef(false);
  const [state, setState] = useState({
    loading: false,
    error: "",
    result: null,
    status: "Starting camera...",
    cameraReady: false
  });
  const useIosScanner = isIosDevice();

  const stopScanner = async ({ resetLock = true } = {}) => {
    if (resetLock) {
      scanLockRef.current = false;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }

    detectorRef.current = null;

    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
      } catch {
        // Ignore stop errors when the scanner is already idle or still starting.
      }

      try {
        html5QrcodeRef.current.clear();
      } catch {
        // Ignore cleanup errors from partially initialized scanner instances.
      }

      html5QrcodeRef.current = null;
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
    void stopScanner({ resetLock: false });

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

  const startNativeScanLoop = () => {
    if (!detectorRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    const loop = async () => {
      if (!mountedRef.current || scanLockRef.current) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const sourceSize = Math.min(video.videoWidth, video.videoHeight);
      const cropSize = Math.floor(sourceSize * 0.82);
      const sx = Math.floor((video.videoWidth - cropSize) / 2);
      const sy = Math.floor((video.videoHeight - cropSize) / 2);

      canvas.width = 640;
      canvas.height = 640;
      context.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, canvas.width, canvas.height);

      try {
        const detections = await detectorRef.current.detect(canvas);
        const qrText = detections?.[0]?.rawValue;
        if (qrText) {
          await recordAttendance(qrText);
          return;
        }
      } catch {
        // Keep scanning; a failed frame is normal while the QR is moving.
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  };

  const startScanner = async () => {
    if (!mountedRef.current) {
      return;
    }

    if (useIosScanner) {
      if (!scannerRef.current) {
        setState((current) => ({
          ...current,
          cameraReady: false,
          status: "Scanner is not ready yet.",
          error: "Scanner container is unavailable."
        }));
        return;
      }

      await stopScanner();

      setState((current) => ({
        ...current,
        loading: false,
        cameraReady: false,
        status: "Opening the back camera...",
        error: ""
      }));

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          useBarCodeDetectorIfSupported: false
        });

        html5QrcodeRef.current = scanner;

        await scanner.start(
          {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          {
            fps: 10,
            disableFlip: true
          },
          (decodedText) => {
            if (!mountedRef.current || scanLockRef.current) {
              return;
            }

            void recordAttendance(decodedText);
          }
        );

        if (!mountedRef.current) {
          await stopScanner({ resetLock: false });
          return;
        }

        setState((current) => ({
          ...current,
          cameraReady: true,
          status: "Camera live. Hold the QR inside the box."
        }));
        return;
      } catch (error) {
        await stopScanner({ resetLock: false });

        const message =
          typeof error === "string"
            ? error
            : error?.message || "Unable to start the camera. Try again.";

        setState((current) => ({
          ...current,
          loading: false,
          cameraReady: false,
          status: "Camera could not be started.",
          error: message
        }));
        return;
      }
    }

    if (!videoRef.current || !navigator.mediaDevices?.getUserMedia) {
      setState((current) => ({
        ...current,
        cameraReady: false,
        status: "This browser cannot open the camera.",
        error: "Camera access is not supported on this device."
      }));
      return;
    }

    await stopScanner();

    setState((current) => ({
      ...current,
      loading: false,
      cameraReady: false,
      status: "Opening the back camera...",
      error: ""
    }));
    
    try {
      let stream = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { exact: "environment" } }
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: "environment" } }
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true
          });
        }
      }

      if (!mountedRef.current || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      await video.play();

      setState((current) => ({
        ...current,
        cameraReady: true,
        status: "Camera live. Hold the QR inside the box."
      }));

      if (hasNativeQrDetector()) {
        detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
        startNativeScanLoop();
        return;
      }

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);

      const reader = new BrowserMultiFormatReader(hints, 100);
      readerRef.current = reader;

      void reader.decodeFromVideoElementContinuously(video, (result) => {
        if (!mountedRef.current || scanLockRef.current || !result) {
          return;
        }

        void recordAttendance(result.getText());
      });
    } catch (error) {
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
      void stopScanner();
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
                {useIosScanner ? (
                  <div ref={scannerRef} id={SCANNER_ELEMENT_ID} className="scan-surface" />
                ) : (
                  <video ref={videoRef} className="scan-video" autoPlay muted playsInline webkit-playsinline="true" />
                )}
                <div className="scan-frame__guide" />
                {!useIosScanner ? <canvas ref={canvasRef} className="scan-canvas" aria-hidden="true" /> : null}
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
