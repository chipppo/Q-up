import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/axios";
import "./Login.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await API.post("/login/", { username, password });
      console.log("Login Response:", response.data);  // Debugging
      localStorage.setItem("access", response.data.access);  // Store access token
      localStorage.setItem("refresh", response.data.refresh);  // Store refresh token
      localStorage.setItem("username", username);  // Store username
      alert("Login Successful!");
      navigate("/dashboard");
    } catch (err) {
      console.error("Login Error:", err.response?.data || err.message);  // Debugging
      setError("Invalid credentials! Please try again.");
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      <p>
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
}

export default Login;