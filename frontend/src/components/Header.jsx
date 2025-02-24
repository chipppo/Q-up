// src/components/Header.jsx
import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx"; // Correct import
import "./Header.css";

const Header = () => {
  const { isLoggedIn, username, logout } = useContext(AuthContext);

  return (
    <header>
      <nav>
        <Link to="/">Home</Link>
        {isLoggedIn ? (
          <>
            <span>Welcome, {username}!</span>
            <Link to={`/profile/${username}`}>Profile</Link>
            <Link to="/dashboard">Dashboard</Link>
            <button onClick={logout}>Logout</button>
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