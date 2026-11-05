import { NavLink } from "react-router-dom";

function AdminSidebar({ userRole }) {
  const menuItems = [
    { label: "Dashboard", path: "/admin", icon: "bi bi-grid" },
    { label: "Movies", path: "/admin/movies", icon: "bi bi-film" },
    { label: "Rooms & Halls", path: "/admin/halls", icon: "bi bi-building" },
    { label: "Bookings", path: "/admin/bookings", icon: "bi bi-ticket-perforated" },
    { label: "Coupons", path: "/admin/coupons", icon: "bi bi-tags" },
    { label: "Settings", path: "/admin/settings", icon: "bi bi-gear" },
  ];

  // Only Owner (admin) can manage users
  if (userRole === "admin") {
    menuItems.splice(4, 0, {
      label: "Users",
      path: "/admin/users",
      icon: "bi bi-people",
    });
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <h2>RIO Cinema</h2>
        <span>ADMIN PANEL</span>
      </div>

      <nav className="admin-sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/admin"}
            className={({ isActive }) =>
              `admin-sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <i className={item.icon}></i>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <span>
          {userRole === "admin" ? "Owner" : "Staff"}
        </span>
      </div>
    </aside>
  );
}

export default AdminSidebar;
