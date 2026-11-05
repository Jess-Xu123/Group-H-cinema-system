import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ShowtimesPage from "./pages/ShowtimesPage";
import MovieDetailPage from "./pages/MovieDetailPage";
import SeatSelectionPage from "./pages/SeatSelectionPage";
import CheckoutPage from "./pages/CheckoutPage";
import ProfilePage from "./pages/user/ProfilePage";
import OrdersPage from "./pages/user/OrdersPage";
import CouponsPage from "./pages/user/CouponsPage";
import SettingsPage from "./pages/user/SettingsPage";
import Login from "./pages/LoginPage";
import Register from "./pages/RegisterPage";

import UserLayout from "./layouts/UserLayout";

import "./index.css";

function App() {
  return (
    <Router>
      <div className="rio-app-main">
        <Routes>
          {/* Public pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/showtimes" element={<ShowtimesPage />} />
          <Route path="/movie/:id" element={<MovieDetailPage />} />
          <Route path="/seats/:showtimeId" element={<SeatSelectionPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* User account pages */}
          <Route path="/account" element={<UserLayout />}>
            <Route
              index
              element={<Navigate to="profile" replace />}
            />
            <Route
              path="profile"
              element={<ProfilePage />}
            />
            <Route
              path="orders"
              element={<OrdersPage />}
            />
            <Route
              path="coupons"
              element={<CouponsPage />}
            />
            <Route
              path="settings"
              element={<SettingsPage />}
            />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
