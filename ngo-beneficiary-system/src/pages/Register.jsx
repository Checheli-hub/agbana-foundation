import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast.jsx";
import { registerUser } from "../services/authService.js";

const BACKEND_URL =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";

export default function Register({ setStaffUsers }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState({ message: "", variant: "success" });
  const [verificationToken, setVerificationToken] = useState(null);
  const [emailFailed, setEmailFailed] = useState(false);

  useEffect(() => {
    if (
      toast.message &&
      toast.variant === "success" &&
      toast.message.includes("Registration received")
    ) {
      const timeout = window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1800);
      return () => window.clearTimeout(timeout);
    }
  }, [navigate, toast]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setToast({ message: "", variant: "success" });

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setToast({ message: "Please enter a username.", variant: "error" });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setToast({ message: "Please enter your email.", variant: "error" });
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setToast({
        message: "Please enter a valid email address.",
        variant: "error",
      });
      return;
    }

    if (trimmedUsername.toLowerCase() === "admin") {
      setToast({
        message:
          "The username 'admin' is reserved. Choose a different username.",
        variant: "error",
      });
      return;
    }

    if (!password) {
      setToast({ message: "Please enter a password.", variant: "error" });
      return;
    }

    if (password.length < 8) {
      setToast({
        message: "Password must be at least 8 characters long.",
        variant: "error",
      });
      return;
    }

    if (password !== confirmPassword) {
      setToast({ message: "Passwords do not match.", variant: "error" });
      return;
    }

    try {
      const result = await registerUser({
        username: trimmedUsername,
        email: trimmedEmail,
        password,
      });

      setStaffUsers(result.users);

      // Save verification token for manual verification if needed
      if (result.verificationToken) {
        setVerificationToken(result.verificationToken);
        sessionStorage.setItem("verificationToken", result.verificationToken);
      }

      // Check if email sending failed
      const emailFailed = result.emailStatus && !result.emailStatus.success;
      setEmailFailed(emailFailed);

      let message = "Registration received. ";
      if (emailFailed) {
        message +=
          "Email verification could not be sent. Use the verification link below or check your email. ";
      } else {
        message += "Check your email to verify your account. ";
      }
      message += "An admin must approve your account before you can sign in.";

      setToast({
        message,
        variant: "success",
      });
    } catch (error) {
      setToast({
        message: error.message || "Unable to register. Please try again.",
        variant: "error",
      });
    }
  };

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Register</p>
          <h1>Staff sign-up</h1>
        </div>
      </div>

      <div className="list-panel">
        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Create your staff account</h2>
              <p>Register as a staff user to access the beneficiary system.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="beneficiary-form">
            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Choose a username"
                autoComplete="username"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </label>

            <label>
              Password
              <div className="password-input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  minLength={8}
                />
                <button
                  type="button"
                  className="input-icon-button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  <span className={showPassword ? "icon-eye-off" : "icon-eye"}>
                    {showPassword ? "✕" : "•"}
                  </span>
                </button>
              </div>
            </label>

            <label>
              Confirm password
              <div className="password-input-group">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  minLength={8}
                />
                <button
                  type="button"
                  className="input-icon-button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                  title={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  <span
                    className={
                      showConfirmPassword ? "icon-eye-off" : "icon-eye"
                    }
                  >
                    {showConfirmPassword ? "✕" : "•"}
                  </span>
                </button>
              </div>
            </label>

            <Toast
              message={toast.message}
              variant={toast.variant}
              onClose={() => setToast({ message: "", variant: "success" })}
            />

            <div className="form-actions">
              <button type="submit" className="button-primary">
                Register
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => navigate("/login")}
              >
                Back to login
              </button>
            </div>
          </form>

          {verificationToken && emailFailed && (
            <div
              className="section-panel"
              style={{
                marginTop: "2rem",
                padding: "1rem",
                backgroundColor: "#fff9e6",
                borderLeft: "4px solid #ffc107",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Manual Email Verification</h3>
              <p>
                If you did not receive a verification email, you can verify
                manually by using this link:
              </p>
              <div
                style={{
                  backgroundColor: "#fff",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  wordBreak: "break-all",
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                }}
              >
                <a
                  href={`${BACKEND_URL}/auth/verify?token=${verificationToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#0066cc", textDecoration: "none" }}
                >
                  {`${BACKEND_URL}/auth/verify?token=${verificationToken}`}
                </a>
              </div>
              <p style={{ fontSize: "0.9rem", color: "#666" }}>
                Or copy and paste this token in the verification page:
              </p>
              <div
                style={{
                  backgroundColor: "#f5f5f5",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  wordBreak: "break-all",
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  userSelect: "all",
                }}
              >
                {verificationToken}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
