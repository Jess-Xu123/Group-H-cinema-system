import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import AdminNavbar from "../components/admin/AdminNavbar";
import AdminSidebar from "../components/admin/AdminSidebar";
import "../css/admin/Admin.css";

function AdminLayout() {
  const { user, isLoading } = useAuth();

  // Wait until login status is checked
  if (isLoading) {
    return <div className="admin-loading">Loading...</div>;
  }

  // Redirect users who are not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Only staff and admin can access Admin Panel
  if (!["staff", "admin"].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-layout">
      <AdminNavbar userRole={user.role} />

      <div className="admin-layout-body">
        <AdminSidebar userRole={user.role} />

        <main className="admin-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
