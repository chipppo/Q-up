import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/axios";
import { AuthContext } from "../context/AuthContext.jsx";
import "./Profile.css";

function Profile() {
  const { username } = useParams();
  const [user, setUser] = useState(null); // Initialize user as null
  const [gameStats, setGameStats] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingGame, setIsAddingGame] = useState(false);
  const [gameFormData, setGameFormData] = useState({
    game_name: "",
    hours_played: "",
    rank: "",
    achievements: "",
    goals: "",
  });
  const [error, setError] = useState("");
  const [avatarFile, setAvatarFile] = useState(null); // Store the avatar file
  const { isLoggedIn, username: loggedInUsername, logout } = useContext(AuthContext);
  const navigate = useNavigate(); // Use the useNavigate hook

  const handleLogout = () => {
    logout(() => {
      navigate("/"); // Navigate to the Home page after logout
    });
  };

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

  // Handle file upload for avatar
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
    }
  };

  const handleAvatarUpload = async (e) => {
    e.preventDefault();

    if (!avatarFile) {
      alert("Please choose a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", avatarFile);

    try {
      const response = await API.post(`/user_data/${username}/upload_avatar/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Check if the response contains the updated avatar data
      if (response.data && response.data.avatar) {
        setUser((prevState) => ({
          ...prevState,
          avatar: response.data.avatar, // Update with new avatar URL
        }));

        alert("Profile picture updated successfully!");
      } else {
        alert("Failed to update avatar.");
      }
    } catch (err) {
      console.error("Failed to upload avatar:", err);
      alert("Failed to upload avatar.");
    }
  };

  const isCurrentUser = username === loggedInUsername;

  // Conditional rendering to handle user data being null
  if (!user) {
    return <div>Loading...</div>; // Show loading indicator until user data is available
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <img
          src={user.avatar || "https://via.placeholder.com/150"} // Use the updated avatar URL
          alt="Profile"
          className="avatar"
        />
        <div className="profile-info">
          <h1>{user.display_name || user.username}</h1>
          <p>@{user.username}</p>
          <p>Followers: {user.followers_count} | Following: {user.following_count}</p>
        </div>
      </div>

      <div className="profile-actions">
        {isCurrentUser ? (
          <>
            <button onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? "Cancel" : "Edit Profile"}
            </button>
            <button onClick={handleLogout}>Logout</button>
            <button onClick={() => setIsAddingGame(!isAddingGame)}>
              {isAddingGame ? "Cancel" : "Add Game Info"}
            </button>
            <form onSubmit={handleAvatarUpload}>
              <label>
                Upload New Profile Picture:
                <input type="file" accept="image/*" onChange={handleFileChange} />
              </label>
              <button type="submit">Upload Avatar</button>
            </form>
          </>
        ) : (
          <div className="profile-actions-buttons">
            <button>Add Friend</button>
            <button>Message</button>
          </div>
        )}
      </div>

      {isEditing ? (
        <EditProfile user={user} setUser={setUser} />
      ) : isAddingGame ? (
        <AddGameStatsForm
          gameFormData={gameFormData}
          setGameFormData={setGameFormData}
          handleGameSubmit={handleGameSubmit}
        />
      ) : (
        <ViewProfile user={user} gameStats={gameStats} />
      )}
    </div>
  );
}

// Add Game Stats Form Component
function AddGameStatsForm({ gameFormData, setGameFormData, handleGameSubmit }) {
  return (
    <form onSubmit={handleGameSubmit} className="add-game-form">
      <label>
        Game Name:
        <input
          type="text"
          value={gameFormData.game_name}
          onChange={(e) => setGameFormData({ ...gameFormData, game_name: e.target.value })}
        />
      </label>
      <label>
        Hours Played:
        <input
          type="number"
          value={gameFormData.hours_played}
          onChange={(e) => setGameFormData({ ...gameFormData, hours_played: e.target.value })}
        />
      </label>
      <label>
        Rank:
        <input
          type="text"
          value={gameFormData.rank}
          onChange={(e) => setGameFormData({ ...gameFormData, rank: e.target.value })}
        />
      </label>
      <label>
        Achievements:
        <input
          type="text"
          value={gameFormData.achievements}
          onChange={(e) => setGameFormData({ ...gameFormData, achievements: e.target.value })}
        />
      </label>
      <label>
        Goals:
        <input
          type="text"
          value={gameFormData.goals}
          onChange={(e) => setGameFormData({ ...gameFormData, goals: e.target.value })}
        />
      </label>
      <button type="submit">Add Game</button>
    </form>
  );
}

// View Profile Component
function ViewProfile({ user, gameStats }) {
  return (
    <div className="view-profile">
      <p>Email: {user.email || "N/A"}</p>
      <p>Timezone: {user.timezone || "Not set"}</p>
      <p>Bio: {user.bio || "No bio yet."}</p>

      <h2>Game Stats</h2>
      {gameStats.length > 0 ? (
        gameStats.map((stats) => (
          <div key={stats.id} className="game-stats">
            <h3>{stats.game_name}</h3>
            <p>Hours Played: {stats.hours_played}</p>
            <p>Rank: {stats.rank}</p>
            <p>Achievements: {stats.achievements || "None"}</p>
            <p>Goals: {stats.goals || "None"}</p>
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
    avatar: user.avatar || "",
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
    <form onSubmit={handleSubmit} className="edit-profile-form">
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
          value={formData.avatar}
          onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
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
