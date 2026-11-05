import { Outlet } from "react-router-dom";
import AdminNavbar from "../components/admin/AdminNavbar";
import AdminSidebar from "../components/admin/AdminSidebar";
import "../css/admin/Admin.css";

function AdminLayout() {
  // Temporary role for layout testing.
  // We will connect this to AuthContext later.
  const userRole = "admin";

  return (
    <div className="admin-layout">
      <AdminNavbar userRole={userRole} />

      <div className="admin-layout-body">
        <AdminSidebar userRole={userRole} />

        <main className="admin-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;

