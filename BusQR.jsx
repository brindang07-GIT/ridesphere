import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

function BusQR() {
  const [qrValue, setQrValue] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    const generateQR = () => {
      // QR changes every 60 seconds
      const timeSlot = Math.floor(Date.now() / 60000);

      const value = `Ridesphere|ROUTE08|${timeSlot}`;

      setQrValue(value);

      // Calculate exact seconds remaining
      const currentSeconds = Math.floor(
        Date.now() / 1000
      );

      const secondsRemaining =
        60 - (currentSeconds % 60);

      setSecondsLeft(secondsRemaining);
    };

    // Generate QR immediately
    generateQR();

    // Check every second
    const timer = setInterval(() => {
      generateQR();
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="bus-qr-screen">

      <div className="bus-qr-card">

        <div className="bus-qr-logo">
          RideSphere
        </div>

        <h1>
          KR PURAM ROUTE
        </h1>

        <p className="bus-qr-route">
          ROUTE NO. - 08
        </p>

        <p className="bus-qr-instruction">
          Scan this QR code to mark your
          boarding attendance
        </p>

        <div className="qr-display-box">

          {qrValue && (
            <QRCodeSVG
              value={qrValue}
              size={280}
              level="H"
            />
          )}

        </div>

        <div className="qr-timer">
          QR refreshes in{" "}
          <strong>
            {secondsLeft}s
          </strong>
        </div>

        <p className="qr-security">
          🔒 Secure Dynamic Bus QR
        </p>

      </div>

    </div>
  );
}

export default BusQR;