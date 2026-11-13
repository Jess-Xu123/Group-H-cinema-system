import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";

import HomePage from "./pages/customer/HomePage";
import ShowtimesPage from "./pages/customer/ShowtimesPage";
import MoviesPage from "./pages/customer/MoviesPage";
import MovieDetailPage from "./pages/customer/MovieDetailPage";
import SeatSelectionPage from "./pages/customer/SeatSelectionPage";
import CheckoutPage from "./pages/customer/CheckoutPage";

import ProfilePage from "./pages/user/ProfilePage";
import OrdersPage from "./pages/user/OrdersPage";
import CouponsPage from "./pages/user/CouponsPage";
import SettingsPage from "./pages/user/SettingsPage";

import Login from "./pages/customer/LoginPage";
import Register from "./pages/customer/RegisterPage";
import BookingSuccessPage from "./pages/user/BookingSuccessPage";

import DashboardPage from "./pages/admin/DashboardPage";
import AdminMoviesPage from "./pages/admin/MoviesPage";
import HallsPage from "./pages/admin/HallsPage";
import UsersPage from "./pages/admin/UsersPage";
import SettingPage from "./pages/admin/SettingPage";
import BookingsPage from "./pages/admin/BookingsPage";
import AdminShowtimesPage from "./pages/admin/AdminShowtimesPage";

import UserLayout from "./layouts/UserLayout";
import AdminLayout from "./layouts/AdminLayout";

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
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/seats/:showtimeId" element={<SeatSelectionPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/booking-success" element={<BookingSuccessPage />} />

          {/* User account pages */}
          <Route path="/account" element={<UserLayout />}>
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Admin pages */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="movies" element={<AdminMoviesPage />} />
            <Route path="halls" element={<HallsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<SettingPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="showtimes" element={<AdminShowtimesPage />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
