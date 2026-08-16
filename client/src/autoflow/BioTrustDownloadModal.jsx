import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Fingerprint,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import API from "../services/api";

export default function BioTrustDownloadModal({
  document,
  onClose,
  onVerified,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("starting");
  const [message, setMessage] = useState(
    "Starting secure camera..."
  );

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    try {
      stopCamera();

      setStatus("starting");
      setMessage(
        "Allow camera access to verify your identity."
      );

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Camera access is not supported in this browser."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 720,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play();
      }

      setStatus("ready");

      setMessage(
        "Keep your face clearly visible and capture when ready."
      );
    } catch (error) {
      console.error(
        "BioTrust camera error:",
        error
      );

      setStatus("error");

      if (
        error?.name === "NotAllowedError" ||
        error?.name === "PermissionDeniedError"
      ) {
        setMessage(
          "Camera permission was denied. Allow camera access and try again."
        );
      } else {
        setMessage(
          error?.message ||
            "Unable to start the camera."
        );
      }
    }
  };

  useEffect(() => {
    if (document) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?._id]);

  const captureAndVerify = async () => {
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (
        !video ||
        !canvas ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        throw new Error(
          "Camera is not ready yet."
        );
      }

      setStatus("verifying");
      setMessage(
        "Verifying identity with AutoFlow BioTrust..."
      );

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context =
        canvas.getContext("2d");

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const faceBlob =
        await new Promise((resolve) => {
          canvas.toBlob(
            resolve,
            "image/jpeg",
            0.92
          );
        });

      if (!faceBlob) {
        throw new Error(
          "Unable to capture face image."
        );
      }

      const body = new FormData();

      body.append(
        "face",
        faceBlob,
        "biotrust-verification.jpg"
      );

      body.append(
        "documentId",
        String(document._id)
      );

      const response =
        await API.post(
          "/biometric/verify",
          body
        );

      if (
        !response.data?.success ||
        !response.data?.verified
      ) {
        throw new Error(
          response.data?.message ||
            "Identity verification failed."
        );
      }

      const proofToken =
        response.data?.biometricProof?.token;

      if (!proofToken) {
        throw new Error(
          "BioTrust proof was not generated."
        );
      }

      setStatus("verified");
      setMessage(
        "Identity verified. Authorizing secure download..."
      );

      stopCamera();

      const successful =
        await onVerified?.(
          proofToken
        );

      if (successful === false) {
        setStatus("error");
        setMessage(
          "Identity was verified, but the secure download could not be completed."
        );
      }
    } catch (error) {
      console.error(
        "BioTrust verification error:",
        error
      );

      const apiMessage =
        error.response?.data?.message;

      setStatus("error");

      setMessage(
        apiMessage ||
          error?.message ||
          "Face verification failed. Please try again."
      );
    }
  };

  const close = () => {
    stopCamera();
    onClose?.();
  };

  return (
    <div
      className="biotrust-download-backdrop"
      role="dialog"
      aria-modal="true"
    >
      <div className="biotrust-download-modal">
        <div className="biotrust-download-head">
          <div>
            <span className="biotrust-download-eyebrow">
              <Fingerprint size={15} />
              AUTOFLOW BIOTRUST
            </span>

            <h2>
              Identity verification required
            </h2>

            <p>
              This document is protected by
              risk-adaptive biometric security.
            </p>
          </div>

          <button
            type="button"
            className="biotrust-download-close"
            onClick={close}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="biotrust-download-file">
          <ShieldCheck size={18} />

          <div>
            <small>
              Protected document
            </small>

            <strong>
              {document?.filename ||
                "Sensitive document"}
            </strong>
          </div>
        </div>

        <div className="biotrust-download-camera">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
          />

          <div className="biotrust-face-frame">
            <span />
          </div>

          {status === "verifying" && (
            <div className="biotrust-verifying-layer">
              <RefreshCw
                className="biotrust-spin"
                size={34}
              />

              <b>
                Checking identity...
              </b>
            </div>
          )}

          {status === "verified" && (
            <div className="biotrust-verifying-layer">
              <ShieldCheck
                size={38}
              />

              <b>
                Identity verified
              </b>
            </div>
          )}
        </div>

        <canvas
          ref={canvasRef}
          hidden
        />

        <div
          className={`biotrust-download-message ${status}`}
        >
          <span />

          {message}
        </div>

        <div className="biotrust-download-actions">
          {status === "error" ? (
            <>
              <button
                type="button"
                className="biotrust-secondary-btn"
                onClick={close}
              >
                Cancel
              </button>

              <button
                type="button"
                className="biotrust-primary-btn"
                onClick={startCamera}
              >
                <RefreshCw size={17} />
                Try again
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="biotrust-secondary-btn"
                onClick={close}
                disabled={
                  status === "verifying"
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="biotrust-primary-btn"
                onClick={
                  captureAndVerify
                }
                disabled={
                  status !== "ready"
                }
              >
                {status ===
                "verifying" ? (
                  <>
                    <RefreshCw
                      className="biotrust-spin"
                      size={17}
                    />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Camera size={17} />
                    Verify and download
                  </>
                )}
              </button>
            </>
          )}
        </div>

        <p className="biotrust-download-privacy">
          Verification capture is used for
          identity comparison and is not
          stored by AutoFlow as a new face
          reference.
        </p>
      </div>
    </div>
  );
}
