import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { logoutUser } from "../../api/authApi";

function AdminNavbar({ userRole }) {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="admin-navbar">
      <div className="admin-navbar-title">
        <h2>Admin Panel</h2>
      </div>

      <div className="admin-navbar-actions">
        <span className="admin-role-label">
          {userRole === "admin" ? "Owner" : "Staff"}
        </span>

        <Link to="/" className="admin-view-website">
          <i className="bi bi-box-arrow-up-right"></i>
          <span>View Website</span>
        </Link>

        <button
          type="button"
          className="admin-logout-button"
          onClick={handleLogout}
        >
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

export default AdminNavbar;
