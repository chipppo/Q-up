// src/components/Header.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import { useAuth } from "../context/AuthContext.jsx";
import "./Header.css";

const Header = () => {
  const { isLoggedIn, username, logout } = useAuth();
  const navigate = useNavigate(); // Use the useNavigate hook

  const handleLogout = () => {
    logout(() => {
      navigate("/"); // Navigate to the Home page after logout
    });
  };

  console.log("Header - Current username:", username); // Debugging

  return (
    <header>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/search-profiles">Find Players</Link>
        {isLoggedIn ? (
          <>
            <span>Welcome, {username || "User"}!</span>
            {username && <Link to={`/profile/${username}`}>Profile</Link>}
            <Link to="/feed">Feed</Link>
            <Link to="/dashboard">Dashboard</Link>
            <button onClick={handleLogout}>Logout</button> {/* Use handleLogout */}
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;