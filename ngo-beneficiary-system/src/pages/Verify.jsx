import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Toast from "../components/Toast.jsx";

export default function Verify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestTokenRef = useRef("");
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token ? "Verifying..." : "No verification token provided.",
  );

  useEffect(() => {
    let mounted = true;
    if (!token) {
      return () => {
        mounted = false;
      };
    }

    const API_BASE = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");

    const setError = (msg) => {
      if (!mounted) return;
      setStatus("error");
      setMessage(msg || "Verification failed.");
    };

    if (!API_BASE) {
      setError("Verification service is not configured.");
      return () => {
        mounted = false;
      };
    }

    requestTokenRef.current = token;

    const runVerification = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/auth/verify?token=${encodeURIComponent(token)}`,
        );
        const body = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (requestTokenRef.current !== token) return;

        if (res.ok) {
          setStatus("success");
          setMessage(
            body.message
              ? `${body.message}. Redirecting to login...`
              : "Email verified successfully. Redirecting to login...",
          );
          setTimeout(() => navigate("/login", { replace: true }), 1800);
        } else {
          let errorMessage = body.error || "Verification failed.";
          if (res.status === 404) {
            errorMessage =
              "Invalid or already-used verification token. Use the latest link from your inbox or sign in if your email is already verified.";
          } else if (res.status === 410) {
            errorMessage =
              "Verification link has expired. Request a new verification email.";
          }
          setError(errorMessage);
        }
      } catch (err) {
        console.error("Verification request error:", err);
        if (!mounted) return;
        setError(
          "Verification request failed. Please check your network and try again.",
        );
      }
    };

    runVerification();

    return () => {
      mounted = false;
    };
  }, [navigate, token]);

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Verify</p>
          <h1>Email verification</h1>
        </div>
      </div>

      <div className="list-panel">
        <div className="section-panel">
          {token && (
            <div className="token-summary">
              <p className="token-label">Verification token</p>
              <pre className="token-value">{token}</pre>
            </div>
          )}
          <p>{message}</p>
          <Toast
            message={message}
            variant={status === "error" ? "error" : "success"}
          />
        </div>
      </div>
    </section>
  );
}
