import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../services/api";
import "./AuthPage.css";

export default function AuthPage({ mode }) {
  const register = mode === "register";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const finishLogin = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    toast.success(
      `Welcome${data.user?.name ? `, ${data.user.name}` : ""}`
    );

    navigate("/dashboard");
  };

  const submit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);

      if (register) {
        await API.post("/auth/register", {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        });

        toast.success("Workspace created. Please sign in.");
        navigate("/login");
        return;
      }

      const { data } = await API.post("/auth/login", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      finishLogin(data);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to continue"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      if (!credentialResponse?.credential) {
        toast.error("Google did not return a valid credential.");
        return;
      }

      setGoogleLoading(true);

      const { data } = await API.post("/auth/google", {
        credential: credentialResponse.credential,
      });

      finishLogin(data);
    } catch (error) {
      console.error("Google login error:", error);

      toast.error(
        error.response?.data?.message ||
          "Google sign-in failed"
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error("Google sign-in was cancelled or failed");
  };

  return (
    <main className="af-auth2">
      <section className="af-auth2-visual">
        <div className="af-auth2-brand">
          <div className="af-auth2-logo">
            <BrainCircuit size={27} />
          </div>

          <div>
            <strong>AutoFlow AI</strong>
            <span>Secure Document Intelligence</span>
          </div>
        </div>

        <div className="af-auth2-hero">
          <div className="af-auth2-kicker">
            <Sparkles size={15} />
            INTELLIGENT DOCUMENT OPERATIONS
          </div>

          <h1>
            Your documents.
            <br />
            Verified before trusted.
          </h1>

          <p>
            Automate document workflows with encrypted cloud
            storage, verifiable evidence and risk-adaptive
            identity protection.
          </p>

          <div className="af-auth2-features">
            <div>
              <ShieldCheck size={19} />
              <span>AES-256-GCM encrypted storage</span>
            </div>

            <div>
              <CheckCircle2 size={19} />
              <span>SHA-256 integrity verification</span>
            </div>

            <div>
              <LockKeyhole size={19} />
              <span>BioTrust protected access</span>
            </div>
          </div>
        </div>

        <div className="af-auth2-security">
          <span />
          Private AWS S3
          <span />
          Verified Evidence
          <span />
          BioTrust
        </div>
      </section>

      <section className="af-auth2-panel">
        <div className="af-auth2-card">
          <div className="af-auth2-mobile-brand">
            <BrainCircuit size={25} />
            <strong>AutoFlow AI</strong>
          </div>

          <div className="af-auth2-heading">
            <span className="af-auth2-secure-label">
              <ShieldCheck size={15} />
              SECURE ACCESS
            </span>

            <h2>
              {register
                ? "Create your workspace"
                : "Welcome back"}
            </h2>

            <p>
              {register
                ? "Create your AutoFlow account and start building secure document workflows."
                : "Sign in to continue to your AutoFlow workspace."}
            </p>
          </div>

          <div
            className={
              googleLoading
                ? "af-auth2-google is-loading"
                : "af-auth2-google"
            }
          >
            {googleLoading ? (
              <div className="af-auth2-google-loading">
                Connecting to Google...
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                shape="rectangular"
                text={
                  register
                    ? "signup_with"
                    : "signin_with"
                }
                width="360"
              />
            )}
          </div>

          <div className="af-auth2-divider">
            <span />
            <small>OR CONTINUE WITH EMAIL</small>
            <span />
          </div>

          <form
            onSubmit={submit}
            className="af-auth2-form"
          >
            {register && (
              <label>
                <span>Full name</span>

                <input
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  placeholder="Your full name"
                />
              </label>
            )}

            <label>
              <span>Email address</span>

              <input
                required
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) =>
                  setForm({
                    ...form,
                    email: event.target.value,
                  })
                }
                placeholder="you@example.com"
              />
            </label>

            <label>
              <span>Password</span>

              <div className="af-auth2-password">
                <input
                  required
                  minLength={6}
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete={
                    register
                      ? "new-password"
                      : "current-password"
                  }
                  value={form.password}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      password: event.target.value,
                    })
                  }
                  placeholder={
                    register
                      ? "Minimum 6 characters"
                      : "Enter your password"
                  }
                />

                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </label>

            <button
              type="submit"
              className="af-auth2-submit"
              disabled={loading || googleLoading}
            >
              <span>
                {loading
                  ? "Please wait..."
                  : register
                    ? "Create workspace"
                    : "Sign in securely"}
              </span>

              {!loading && (
                <ArrowRight size={18} />
              )}
            </button>
          </form>

          <div className="af-auth2-switch">
            {register
              ? "Already have an AutoFlow account?"
              : "New to AutoFlow AI?"}

            <Link
              to={
                register
                  ? "/login"
                  : "/register"
              }
            >
              {register
                ? "Sign in"
                : "Create account"}
            </Link>
          </div>

          <div className="af-auth2-trust">
            <ShieldCheck size={15} />
            Authentication protected by AutoFlow Security
          </div>
        </div>
      </section>
    </main>
  );
}