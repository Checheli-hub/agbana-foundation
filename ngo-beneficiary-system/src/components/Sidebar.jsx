import { NavLink, useNavigate } from "react-router-dom";

const navItems = [
  { label: "Dashboard", path: "/" },
  { label: "New Beneficiaries", path: "/new" },
  { label: "Past Beneficiaries", path: "/past" },
  { label: "Call Log", path: "/calls" },
  { label: "Login", path: "/login" },
];

export default function Sidebar({ currentRole, currentUser, onLogout }) {
  const navigate = useNavigate();

  const formatDisplayName = (name) =>
    String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) =>
        word.length > 0
          ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`
          : "",
      )
      .join(" ");

  const isSuperAdmin = (username) =>
    String(username || "")
      .trim()
      .toLowerCase() === "abdulkudus yusuf";

  const displayUser = formatDisplayName(currentUser);
  const showAdminSettings =
    currentRole?.trim().toLowerCase() === "admin" && isSuperAdmin(currentUser);

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">NGO</span>
        <div>
          <strong>Agbana Foundation</strong>
          <p>Beneficiary management</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            {item.label}
          </NavLink>
        ))}
        {showAdminSettings && (
          <NavLink
            to="/admin-settings"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Admin settings
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <p>Secure local reporting tool.</p>
        <p className="sidebar-role">
          Role: <strong>{currentRole || "Guest"}</strong>
        </p>
        {currentUser && (
          <>
            <p className="sidebar-role">
              Signed in as: <strong>{displayUser}</strong>
            </p>
            <button
              type="button"
              className="button-secondary button-small"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
