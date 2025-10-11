import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Import all your page components
import Login from "./Login";
import Home from "./Home";
import Giderler from "./Giderler";
import Dashboard from "./Dashboard";

/**
 * A wrapper component to protect routes that require authentication.
 * It checks for the auth token in localStorage. If the token exists,
 * it renders the requested page. Otherwise, it redirects to the login page.
 */
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("authToken");
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* ================= PUBLIC ROUTE ================= */}
        {/* The login page is the root and is accessible to everyone. */}
        <Route path="/" element={<Login />} />

        {/* ================= PRIVATE ROUTES ================= */}
        {/* These routes are protected. You can only access them after logging in. */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/giderler"
          element={
            <PrivateRoute>
              <Giderler />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* ================= CATCH-ALL ================= */}
        {/* If a user tries to access any other URL, redirect them to the login page. */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
