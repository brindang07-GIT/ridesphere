import React, { useEffect, useRef, useState } from "react";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats
} from "html5-qrcode";

function QRScanner({ onScanSuccess, onClose }) {
  const scannerRef = useRef(null);
  const scannerStartedRef = useRef(false);
  const scanHandledRef = useRef(false);

  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        setError("");

        const scanner = new Html5Qrcode("qr-reader");

        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: {
              width: 320,
              height: 320
            },
            aspectRatio: 1.0,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE
            ]
          },
          (decodedText) => {
            if (!mounted || scanHandledRef.current) {
              return;
            }

            console.log("QR CODE DETECTED:", decodedText);

            scanHandledRef.current = true;

            onScanSuccess(decodedText);
          },
          () => {
            // Normal scanning failures are ignored.
          }
        );

        if (mounted) {
          scannerStartedRef.current = true;
          setScanning(true);
        }
      } catch (err) {
        console.error("QR scanner error:", err);

        if (mounted) {
          setError(
            "Camera could not start. Please allow camera permission and try again."
          );
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;

      const scanner = scannerRef.current;

      if (!scanner) {
        return;
      }

      if (scannerStartedRef.current) {
        scanner
          .stop()
          .then(() => {
            scannerStartedRef.current = false;

            try {
              scanner.clear();
            } catch (e) {}
          })
          .catch((err) => {
            console.log("Scanner cleanup:", err.message);
          });
      } else {
        try {
          scanner.clear();
        } catch (e) {}
      }

      scannerRef.current = null;
    };
  }, []);

  return (
    <div className="qr-scanner-container">

      <div className="qr-scanner-card">

        <button
          className="qr-close-btn"
          onClick={onClose}
        >
          ×
        </button>

        <h2>Scan Bus QR</h2>

        <p className="qr-instruction">
          Scan the QR code displayed inside your assigned bus.
        </p>

        <div id="qr-reader"></div>

        {scanning && !error && (
          <p className="qr-status">
            📷 Camera active — place the QR inside the box
          </p>
        )}

        {error && (
          <p className="qr-error">
            {error}
          </p>
        )}

        <button
          className="qr-cancel-btn"
          onClick={onClose}
        >
          Cancel
        </button>

      </div>

    </div>
  );
}

export default QRScanner;