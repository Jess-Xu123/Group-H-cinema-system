
import { Link } from "react-router-dom";

function AdminNavbar({ userRole }) {
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
      </div>
    </header>
  );
}

export default AdminNavbar;
