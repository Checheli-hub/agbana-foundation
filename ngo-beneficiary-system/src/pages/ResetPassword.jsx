import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Toast from "../components/Toast.jsx";
import { completePasswordReset } from "../services/authService.js";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.search).get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState(() => {
    const tokenValue = new URLSearchParams(location.search).get("token") || "";
    return tokenValue
      ? { message: "", variant: "success" }
      : {
          message:
            "No reset token provided. Request a new password reset email.",
          variant: "error",
        };
  });

  const resetMessages = () => {
    setToast({ message: "", variant: "success" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetMessages();

    if (!token) {
      setToast({
        message: "No reset token provided. Request a new password reset email.",
        variant: "error",
      });
      return;
    }

    if (!newPassword.trim()) {
      setToast({ message: "Enter a new password.", variant: "error" });
      return;
    }

    if (newPassword.length < 8) {
      setToast({
        message: "New password must be at least 8 characters long.",
        variant: "error",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setToast({ message: "Passwords do not match.", variant: "error" });
      return;
    }

    try {
      await completePasswordReset({ token, newPassword });
      setToast({
        message: "Password reset successfully. Redirecting to login...",
        variant: "success",
      });
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (error) {
      setToast({
        message:
          error.message ||
          "Password reset failed. Check your link or request a new reset email.",
        variant: "error",
      });
    }
  };

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Reset</p>
          <h1>Set a new password</h1>
        </div>
      </div>

      <div className="list-panel">
        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Reset your password</h2>
              <p>
                Use the password reset link sent to your email. If you do not
                have a valid link, request a new reset email from the login
                page.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="beneficiary-form">
            <label>
              New password
              <div className="password-input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter new password"
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
              Confirm new password
              <div className="password-input-group">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat new password"
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
              onClose={resetMessages}
            />

            <div className="form-actions">
              <button type="submit" className="button-primary">
                Set new password
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
