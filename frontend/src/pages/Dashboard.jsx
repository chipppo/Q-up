// src/pages/Dashboard.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
  const { username } = useAuth();

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>
      <nav>
        <Link to={`/profile/${username}`}>Profile</Link>
        <Link to="/search">Search</Link>
        <Link to="/feed">Feed</Link>
        <Link to="/messages">Messages</Link>
        <Link to="/create-post">Create Post</Link>
      </nav>
      <div className="dashboard-summary">
        <h2>Welcome back, {username}!</h2>
        <p>Recent activity:</p>
        {/* Add recent activity here */}
      </div>
    </div>
  );
}

export default Dashboard;