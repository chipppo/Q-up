// src/pages/Profile.jsx
import { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import API from "../api/axios";
import { AuthContext } from "../context/AuthContext.jsx"; // Import AuthContext
import "./Profile.css";

function Profile() {
  const { username } = useParams(); // Get username from the URL
  const [user, setUser] = useState(null);
  const [gameStats, setGameStats] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const { isLoggedIn, username: loggedInUsername } = useContext(AuthContext); // Get logged-in user info

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await API.get(`/user_data/${username}/`);
        setUser(response.data);
      } catch (err) {
        setError("Failed to fetch user data.");
      }
    };
    fetchUser();
  }, [username]);

  // Fetch game stats
  useEffect(() => {
    const fetchGameStats = async () => {
      try {
        const response = await API.get(`/user_data/${username}/game_stats/`);
        setGameStats(response.data);
      } catch (err) {
        console.error("Failed to fetch game stats.");
      }
    };
    fetchGameStats();
  }, [username]);

  if (error) return <p>{error}</p>;
  if (!user) return <p>Loading...</p>;

  const isCurrentUser = username === loggedInUsername; // Check if the profile belongs to the logged-in user

  return (
    <div className="profile-container">
      <h1>{user.display_name || user.username}</h1>
      <img src={user.avatar_url || "https://via.placeholder.com/150"} alt="Profile" />
      <p>Followers: {user.followers_count}</p>
      <p>Following: {user.following_count}</p>

      {isCurrentUser ? ( // Show Edit Profile button for the logged-in user
        <button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? "Cancel" : "Edit Profile"}
        </button>
      ) : ( // Show Add Friend and Message buttons for other profiles
        <div>
          <button>Add Friend</button>
          <button>Message</button>
        </div>
      )}

      {isEditing ? (
        <EditProfile user={user} setUser={setUser} />
      ) : (
        <ViewProfile user={user} gameStats={gameStats} />
      )}
    </div>
  );
}

// View Profile Component
function ViewProfile({ user, gameStats }) {
  return (
    <div>
      <p>Email: {user.email}</p>
      <p>Timezone: {user.timezone}</p>
      <p>Bio: {user.bio || "No bio yet."}</p>
      <h2>Game Stats</h2>
      {gameStats.length > 0 ? (
        gameStats.map((stats) => (
          <div key={stats.id}>
            <h3>{stats.game.name}</h3>
            <p>Hours Played: {stats.hours_played}</p>
            <p>Rank: {stats.rank}</p>
            <p>Achievements: {JSON.stringify(stats.achievements)}</p>
            <p>Goals: {stats.goals}</p>
          </div>
        ))
      ) : (
        <p>No game stats available.</p>
      )}
    </div>
  );
}

// Edit Profile Component
function EditProfile({ user, setUser }) {
  const [formData, setFormData] = useState({
    display_name: user.display_name || "",
    avatar_url: user.avatar_url || "",
    bio: user.bio || "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await API.patch(`/user_data/${user.username}/update/`, formData);
      setUser(response.data);
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Failed to update profile.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Display Name:
        <input
          type="text"
          value={formData.display_name}
          onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
        />
      </label>
      <label>
        Avatar URL:
        <input
          type="url"
          value={formData.avatar_url}
          onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
        />
      </label>
      <label>
        Bio:
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
        />
      </label>
      <button type="submit">Save Changes</button>
    </form>
  );
}

export default Profile;