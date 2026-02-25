import { useEffect, useRef, useState } from "react";

const QrScanner = ({ onScan }) => {
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let html5QrCode = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        html5QrCode = new Html5Qrcode("qr-reader");

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScan(decodedText);
            html5QrCode.stop().catch(() => {});
          },
          () => {} // ignore errors from scanning
        );
      } catch (err) {
        setError("Camera access denied or not available. Use manual check-in instead.");
      }
    };

    startScanner();

    return () => {
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [onScan]);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div id="qr-reader" className="w-full rounded-lg overflow-hidden" />
      <p className="text-xs text-muted-foreground text-center mt-2">
        Point camera at attendee's QR code
      </p>
    </div>
  );
};

export default QrScanner;
