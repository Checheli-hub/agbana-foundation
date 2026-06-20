import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast.jsx";
import { getUsers } from "../services/authService.js";
import {
  createAdmin,
  demoteUser,
  promoteUser,
  updateUserAccount,
  approveUser,
  disapproveUser,
  deleteUser,
  restoreUser,
} from "../services/authService.js";
import {
  findStaffUser,
  isEmailTaken,
  isUsernameTaken,
} from "../services/userService.js";

export default function AdminSettings({
  currentUser,
  setCurrentUser,
  currentRole,
  staffUsers,
  setStaffUsers,
}) {
  const currentUsername =
    currentUser && typeof currentUser === "object"
      ? currentUser.username
      : currentUser;
  const navigate = useNavigate();
  const [toast, setToast] = useState({ message: "", variant: "success" });
  const [loadingStaffUsers, setLoadingStaffUsers] = useState(
    !staffUsers.length,
  );
  const [recentlyDisapproved, setRecentlyDisapproved] = useState(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState(null);
  const deleteTimerRef = useRef(null);
  const undoAdminRef = useRef(null);
  const currentAdmin = findStaffUser(staffUsers, {
    username: currentUsername,
    role: "Admin",
  });
  const [updatedUsername, setUpdatedUsername] = useState("");
  const [updatedEmail, setUpdatedEmail] = useState("");
  const [updatedPassword, setUpdatedPassword] = useState("");
  const [confirmUpdatedPassword, setConfirmUpdatedPassword] = useState("");
  const [showUpdatedPassword, setShowUpdatedPassword] = useState(false);
  const [showConfirmUpdatedPassword, setShowConfirmUpdatedPassword] =
    useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmNewAdminPassword, setConfirmNewAdminPassword] = useState("");
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [showConfirmNewAdminPassword, setShowConfirmNewAdminPassword] =
    useState(false);

  useEffect(() => {
    if (
      !currentUsername ||
      currentRole?.trim().toLowerCase() !== "admin" ||
      currentUser?.isSuperAdmin !== true
    ) {
      navigate("/", { replace: true });
      return;
    }

    const loadStaffUsers = async () => {
      if (staffUsers.length === 0) {
        setLoadingStaffUsers(true);
        try {
          const result = await getUsers();
          if (result?.users) {
            setStaffUsers(result.users);
          }
        } catch (error) {
          console.error("Failed to load staff users", error);
        } finally {
          setLoadingStaffUsers(false);
        }
      }
    };

    loadStaffUsers();
  }, [currentUser, currentRole, navigate, setStaffUsers, staffUsers.length]);

  useEffect(() => {
    if (!currentAdmin) return;

    const syncAdminData = async () => {
      setUpdatedUsername(currentAdmin.username);
      setUpdatedEmail(currentAdmin.email);
    };

    syncAdminData();
  }, [currentAdmin]);

  const resetToast = () => setToast({ message: "", variant: "success" });

  const handleMainAdminSubmit = async (event) => {
    event.preventDefault();
    resetToast();

    if (!currentAdmin) {
      setToast({
        message: "Unable to update admin settings. Please sign in again.",
        variant: "error",
      });
      return;
    }

    const trimmedUsername = updatedUsername.trim();
    if (!trimmedUsername) {
      setToast({
        message: "Admin username cannot be empty.",
        variant: "error",
      });
      return;
    }

    const trimmedEmail = updatedEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setToast({ message: "Enter a valid admin email.", variant: "error" });
      return;
    }

    if (
      trimmedUsername.toLowerCase() !== currentAdmin.username.toLowerCase() &&
      isUsernameTaken(staffUsers, trimmedUsername, currentAdmin.username)
    ) {
      setToast({
        message: "That username is already in use by another user.",
        variant: "error",
      });
      return;
    }

    if (
      trimmedEmail !== currentAdmin.email.toLowerCase() &&
      isEmailTaken(staffUsers, trimmedEmail, currentAdmin.email)
    ) {
      setToast({
        message: "That email is already in use by another account.",
        variant: "error",
      });
      return;
    }

    if (updatedPassword && updatedPassword.length < 8) {
      setToast({
        message: "New password must be at least 8 characters long.",
        variant: "error",
      });
      return;
    }

    if (updatedPassword && updatedPassword !== confirmUpdatedPassword) {
      setToast({ message: "New passwords do not match.", variant: "error" });
      return;
    }

    try {
      const response = await updateUserAccount(currentAdmin.username, {
        username: trimmedUsername,
        email: trimmedEmail,
        ...(updatedPassword ? { password: updatedPassword } : {}),
      });

      setStaffUsers(response.users);
      if (trimmedUsername !== currentAdmin.username) {
        setCurrentUser({
        username: trimmedUsername,
        isSuperAdmin: currentUser?.isSuperAdmin === true,
      });
      }
      setUpdatedPassword("");
      setConfirmUpdatedPassword("");
      setToast({ message: "Admin settings updated.", variant: "success" });
    } catch (error) {
      setToast({
        message: error.message || "Unable to update admin settings.",
        variant: "error",
      });
    }
  };

  const handleAddAdmin = async (event) => {
    event.preventDefault();
    resetToast();

    const trimmedUsername = newAdminUsername.trim();
    const trimmedEmail = newAdminEmail.trim().toLowerCase();

    if (!trimmedUsername) {
      setToast({
        message: "Enter a username for the new admin.",
        variant: "error",
      });
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setToast({
        message: "Enter a valid email for the new admin.",
        variant: "error",
      });
      return;
    }

    if (!newAdminPassword) {
      setToast({
        message: "Enter a password for the new admin.",
        variant: "error",
      });
      return;
    }

    if (newAdminPassword.length < 8) {
      setToast({
        message: "Admin password must be at least 8 characters long.",
        variant: "error",
      });
      return;
    }

    if (newAdminPassword !== confirmNewAdminPassword) {
      setToast({ message: "Passwords do not match.", variant: "error" });
      return;
    }

    if (trimmedUsername.toLowerCase() === "admin") {
      setToast({
        message: "The username 'admin' is reserved.",
        variant: "error",
      });
      return;
    }

    try {
      const response = await createAdmin({
        username: trimmedUsername,
        email: trimmedEmail,
        password: newAdminPassword,
      });
      setStaffUsers(response.users);
      setNewAdminUsername("");
      setNewAdminEmail("");
      setNewAdminPassword("");
      setConfirmNewAdminPassword("");
      setToast({
        message: "New admin account created successfully.",
        variant: "success",
      });
    } catch (error) {
      setToast({
        message: error.message || "Unable to create new admin account.",
        variant: "error",
      });
    }
  };

  const handlePromoteUser = async (username) => {
    resetToast();
    try {
      const response = await promoteUser(username);
      setStaffUsers(response.users);
      setToast({
        message: `${username} has been promoted to Admin.`,
        variant: "success",
      });
    } catch (error) {
      setToast({
        message: error.message || "Unable to promote user.",
        variant: "error",
      });
    }
  };

  const handleApproveUser = async (username, email) => {
    resetToast();
    try {
      const response = await approveUser(username, email);
      setStaffUsers(response.users);
      setToast({ message: `${username} approved.`, variant: "success" });
    } catch (error) {
      setToast({
        message: error.message || "Unable to approve user.",
        variant: "error",
      });
    }
  };

  const handleDisapproveUser = async (username, email) => {
    resetToast();
    try {
      const response = await disapproveUser(username, email);
      setStaffUsers(response.users);
      setToast({ message: `${username} disapproved.`, variant: "success" });

      if (recentlyDisapproved && recentlyDisapproved.timeoutId) {
        clearTimeout(recentlyDisapproved.timeoutId);
      }
      const timeoutId = window.setTimeout(() => {
        setRecentlyDisapproved(null);
      }, 60000);
      setRecentlyDisapproved({ username, email, timeoutId });
    } catch (error) {
      setToast({
        message: error.message || "Unable to disapprove user.",
        variant: "error",
      });
    }
  };

  const handleDeleteUser = async (username) => {
    resetToast();
    try {
      // Find the full user object so we can restore locally if needed
      const deletedUser = staffUsers.find((u) => u.username === username);

      // Optimistically remove from UI
      setStaffUsers((prev) => prev.filter((u) => u.username !== username));

      // Keep a local undo reference and schedule clearing
      undoAdminRef.current = deletedUser || { username };
      if (deleteTimerRef.current) {
        window.clearTimeout(deleteTimerRef.current);
      }

      // Call backend delete (fire-and-forget); UI already updated
      deleteUser(username).catch((err) =>
        console.error("Backend delete failed", err),
      );

      // Show toast with Undo action
      setToast({
        message: `${username} deleted. Undo is available for 60 seconds.`,
        variant: "warning",
        actionLabel: "Undo",
        onAction: () => handleUndoDelete(),
      });

      deleteTimerRef.current = window.setTimeout(() => {
        undoAdminRef.current = null;
        deleteTimerRef.current = null;
      }, 60000);
    } catch (error) {
      setToast({
        message: error.message || "Unable to delete user.",
        variant: "error",
      });
    }
  };

  const handleUndoDisapprove = async () => {
    resetToast();
    try {
      const { username, email } = recentlyDisapproved || {};
      const response = await approveUser(username, email);
      setStaffUsers(response.users);
      setToast({
        message: `${username} restored to approved.`,
        variant: "success",
      });
      if (recentlyDisapproved && recentlyDisapproved.timeoutId) {
        clearTimeout(recentlyDisapproved.timeoutId);
      }
      setRecentlyDisapproved(null);
    } catch (error) {
      setToast({
        message: error.message || "Unable to undo disapproval.",
        variant: "error",
      });
    }
  };

  const handleRestoreUser = async (username) => {
    resetToast();
    try {
      const response = await restoreUser(username);
      const restoredUsers = response?.users?.length
        ? response.users
        : (await getUsers())?.users || [];
      setStaffUsers(restoredUsers);
      setToast({ message: `${username} restored.`, variant: "success" });
      if (recentlyDeleted && recentlyDeleted.timeoutId) {
        clearTimeout(recentlyDeleted.timeoutId);
      }
      setRecentlyDeleted(null);
    } catch (error) {
      setToast({
        message: error.message || "Unable to restore user.",
        variant: "error",
      });
    }
  };

  const handleDemoteAdmin = async (username) => {
    resetToast();
    try {
      const response = await demoteUser(username);
      setStaffUsers(response.users);
      setToast({ message: `${username} demoted.`, variant: "success" });
    } catch (error) {
      setToast({
        message: error.message || "Unable to demote user.",
        variant: "error",
      });
    }
  };
  const handleUndoDelete = async () => {
    if (!undoAdminRef.current) return;
    const restored = undoAdminRef.current;
    undoAdminRef.current = null;
    if (deleteTimerRef.current) {
      window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }

    // Restore in UI immediately
    setStaffUsers((prev) => [restored, ...prev]);
    setToast({ message: `${restored.username} restored.`, variant: "success" });

    // Attempt backend restore (best-effort)
    try {
      restoreUser(restored.username).catch((err) =>
        console.error("Backend restore failed", err),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const adminUsers = staffUsers.filter(
    (user) => user.role?.toLowerCase() === "admin",
  );
  const userAccounts = staffUsers.filter(
    (user) => user.role?.toLowerCase() === "user",
  );

  if (
    !currentUsername ||
    currentRole !== "Admin" ||
    currentUser?.isSuperAdmin !== true
  ) {
    return null;
  }

  if (loadingStaffUsers) {
    return (
      <section className="page-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Admin settings</h1>
          </div>
        </div>
        <div className="list-panel">
          <div className="section-panel">
            <p>Loading admin settings...</p>
          </div>
        </div>
      </section>
    );
  }

  if (currentRole !== "Admin") {
    return null;
  }

  if (!currentAdmin) {
    return (
      <section className="page-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Admin settings</h1>
          </div>
        </div>
        <div className="list-panel">
          <div className="section-panel">
            <p>
              Unable to load your admin profile. Please refresh the page or sign
              out and sign in again.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Admin settings</h1>
        </div>
      </div>

      <div className="list-panel">
        {recentlyDeleted && (
          <div
            className="section-panel delete-banner"
            style={{ marginBottom: 12 }}
          >
            <div className="section-header">
              <div>
                <h3>User deleted</h3>
                <p>
                  {recentlyDeleted.username} was deleted. Undo within 60 seconds
                  to keep the account.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="button-warning button-small"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRestoreUser(recentlyDeleted.username);
                  }}
                >
                  Undo delete
                </button>
              </div>
            </div>
          </div>
        )}
        {recentlyDisapproved && (
          <div
            className="section-panel warning-banner"
            style={{ marginBottom: 12 }}
          >
            <div className="section-header">
              <div>
                <h3>User disapproved</h3>
                <p>
                  {recentlyDisapproved.username} was disapproved. Undo within 60
                  seconds if this was a mistake.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="button-secondary button-small"
                  onClick={() =>
                    handleUndoDisapprove(recentlyDisapproved.username)
                  }
                >
                  Undo disapproval
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Admin account</h2>
              <p>Update your admin email and password from here.</p>
            </div>
          </div>

          <form onSubmit={handleMainAdminSubmit} className="beneficiary-form">
            <label>
              Main admin username
              <input
                type="text"
                value={updatedUsername}
                onChange={(event) => setUpdatedUsername(event.target.value)}
                placeholder="Enter admin username"
                autoComplete="username"
              />
            </label>

            <label>
              Main admin email
              <input
                type="email"
                value={updatedEmail}
                onChange={(event) => setUpdatedEmail(event.target.value)}
                placeholder="Enter admin email"
                autoComplete="email"
              />
            </label>

            <label>
              New admin password
              <div className="password-input-group">
                <input
                  type={showUpdatedPassword ? "text" : "password"}
                  value={updatedPassword}
                  onChange={(event) => setUpdatedPassword(event.target.value)}
                  placeholder="Enter new admin password"
                  autoComplete="new-password"
                  minLength={8}
                />
                <button
                  type="button"
                  className="input-icon-button"
                  onClick={() => setShowUpdatedPassword((prev) => !prev)}
                  aria-label={
                    showUpdatedPassword ? "Hide password" : "Show password"
                  }
                  title={
                    showUpdatedPassword ? "Hide password" : "Show password"
                  }
                >
                  <span
                    className={
                      showUpdatedPassword ? "icon-eye-off" : "icon-eye"
                    }
                  >
                    {showUpdatedPassword ? "✕" : "•"}
                  </span>
                </button>
              </div>
            </label>

            <label>
              Confirm new password
              <div className="password-input-group">
                <input
                  type={showConfirmUpdatedPassword ? "text" : "password"}
                  value={confirmUpdatedPassword}
                  onChange={(event) =>
                    setConfirmUpdatedPassword(event.target.value)
                  }
                  placeholder="Confirm new admin password"
                  autoComplete="new-password"
                  minLength={8}
                />
                <button
                  type="button"
                  className="input-icon-button"
                  onClick={() => setShowConfirmUpdatedPassword((prev) => !prev)}
                  aria-label={
                    showConfirmUpdatedPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  title={
                    showConfirmUpdatedPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  <span
                    className={
                      showConfirmUpdatedPassword ? "icon-eye-off" : "icon-eye"
                    }
                  >
                    {showConfirmUpdatedPassword ? "✕" : "•"}
                  </span>
                </button>
              </div>
            </label>

            <Toast
              message={toast.message}
              variant={toast.variant}
              actionLabel={toast.actionLabel}
              onAction={toast.onAction}
              onClose={resetToast}
            />

            <div className="form-actions">
              <button type="submit" className="button-primary">
                Update main admin
              </button>
            </div>
          </form>
        </div>

        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Add admin user</h2>
              <p>Create an admin account that you can manage.</p>
            </div>
          </div>

          <form onSubmit={handleAddAdmin} className="beneficiary-form">
            <label>
              Username
              <input
                type="text"
                value={newAdminUsername}
                onChange={(event) => setNewAdminUsername(event.target.value)}
                placeholder="Admin username"
                autoComplete="username"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={newAdminEmail}
                onChange={(event) => setNewAdminEmail(event.target.value)}
                placeholder="Admin email"
                autoComplete="email"
              />
            </label>

            <label>
              Password
              <div className="password-input-group">
                <input
                  type={showNewAdminPassword ? "text" : "password"}
                  value={newAdminPassword}
                  onChange={(event) => setNewAdminPassword(event.target.value)}
                  placeholder="Admin password"
                  autoComplete="new-password"
                  minLength={8}
                />
                <button
                  type="button"
                  className="input-icon-button"
                  onClick={() => setShowNewAdminPassword((prev) => !prev)}
                  aria-label={
                    showNewAdminPassword ? "Hide password" : "Show password"
                  }
                  title={
                    showNewAdminPassword ? "Hide password" : "Show password"
                  }
                >
                  <span
                    className={
                      showNewAdminPassword ? "icon-eye-off" : "icon-eye"
                    }
                  >
                    {showNewAdminPassword ? "✕" : "•"}
                  </span>
                </button>
              </div>
            </label>

            <label>
              Confirm password
              <div className="password-input-group">
                <input
                  type={showConfirmNewAdminPassword ? "text" : "password"}
                  value={confirmNewAdminPassword}
                  onChange={(event) =>
                    setConfirmNewAdminPassword(event.target.value)
                  }
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  minLength={8}
                />
                <button
                  type="button"
                  className="input-icon-button"
                  onClick={() =>
                    setShowConfirmNewAdminPassword((prev) => !prev)
                  }
                  aria-label={
                    showConfirmNewAdminPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  title={
                    showConfirmNewAdminPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  <span
                    className={
                      showConfirmNewAdminPassword ? "icon-eye-off" : "icon-eye"
                    }
                  >
                    {showConfirmNewAdminPassword ? "✕" : "•"}
                  </span>
                </button>
              </div>
            </label>

            <div className="form-actions">
              <button type="submit" className="button-primary">
                Add admin
              </button>
            </div>
          </form>
        </div>

        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Promote users</h2>
              <p>Promote existing staff users to admin when needed.</p>
            </div>
          </div>

          {userAccounts.length ? (
            <div className="admin-list">
              {userAccounts.map((user) => (
                <div key={user.username} className="admin-row">
                  <div>
                    <strong>{user.username}</strong>
                    <p>{user.email}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="button-primary button-danger button-small"
                      onClick={() => handleDeleteUser(user.username)}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="button-secondary button-small"
                      onClick={() => handlePromoteUser(user.username)}
                    >
                      Promote
                    </button>
                    {!user.isApproved ? (
                      <button
                        type="button"
                        className="button-primary button-small"
                        onClick={() => handleApproveUser(user.username, user.email)}
                      >
                        Approve
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button-secondary button-small"
                        onClick={() => handleDisapproveUser(user.username, user.email)}
                      >
                        Disapprove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No staff users available to promote.</p>
          )}
        </div>

        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Existing admins</h2>
              <p>These admin accounts can sign in as Admin.</p>
            </div>
          </div>

          {adminUsers.length ? (
            <div className="admin-list">
              {adminUsers.map((user) => (
                <div key={user.username} className="admin-row">
                  <div>
                    <strong>{user.username}</strong>
                    <p>{user.email}</p>
                  </div>
                  {user.username !== currentUsername && (
                    <button
                      type="button"
                      className="button-secondary button-small"
                      onClick={() => handleDemoteAdmin(user.username)}
                    >
                      Demote
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p>No additional admin accounts registered yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
