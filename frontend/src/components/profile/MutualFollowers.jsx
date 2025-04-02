/**
 * MutualFollowers component that displays connections shared between users
 * 
 * This component shows users that both the profile owner and current logged-in user follow.
 * It helps build connections by highlighting mutual relationships and only shows up
 * when viewing someone else's profile while logged in.
 *  
 * @module MutualFollowers
 * @requires React
 * @requires react-router-dom
 * @requires material-ui/icons
 * @requires AuthContext
 */
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import PeopleIcon from "@mui/icons-material/People";
import "../../styles/components/profile/MutualFollowers.css";

/**
 * Shows a list of users that both the current user and profile user follow
 * 
 * @function MutualFollowers
 * @param {Object} props - Component props
 * @param {string} props.username - Username of the profile being viewed
 * @returns {JSX.Element|null} The mutual followers list or null if not applicable
 */
const MutualFollowers = ({ username }) => {
  const { isLoggedIn, username: currentUsername } = useAuth();
  const [mutualFollowers, setMutualFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  
  // Без извличане на взаимни последователи, ако преглеждате собствения си профил или не сте влезли
  const shouldFetch = isLoggedIn && username !== currentUsername;

  useEffect(() => {
    /**
     * Fetches mutual followers between the current user and profile user
     * 
     * @async
     * @function fetchMutualFollowers
     */
    const fetchMutualFollowers = async () => {
      if (!shouldFetch) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const response = await API.get(`/users/${username}/mutual-followers/`);
        setMutualFollowers(response.data || []);
      } catch (error) {
        console.error("Error fetching mutual followers:", error);
        setMutualFollowers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMutualFollowers();
  }, [username, currentUsername, shouldFetch]);

  // Ако е празно, зарежда се или не трябва да се извлича, върнете null
  if (!shouldFetch || loading || mutualFollowers.length === 0) {
    return null;
  }

  // Показване на целия списък или само първите 5
  const displayedFollowers = showAll 
    ? mutualFollowers 
    : mutualFollowers.slice(0, 5);
  
  const remainingCount = mutualFollowers.length - 5;

  return (
    <div className="mutual-followers-container">
      <div className="mutual-followers-header">
        <PeopleIcon color="primary" />
        <div className="mutual-followers-title">
          {mutualFollowers.length} mutual connection{mutualFollowers.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="mutual-followers-list">
        {displayedFollowers.map(user => (
          <Link 
            key={user.id} 
            className="mutual-follower-item"
            to={`/profile/${user.username}`}
          >
            <img 
              className="mutual-follower-avatar"
              src={user.avatar ? `${API.defaults.baseURL}${user.avatar}` : null}
              alt={user.username}
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${user.username[0]}&background=random`;
              }}
            />
            <span>{user.display_name || user.username}</span>
          </Link>
        ))}
        
        {remainingCount > 0 && !showAll && (
          <button 
            className="show-more-button"
            onClick={() => setShowAll(true)}
          >
            Show {remainingCount} more
          </button>
        )}
        
        {showAll && mutualFollowers.length > 5 && (
          <button 
            className="show-less-button"
            onClick={() => setShowAll(false)}
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
};

export default MutualFollowers; 