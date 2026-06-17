import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useLocalStorage } from "./hooks/useLocalStorage.jsx";
import { useSessionStorage } from "./hooks/useSessionStorage.jsx";
import { fetchAllBeneficiaries } from "./services/beneficiaryService.js";
import { getUsers } from "./services/authService.js";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Beneficiaries from "./pages/Beneficiaries.jsx";
import Called from "./pages/Called.jsx";
import PastBeneficiaries from "./pages/PastBeneficiaries.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import AdminSettings from "./pages/AdminSettings.jsx";
import Verify from "./pages/Verify.jsx";
import NotFound from "./pages/NotFound.jsx";
import "./styles/global.css";

function RequireAuth({ children, currentUser }) {
  return currentUser ? children : <Navigate to="/login" replace />;
}

function isSuperAdmin(username) {
  return (
    String(username || "")
      .trim()
      .toLowerCase() === "abdulkudus yusuf"
  );
}

function RequireAdmin({ children, currentRole, currentUser }) {
  return currentRole?.trim().toLowerCase() === "admin" &&
    isSuperAdmin(currentUser) ? (
    children
  ) : (
    <Navigate to="/" replace />
  );
}

export default function App() {
  const [beneficiaries, setBeneficiaries] = useLocalStorage(
    "ngo-beneficiaries",
    [],
  );
  const [currentUser, setCurrentUser] = useSessionStorage(
    "ngo-current-user",
    "",
  );
  const [currentRole, setCurrentRole] = useSessionStorage("ngo-user-role", "");
  const [staffUsers, setStaffUsers] = useLocalStorage("ngo-staff-users", []);

  useEffect(() => {
    fetchAllBeneficiaries()
      .then(setBeneficiaries)
      .catch((error) => {
        console.error("Failed to load beneficiaries", error);
      });
  }, [setBeneficiaries]);

  useEffect(() => {
    if (currentUser && staffUsers.length === 0) {
      getUsers()
        .then((result) => {
          if (result?.users) {
            setStaffUsers(result.users);
          }
        })
        .catch((error) => {
          console.error("Failed to load staff users", error);
        });
    }
  }, [currentUser, staffUsers.length, setStaffUsers]);

  // NOTE: sessionStorage is used for current user and role so state persists across
  // page reloads but is cleared when the tab is closed. Do not automatically
  // clear session on reload to avoid unwanted sign-outs.

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar
          currentRole={currentRole}
          currentUser={currentUser}
          onLogout={() => {
            setCurrentUser("");
            setCurrentRole("");
          }}
        />
        <main className="content-area">
          <Routes>
            <Route
              path="/"
              element={
                currentUser ? (
                  <RequireAuth currentUser={currentUser}>
                    <Dashboard
                      beneficiaries={beneficiaries}
                      currentRole={currentRole}
                    />
                  </RequireAuth>
                ) : (
                  <Login
                    currentUser={currentUser}
                    setCurrentUser={setCurrentUser}
                    setCurrentRole={setCurrentRole}
                  />
                )
              }
            />
            <Route
              path="/login"
              element={
                <Login
                  currentUser={currentUser}
                  setCurrentUser={setCurrentUser}
                  setCurrentRole={setCurrentRole}
                  setStaffUsers={setStaffUsers}
                />
              }
            />
            <Route
              path="/forgot-password"
              element={<ForgotPassword setStaffUsers={setStaffUsers} />}
            />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/register"
              element={
                <Register
                  setStaffUsers={setStaffUsers}
                  setCurrentUser={setCurrentUser}
                  setCurrentRole={setCurrentRole}
                />
              }
            />
            <Route
              path="/new"
              element={
                <RequireAuth currentUser={currentUser}>
                  <Beneficiaries
                    beneficiaries={beneficiaries}
                    setBeneficiaries={setBeneficiaries}
                    currentRole={currentRole}
                  />
                </RequireAuth>
              }
            />
            <Route
              path="/calls"
              element={
                <RequireAuth currentUser={currentUser}>
                  <Called
                    beneficiaries={beneficiaries}
                    setBeneficiaries={setBeneficiaries}
                    currentRole={currentRole}
                  />
                </RequireAuth>
              }
            />
            <Route
              path="/past"
              element={
                <RequireAuth currentUser={currentUser}>
                  <PastBeneficiaries
                    beneficiaries={beneficiaries}
                    setBeneficiaries={setBeneficiaries}
                    currentRole={currentRole}
                  />
                </RequireAuth>
              }
            />
            <Route
              path="/admin-settings"
              element={
                <RequireAdmin
                  currentRole={currentRole}
                  currentUser={currentUser}
                >
                  <AdminSettings
                    currentUser={currentUser}
                    setCurrentUser={setCurrentUser}
                    currentRole={currentRole}
                    staffUsers={staffUsers}
                    setStaffUsers={setStaffUsers}
                  />
                </RequireAdmin>
              }
            />
            <Route path="/verify" element={<Verify />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
