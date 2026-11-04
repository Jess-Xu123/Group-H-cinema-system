import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import UserSidebar from "../components/user/UserSidebar";
import "../css/user/UserLayout.css";

export default function UserLayout() {
  const { user, isLoading } = useAuth();
  const [currentLocation, setCurrentLocation] = useState("Oulu");

  if (isLoading) {
    return <div className="user-loading">Loading your account...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="user-layout">
      <Navbar
        currentLocation={currentLocation}
        onLocationChange={setCurrentLocation}
      />

      <div className="user-layout-body">
        <UserSidebar />

        <main className="user-main-content">
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  );
}