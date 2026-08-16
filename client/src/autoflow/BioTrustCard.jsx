import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import API from "../services/api";

export default function BioTrustCard() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState({
    enabled: false,
    enrolled: false,
  });

  const [cameraOpen, setCameraOpen] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState("enroll");

  const loadStatus = async () => {
    try {
      setLoadingStatus(true);

      const { data } = await API.get("/biometric/status");

      const faceAuth =
        data.faceAuth ||
        data.biometric ||
        data.status ||
        {};

      setStatus({
        enabled: Boolean(faceAuth.enabled),
        enrolled: Boolean(faceAuth.enrolled),
        enrolledAt: faceAuth.enrolledAt || null,
        lastVerifiedAt: faceAuth.lastVerifiedAt || null,
        verificationCount: faceAuth.verificationCount || 0,
        locked: Boolean(faceAuth.locked),
        lockedUntil: faceAuth.lockedUntil || null,
      });
    } catch (error) {
      console.error("BioTrust status error:", error);

      if (error.response?.status !== 401) {
        toast.error(
          error.response?.data?.message ||
            "Unable to load BioTrust status"
        );
      }
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();

    return () => {
      stopCamera();
    };
  }, []);

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

    setCameraOpen(false);
  };

  const openCamera = async (nextMode) => {
    try {
      stopCamera();

      setMode(nextMode);
      setCameraOpen(true);

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 1280,
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
    } catch (error) {
      console.error("Camera error:", error);

      setCameraOpen(false);

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        toast.error(
          "Camera permission was blocked. Please allow camera access."
        );
      } else if (error.name === "NotFoundError") {
        toast.error(
          "No camera was found on this device."
        );
      } else {
        toast.error(
          "Unable to open camera."
        );
      }
    }
  };

  const captureFace = () => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;

      if (
        !video ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        reject(
          new Error(
            "Camera is not ready yet."
          )
        );

        return;
      }

      const canvas =
        document.createElement("canvas");

      const maxWidth = 900;

      const scale = Math.min(
        1,
        maxWidth / video.videoWidth
      );

      canvas.width = Math.round(
        video.videoWidth * scale
      );

      canvas.height = Math.round(
        video.videoHeight * scale
      );

      const context =
        canvas.getContext("2d");

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "Unable to capture face image."
              )
            );

            return;
          }

          resolve(blob);
        },
        "image/jpeg",
        0.9
      );
    });
  };

  const submitFace = async () => {
    try {
      setProcessing(true);

      const faceBlob =
        await captureFace();

      const body =
        new FormData();

      body.append(
        "face",
        faceBlob,
        "biotrust-face.jpg"
      );

      if (mode === "enroll") {
        const { data } =
          await API.post(
            "/biometric/enroll",
            body
          );

        toast.success(
          data.message ||
            "Face enrolled successfully"
        );
      } else {
        const { data } =
          await API.post(
            "/biometric/verify",
            body
          );

        const similarity =
          data.similarity !== undefined
            ? ` ${data.similarity}% similarity.`
            : "";

        toast.success(
          `${
            data.message ||
            "Identity verified"
          }${similarity}`
        );
      }

      stopCamera();

      await loadStatus();
    } catch (error) {
      console.error(
        "BioTrust operation error:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "BioTrust operation failed"
      );
    } finally {
      setProcessing(false);
    }
  };

  const removeEnrollment = async () => {
    const confirmed =
      window.confirm(
        "Remove your BioTrust face enrollment?"
      );

    if (!confirmed) return;

    try {
      setProcessing(true);

      const { data } =
        await API.delete(
          "/biometric/enroll"
        );

      toast.success(
        data.message ||
          "Face enrollment removed"
      );

      await loadStatus();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to remove face enrollment"
      );
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "Not yet";

    return new Date(
      value
    ).toLocaleString();
  };

  return (
    <>
      <section className="flow-card biotrust-card">
        <div className="biotrust-head">
          <div className="biotrust-icon">
            <ShieldCheck />
          </div>

          <div>
            <span className="biotrust-label">
              ADAPTIVE BIOMETRIC SECURITY
            </span>

            <h2>
              AutoFlow BioTrust
            </h2>

            <p>
              Add camera-based face verification
              for sensitive document actions.
              Your enrolled reference is encrypted
              before being stored in private AWS S3.
            </p>
          </div>

          <div
            className={`biotrust-state ${
              status.enrolled
                ? "active"
                : "inactive"
            }`}
          >
            {status.enrolled
              ? "Protected"
              : "Not enrolled"}
          </div>
        </div>

        {loadingStatus ? (
          <div className="biotrust-loading">
            <RefreshCw />
            Checking BioTrust status...
          </div>
        ) : (
          <>
            <div className="biotrust-stats">
              <div>
                <span>
                  Face enrollment
                </span>

                <strong>
                  {status.enrolled
                    ? "Active"
                    : "Not configured"}
                </strong>
              </div>

              <div>
                <span>
                  Enrolled
                </span>

                <strong>
                  {formatDate(
                    status.enrolledAt
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Last verified
                </span>

                <strong>
                  {formatDate(
                    status.lastVerifiedAt
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Successful checks
                </span>

                <strong>
                  {status.verificationCount ||
                    0}
                </strong>
              </div>
            </div>

            {status.locked && (
              <div className="biotrust-warning">
                <ShieldAlert />

                <div>
                  <b>
                    BioTrust temporarily locked
                  </b>

                  <span>
                    Too many failed verification
                    attempts. Try again after{" "}
                    {formatDate(
                      status.lockedUntil
                    )}
                    .
                  </span>
                </div>
              </div>
            )}

            <div className="biotrust-actions">
              {!status.enrolled ? (
                <button
                  type="button"
                  className="flow-primary"
                  disabled={processing}
                  onClick={() =>
                    openCamera("enroll")
                  }
                >
                  <Camera size={18} />
                  Enroll my face
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="flow-primary"
                    disabled={
                      processing ||
                      status.locked
                    }
                    onClick={() =>
                      openCamera("verify")
                    }
                  >
                    <ShieldCheck
                      size={18}
                    />
                    Verify identity
                  </button>

                  <button
                    type="button"
                    className="flow-ghost"
                    disabled={processing}
                    onClick={() =>
                      openCamera("enroll")
                    }
                  >
                    <RefreshCw
                      size={17}
                    />
                    Re-enroll face
                  </button>

                  <button
                    type="button"
                    className="biotrust-remove"
                    disabled={processing}
                    onClick={
                      removeEnrollment
                    }
                  >
                    <Trash2 size={17} />
                    Remove BioTrust
                  </button>
                </>
              )}
            </div>

            <div className="biotrust-privacy">
              <CheckCircle2 />

              <span>
                Live captures are processed
                transiently and are not stored by
                AutoFlow. The enrolled reference
                is encrypted before S3 storage.
              </span>
            </div>
          </>
        )}
      </section>

      {cameraOpen && (
        <div
          className="biotrust-camera-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              stopCamera();
            }
          }}
        >
          <div className="biotrust-camera-modal">
            <div className="biotrust-camera-head">
              <div>
                <span>
                  AUTOFLOW BIOTRUST
                </span>

                <h3>
                  {mode === "enroll"
                    ? "Enroll your face"
                    : "Verify your identity"}
                </h3>

                <p>
                  Look directly at the camera
                  with your face clearly visible.
                </p>
              </div>

              <button
                type="button"
                onClick={stopCamera}
                aria-label="Close camera"
              >
                <X />
              </button>
            </div>

            <div className="biotrust-video-wrap">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
              />

              <div className="biotrust-face-guide">
                <span />
              </div>

              <div className="biotrust-camera-status">
                <i />
                Camera active
              </div>
            </div>

            <div className="biotrust-camera-tip">
              Keep only one face visible and use
              good lighting.
            </div>

            <div className="biotrust-camera-actions">
              <button
                type="button"
                className="flow-ghost"
                disabled={processing}
                onClick={stopCamera}
              >
                Cancel
              </button>

              <button
                type="button"
                className="flow-primary"
                disabled={processing}
                onClick={submitFace}
              >
                <Camera size={18} />

                {processing
                  ? mode === "enroll"
                    ? "Securing face..."
                    : "Verifying..."
                  : mode === "enroll"
                    ? "Capture and enroll"
                    : "Capture and verify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}