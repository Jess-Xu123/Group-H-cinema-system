import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../css/user/UserSidebar.css";

export default function UserSidebar() {
  const { user, setUser } = useAuth();

  const fullName = user?.full_name || "Rio Member";

  const menuItems = [
    { label: "Profile", path: "/account/profile", icon: "♙" },
    { label: "Orders", path: "/account/orders", icon: "▣" },
    {
      label: "Coupons & loyalty",
      path: "/account/coupons",
      icon: "♔",
    },
    { label: "Settings", path: "/account/settings", icon: "⚙" },
  ];

  return (
    <aside className="user-sidebar">
      <div className="user-sidebar-heading">
        <span className="user-sidebar-eyebrow">MY RIO</span>
        <h2>{fullName}</h2>
        <p>Rio member · Since 2025</p>
      </div>

      <nav className="user-sidebar-nav" aria-label="My account">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `user-sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <span className="user-sidebar-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="user-sidebar-note">
        <h3>A place that is yours.</h3>
        <p>
          From our family to your favourite seat. Thank you for being part of
          Rio.
        </p>
      </div>

    </aside>
  );
}