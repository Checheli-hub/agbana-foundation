import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Toast from "../components/Toast.jsx";
import { signIn } from "../services/authService.js";

export default function Login({
  currentUser,
  setCurrentUser,
  setCurrentRole,
  setStaffUsers,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedRole, setSelectedRole] = useState("User");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("verified") === "1"
      ? {
          message: "Your email has been verified. Please sign in.",
          variant: "success",
        }
      : { message: "", variant: "success" };
  });

  useEffect(() => {
    if (currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, navigate]);

  const resetMessages = () => {
    setToast({ message: "", variant: "success" });
  };

  const handleRoleChange = (nextRole) => {
    setSelectedRole(nextRole);
    resetMessages();
    setPassword("");
    setShowPassword(false);
    setUsername("");
    setEmail("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetMessages();

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedUsername) {
      setToast({ message: "Please enter your username.", variant: "error" });
      return;
    }

    if (!trimmedEmail) {
      setToast({ message: "Please enter your email.", variant: "error" });
      return;
    }

    if (!password) {
      setToast({ message: "Please enter your password.", variant: "error" });
      return;
    }

    if (password.length < 8) {
      setToast({
        message: "Password must be at least 8 characters long.",
        variant: "error",
      });
      return;
    }

    try {
      const result = await signIn({
        username: trimmedUsername,
        email: trimmedEmail,
        password,
        role: selectedRole,
      });

      setCurrentUser(result.username);
      setCurrentRole(result.role || selectedRole);
      if (result.users && setStaffUsers) {
        setStaffUsers(result.users);
      }
      setToast({
        message: `Signed in successfully. A toast notification will confirm your login.`,
        variant: "success",
      });
      setPassword("");
      setShowPassword(false);
      window.setTimeout(() => navigate("/", { replace: true }), 900);
    } catch (error) {
      setToast({
        message: error.message || "Invalid credentials. Please try again.",
        variant: "error",
      });
    }
  };

  const handleForgotPassword = () => {
    resetMessages();
    navigate("/forgot-password", {
      state: { fromLogin: true, role: selectedRole },
    });
  };

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Sign in</p>
          <h1>Secure access</h1>
        </div>
      </div>

      <div className="list-panel">
        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Log in to continue</h2>
              <p>
                Enter your username, select your role, and provide your password
                before accessing the beneficiary system.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="beneficiary-form"
            autoComplete="off"
          >
            <div className="role-switch-group">
              <button
                type="button"
                className={
                  selectedRole === "User"
                    ? "button-primary"
                    : "button-secondary"
                }
                onClick={() => handleRoleChange("User")}
              >
                User
              </button>
              <button
                type="button"
                className={
                  selectedRole === "Admin"
                    ? "button-primary"
                    : "button-secondary"
                }
                onClick={() => handleRoleChange("Admin")}
              >
                Admin
              </button>
            </div>

            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter username"
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

            <label className="password-field-label">
              {selectedRole} password
              <div className="password-input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
                {password && (
                  <button
                    type="button"
                    className="input-icon-button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <span
                      className={showPassword ? "icon-eye-off" : "icon-eye"}
                    >
                      {showPassword ? "✕" : "•"}
                    </span>
                  </button>
                )}
              </div>
            </label>

            <Toast
              message={toast.message}
              variant={toast.variant}
              onClose={resetMessages}
            />

            <div className="form-actions">
              <button type="submit" className="button-primary">
                Sign in
              </button>
              {selectedRole === "User" && (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => navigate("/register")}
                >
                  Register
                </button>
              )}
              <button
                type="button"
                className="button-secondary"
                onClick={handleForgotPassword}
              >
                Forgot password?
              </button>
            </div>
          </form>

          <div className="section-note">
            <p>
              Admin can add, edit, and delete beneficiaries. User can view the
              flow and mark calls and attendance.
            </p>
            <p className="field-note">
              Password recovery is available for both Admin and User accounts.
              Enter your registered Gmail address to reset your password.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
