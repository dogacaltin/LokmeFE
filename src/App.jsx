import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";
import Giderler from "./Giderler"; 

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  return (
    <Router>
      <Routes>
        {!token ? (
          <Route path="*" element={<LoginPage onLogin={setToken} />} />
        ) : (
          <>
            <Route path="/" element={<Dashboard token={token} />} />
            <Route path="/" element={<Giderler />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;