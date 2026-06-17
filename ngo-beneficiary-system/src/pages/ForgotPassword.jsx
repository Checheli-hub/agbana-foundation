import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Toast from "../components/Toast.jsx";
import { requestPasswordReset } from "../services/authService.js";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [usernameInput, setUsernameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [toast, setToast] = useState({ message: "", variant: "success" });

  useEffect(() => {
    if (!location.state?.fromLogin) {
      navigate("/login", { replace: true });
    }
  }, [location.state, navigate]);

  if (!location.state?.fromLogin) {
    return null;
  }

  const resetMessages = () => {
    setToast({ message: "", variant: "success" });
  };

  const requestedRole = location.state?.role || "User";
  const isAdminRecovery = requestedRole === "Admin";

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetMessages();

    const trimmedEmail = emailInput.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setToast({ message: "Enter a valid email address.", variant: "error" });
      return;
    }

    const trimmedUsername = usernameInput.trim();
    if (!isAdminRecovery && !trimmedUsername) {
      setToast({
        message: "Enter the username for password recovery.",
        variant: "error",
      });
      return;
    }

    try {
      await requestPasswordReset({
        username: isAdminRecovery ? "" : trimmedUsername,
        email: trimmedEmail,
        role: requestedRole,
      });

      setToast({
        message:
          "Password reset instructions have been sent to your email address.",
        variant: "success",
      });
      setUsernameInput("");
      setEmailInput("");
    } catch (error) {
      setToast({
        message:
          error.message ||
          "No matching account found. Check your username, role, and email.",
        variant: "error",
      });
    }
  };

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Recovery</p>
          <h1>Reset password</h1>
        </div>
      </div>
      <div className="list-panel">
        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Forgot password</h2>
              <p>
                {isAdminRecovery
                  ? "Enter the admin email and choose a new password to reset admin access."
                  : "Enter your registered username and Gmail address to reset your staff password."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="beneficiary-form">
            {!isAdminRecovery && (
              <label>
                Username
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(event) => setUsernameInput(event.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder={
                  isAdminRecovery
                    ? "Enter your admin email"
                    : "Enter your registered Gmail address"
                }
                autoComplete="email"
              />
            </label>

            <Toast
              message={toast.message}
              variant={toast.variant}
              onClose={resetMessages}
            />

            <div className="form-actions">
              <button type="submit" className="button-primary">
                Recover password
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
        </div>
      </div>
    </section>
  );
}
