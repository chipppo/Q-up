// src/components/Header.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./Header.css";

const Header = () => {
  const username = localStorage.getItem("username");

  return (
    <header>
      <nav>
        <Link to="/">Home</Link>
        {username ? (
          <>
            <span>Welcome, {username}!</span>
            <Link to={`/profile/${username}`}>Profile</Link>
            <Link to="/dashboard">Dashboard</Link>
            <button
              onClick={() => {
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
                localStorage.removeItem("username");
                window.location.href = "/";
              }}
            >
              Logout
            </button>
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