import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Login from "./pages/LoginPage";
import Register from "./pages/RegisterPage";
import "./index.css";

function App() {
  const [currentLocation, setCurrentLocation] = useState("Oulu");

  return (
    <Router>
      <div className="rio-app-main">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                currentLocation={currentLocation}
                onLocationChange={(newLoc) => setCurrentLocation(newLoc)}
              />
            }
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />
          
        </Routes>
      </div>
    </Router>
  );
}

export default App;
