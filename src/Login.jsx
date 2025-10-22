import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL;

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); 

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Login failed");
      } else {
        // --- DÜZELTİLEN BÖLÜM ---
        // Artık 'data.token' yerine 'data.idToken' arıyoruz.
        if (data.idToken) {
          // 'authToken' olarak kaydetmeye devam ediyoruz, bu doğru.
          localStorage.setItem("authToken", data.idToken);
          navigate("/home");
        } else {
          // Eğer 'idToken' da gelmezse hata ver
          setError("Login successful, but no token received.");
        }
        // --- DÜZELTİLEN BÖLÜM SONU ---
      }
    } catch (err) {
      setError("Sunucuya ulaşılamıyor.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", marginTop: "100px" }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="password"
            name="password"
            placeholder="Şifre"
            value={formData.password}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <button type="submit" style={{ width: "100%", padding: "8px" }}>
          Giriş Yap
        </button>
      </form>
      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
    </div>
  );
}

export default Login;

