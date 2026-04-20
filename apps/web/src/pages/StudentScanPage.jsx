import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

export const StudentScanPage = () => {
  const { token, user } = useAuth();
  const [state, setState] = useState({ loading: false, error: "", result: null });
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  useEffect(() => {
    if (!scannerInstanceRef.current) {
      scannerInstanceRef.current = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 300, height: 300 },
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: { ideal: "environment" } // Prefer back camera
          },
          showTorchButtonIfSupported: false,
          showZoomSliderIfSupported: false,
        },
        false
      );

      scannerInstanceRef.current.render(onScanSuccess, onScanError);
    }

    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear();
        scannerInstanceRef.current = null;
      }
    };
  }, []);

  const onScanSuccess = async (decodedText) => {
    // Stop scanning after successful scan
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.clear();
    }

    // Extract token from scanned content
    let tokenToUse = decodedText;
    
    // If it's a URL with token parameter, extract the token
    if (decodedText.includes('/scan?token=')) {
      const url = new URL(decodedText);
      tokenToUse = url.searchParams.get('token');
    }

    if (!tokenToUse) {
      setState((current) => ({ ...current, loading: false, error: "Invalid QR code. No session token found." }));
      return;
    }

    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const result = await apiRequest("/attendance/scan", {
        method: "POST",
        token,
        body: {
          token: tokenToUse
        }
      });
      setState((current) => ({ ...current, loading: false, result }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message }));
      // Restart scanning on error
      if (!scannerInstanceRef.current) {
        scannerInstanceRef.current = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 300, height: 300 },
            aspectRatio: 1.0,
            videoConstraints: {
              facingMode: { ideal: "environment" } // Prefer back camera
            },
            showTorchButtonIfSupported: false,
            showZoomSliderIfSupported: false,
          },
          false
        );
        scannerInstanceRef.current.render(onScanSuccess, onScanError);
      }
    }
  };

  const onScanError = (error) => {
    // Ignore scan errors, just keep scanning
    console.log("QR scan error:", error);
  };

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
        <p className="muted">
          Point your camera at the QR code displayed by the lecturer to record your attendance.
        </p>

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
            <h1>✓ Attendance Recorded</h1>
            <p>
              {state.result.course.courseCode} - {state.result.course.courseTitle}
            </p>
            <p>{new Date(state.result.timestamp).toLocaleString()}</p>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setState({ loading: false, error: "", result: null });
                // Restart scanner
                if (!scannerInstanceRef.current) {
                  scannerInstanceRef.current = new Html5QrcodeScanner(
                    "qr-reader",
                    {
                      fps: 10,
                      qrbox: { width: 300, height: 300 },
                      aspectRatio: 1.0,
                      videoConstraints: {
                        facingMode: { ideal: "environment" } // Prefer back camera
                      },
                      showTorchButtonIfSupported: false,
                      showZoomSliderIfSupported: false,
                    },
                    false
                  );
                  scannerInstanceRef.current.render(onScanSuccess, onScanError);
                }
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
