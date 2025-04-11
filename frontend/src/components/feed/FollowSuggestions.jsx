/**
 * FollowSuggestions component that displays recommended users to follow
 * 
 * This component shows a grid of suggested users that the current user
 * might want to follow. It appears on the user's own profile page and
 * includes buttons for quick following.
 * 
 * @module FollowSuggestions
 * @requires React
 * @requires react-router-dom
 * @requires material-ui/icons
 * @requires react-toastify
 * @requires AuthContext
 */
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API, { formatAvatarUrl } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import RecommendIcon from "@mui/icons-material/Recommend";
import "../../styles/components/feed/FollowSuggestions.css";

/**
 * Component that displays suggested users to follow
 * 
 * @function FollowSuggestions
 * @param {Object} props - Component props
 * @param {string} props.username - Username of the profile being viewed
 * @param {number} [props.limit=3] - Maximum number of suggestions to display
 * @returns {JSX.Element|null} The suggestions component or null if not applicable
 */
const FollowSuggestions = ({ username, limit = 3 }) => {
  const { isLoggedIn, username: currentUsername } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState({});
  const [hasMore, setHasMore] = useState(false);
  
  // Показване на предложения само за профила на влезлия потребител
  const isOwnProfile = username === currentUsername;
  const shouldFetch = isLoggedIn && isOwnProfile;

  useEffect(() => {
    /**
     * Fetches user suggestions that the current user might want to follow
     * Filters out users that are already being followed
     * 
     * @async
     * @function fetchSuggestions
     */
    const fetchSuggestions = async () => {
      if (!shouldFetch) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Засега ще използваме просто търсене, за да получим някои потребители
        // В реална имплементация бихте искали отделна крайна точка за предложения
        // базирани на взаимни последователи, подобни игри и т.н.
        const response = await API.get('/search/?query=&type=user');
        
        // Филтриране на текущия потребител и потребители, които вече са последвани
        if (response.data && Array.isArray(response.data)) {
          // Получаване на списъка на следваните от текущия потребител за филтриране
          const followingResponse = await API.get(`/users/${username}/following/`);
          const followingUsernames = followingResponse.data.map(user => user.username);
          
          const filteredUsers = response.data.filter(user => 
            user.username !== currentUsername && 
            !followingUsernames.includes(user.username)
          );
          
          setSuggestions(filteredUsers.slice(0, limit + 1));
          setHasMore(filteredUsers.length > limit);
          
          // Инициализиране на всички като неследвани
          const initialStatus = {};
          filteredUsers.forEach(user => {
            initialStatus[user.username] = false;
          });
          setFollowingStatus(initialStatus);
        }
      } catch (error) {
        console.error("Error fetching follow suggestions:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [username, currentUsername, shouldFetch, limit]);

  /**
   * Handles following a suggested user
   * Updates UI optimistically and removes the user from suggestions on success
   * 
   * @async
   * @function handleFollowToggle
   * @param {string} targetUsername - Username to follow
   */
  const handleFollowToggle = async (targetUsername) => {
    // Оптимистично обновяване
    setFollowingStatus(prev => ({
      ...prev,
      [targetUsername]: true
    }));

    try {
      await API.post(`/users/${targetUsername}/follow/`);
      toast.success(`Now following ${targetUsername}`);
      
      // Премахване от предложенията след последване
      setSuggestions(prev => prev.filter(user => user.username !== targetUsername));
    } catch (error) {
      // Връщане на предишното състояние при грешка
      setFollowingStatus(prev => ({
        ...prev,
        [targetUsername]: false
      }));
      toast.error("Failed to follow user");
    }
  };

  if (!shouldFetch || loading || suggestions.length === 0) {
    return null;
  }

  const displaySuggestions = suggestions.slice(0, limit);

  return (
    <div className="follow-suggestions-container">
      <div className="follow-suggestions-header">
        <RecommendIcon color="primary" />
        <div className="follow-suggestions-title">Suggested for you</div>
      </div>
      
      <div className="follow-suggestions-grid">
        {displaySuggestions.map(user => (
          <div className="follow-suggestion-card" key={user.id}>
            <div className="follow-suggestion-content">
              <Link to={`/profile/${user.username}`}>
                <img 
                  className="follow-suggestion-avatar"
                  src={formatAvatarUrl(user.avatar, user.username)}
                  alt={user.username}
                  onError={(e) => {
                    e.target.src = formatAvatarUrl(null, user.username);
                  }}
                />
              </Link>
              
              <Link 
                to={`/profile/${user.username}`}
                className="follow-suggestion-name"
              >
                {user.display_name || user.username}
              </Link>
              
              <div className="follow-suggestion-username">
                @{user.username}
              </div>
              
              {user.followers_count > 0 && (
                <div className="follow-suggestion-followers">
                  {user.followers_count} follower{user.followers_count !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            <div className="follow-suggestion-actions">
              <button
                className={`follow-button ${followingStatus[user.username] ? 'following' : ''}`}
                onClick={() => handleFollowToggle(user.username)}
                disabled={followingStatus[user.username]}
              >
                <PersonAddIcon fontSize="small" className="follow-icon" />
                {followingStatus[user.username] ? 'Following' : 'Follow'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {hasMore && (
        <div className="discover-more-container">
          <Link to="/search-profiles" className="discover-more-button">
            Discover more users
          </Link>
        </div>
      )}
    </div>
  );
};

export default FollowSuggestions; 