import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
