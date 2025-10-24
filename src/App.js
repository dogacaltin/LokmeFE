import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Home from "./Home";
import Dashboard from "./Dashboard";
import Planner from "./Planner";
import Giderler from "./Giderler";
import CustomThemeProvider from "./contexts/ThemeContext";

function App() {
  return (
    <CustomThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/giderler" element={<Giderler />} />
          <Route path="/planner" element={<Planner />} />
        </Routes>
      </Router>
    </CustomThemeProvider>
  );
}

export default App;