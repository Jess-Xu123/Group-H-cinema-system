import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ShowtimesPage from "./pages/ShowtimesPage";
import MovieDetailPage from "./pages/MovieDetailPage";
import SeatSelectionPage from "./pages/SeatSelectionPage";
import CheckoutPage from "./pages/CheckoutPage";
import Login from "./pages/LoginPage";
import Register from "./pages/RegisterPage";
import "./index.css";

function App() {
  return (
    <Router>
      <div className="rio-app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/showtimes" element={<ShowtimesPage />} />
          <Route path="/movie/:id" element={<MovieDetailPage />} />
          <Route path="/seats/:showtimeId" element={<SeatSelectionPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
