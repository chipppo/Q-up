import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";
import "./SearchProfiles.css";

// Define time periods with their corresponding hours
const TIME_PERIODS = [
  { id: "earlyMorning", name: "Early Morning (5-8 AM)", hours: ["05:00", "06:00", "07:00", "08:00"] },
  { id: "morning", name: "Morning (8-11 AM)", hours: ["08:00", "09:00", "10:00", "11:00"] },
  { id: "noon", name: "Noon (11 AM-2 PM)", hours: ["11:00", "12:00", "13:00", "14:00"] },
  { id: "afternoon", name: "Afternoon (2-5 PM)", hours: ["14:00", "15:00", "16:00", "17:00"] },
  { id: "evening", name: "Evening (5-8 PM)", hours: ["17:00", "18:00", "19:00", "20:00"] },
  { id: "night", name: "Night (8-11 PM)", hours: ["20:00", "21:00", "22:00", "23:00"] },
  { id: "lateNight", name: "Late Night (11 PM-2 AM)", hours: ["23:00", "00:00", "01:00", "02:00"] },
  { id: "overnight", name: "Overnight (2-5 AM)", hours: ["02:00", "03:00", "04:00", "05:00"] }
];

// Utility function to safely format image URLs
const formatImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API.defaults.baseURL}${url}`;
};

function SearchProfiles() {
  // State for search and filters
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [recommendedUsers, setRecommendedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    platforms: [],
    languages: [],
    activeHours: [],
    games: [],
    playerGoals: [],
    hasMic: null,
    minHoursPlayed: "",
  });
  
  // Available filter options
  const [availableFilters, setAvailableFilters] = useState({
    platforms: [],
    languages: [],
    activeHours: [],
    games: [],
    playerGoals: [],
  });
  
  // Fetch filter options on component mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Fetch games
        const gamesResponse = await API.get("/games/");
        setAvailableFilters(prev => ({
          ...prev,
          games: gamesResponse.data
        }));
        
        // Fetch player goals
        const goalsResponse = await API.get("/player-goals/");
        setAvailableFilters(prev => ({
          ...prev,
          playerGoals: goalsResponse.data
        }));
        
        // For platforms and languages, we could either hardcode common options
        // or fetch them from a dedicated endpoint if available
        setAvailableFilters(prev => ({
          ...prev,
          platforms: [
            "PC", "PlayStation 5", "PlayStation 4", "Xbox Series X/S", "Xbox One", 
            "Nintendo Switch", "Mobile", "Steam Deck", "VR"
          ],
          languages: [
            "English", "Spanish", "French", "German", "Italian", "Portuguese", 
            "Russian", "Chinese", "Japanese", "Korean", "Arabic", "Hindi", 
            "Turkish", "Dutch", "Swedish", "Norwegian", "Finnish", "Danish", 
            "Polish", "Czech", "Hungarian", "Greek", "Romanian", "Bulgarian", 
            "Ukrainian", "Thai", "Vietnamese", "Indonesian", "Malay", "Filipino"
          ].sort(),
          // Use the predefined time periods
          activeHours: TIME_PERIODS
        }));
        
      } catch (err) {
        console.error("Failed to fetch filter options:", err);
        setError("Failed to load filter options. Please try again later.");
      }
    };
    
    fetchFilterOptions();
  }, []);
  
  // Fetch recommended users on component mount
  useEffect(() => {
    const fetchRecommendedUsers = async () => {
      try {
        setLoading(true);
        // This would ideally be a dedicated endpoint for recommendations
        // For now, we'll just fetch some users
        const response = await API.get("/search/?q=");
        setRecommendedUsers(response.data);
      } catch (err) {
        console.error("Failed to fetch recommended users:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendedUsers();
  }, []);
  
  // Handle search with filters
  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      let queryParams = new URLSearchParams();
      
      // Add search query
      if (query) {
        queryParams.append("q", query);
      }
      
      // Add filters
      if (filters.platforms.length > 0) {
        queryParams.append("platforms", filters.platforms.join(","));
      }
      
      if (filters.languages.length > 0) {
        queryParams.append("languages", filters.languages.join(","));
      }
      
      // Convert active hour periods to actual hours
      if (filters.activeHours.length > 0) {
        const selectedHourPeriods = availableFilters.activeHours.filter(
          period => filters.activeHours.includes(period.id)
        );
        
        // Flatten all hours from selected periods
        const allSelectedHours = selectedHourPeriods.flatMap(period => period.hours);
        
        // Remove duplicates
        const uniqueHours = [...new Set(allSelectedHours)];
        
        // Get the current user's timezone offset
        const { auth } = useAuth();
        const currentUserTimezoneOffset = auth?.user?.timezone_offset || 0;
        
        // Convert hours from local timezone to UTC for server-side filtering
        const utcHours = uniqueHours.map(hour => {
          const [hourStr, minuteStr] = hour.split(':');
          let hourNum = parseInt(hourStr, 10);
          
          // Apply reverse timezone offset to convert to UTC
          hourNum = (hourNum - currentUserTimezoneOffset + 24) % 24;
          
          // Format back to string with leading zeros
          return `${hourNum.toString().padStart(2, '0')}:${minuteStr}`;
        });
        
        queryParams.append("active_hours", utcHours.join(","));
      }
      
      if (filters.games.length > 0) {
        queryParams.append("games", filters.games.join(","));
      }
      
      if (filters.playerGoals.length > 0) {
        queryParams.append("player_goals", filters.playerGoals.join(","));
      }
      
      if (filters.hasMic !== null) {
        queryParams.append("mic_available", filters.hasMic);
      }
      
      if (filters.minHoursPlayed) {
        // Ensure minHoursPlayed is a valid number
        const minHours = Number(filters.minHoursPlayed);
        if (!isNaN(minHours) && minHours > 0) {
          queryParams.append("min_hours_played", minHours.toString());
        }
      }
      
      // Make the API call
      const response = await API.get(`/search/?${queryParams.toString()}`);
      setResults(response.data);
    } catch (err) {
      console.error("Failed to fetch search results:", err);
      setError("Failed to fetch search results. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
  
  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prevFilters => {
      // Special handling for minHoursPlayed
      if (filterType === "minHoursPlayed") {
        return {
          ...prevFilters,
          [filterType]: value
        };
      }
      
      // Ensure the filter array exists
      if (!prevFilters[filterType]) {
        prevFilters[filterType] = [];
      }
      
      // For array filters (multi-select)
      if (Array.isArray(prevFilters[filterType])) {
        if (prevFilters[filterType].includes(value)) {
          // Remove if already selected
          return {
            ...prevFilters,
            [filterType]: prevFilters[filterType].filter(item => item !== value)
          };
        } else {
          // Add if not selected
          return {
            ...prevFilters,
            [filterType]: [...prevFilters[filterType], value]
          };
        }
      } 
      // For single value filters
      else {
        return {
          ...prevFilters,
          [filterType]: value
        };
      }
    });
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      platforms: [],
      languages: [],
      activeHours: [],
      games: [],
      playerGoals: [],
      hasMic: null,
      minHoursPlayed: "",
    });
    
    // Reset the slider appearance
    const slider = document.querySelector('.hours-slider');
    if (slider) {
      slider.style.setProperty('--slider-percentage', '0%');
    }
  };
  
  // Render filter section
  const renderFilterSection = (title, filterType, options) => {
    // Check if options is undefined or not an array
    if (!options || !Array.isArray(options)) {
      return null; // Don't render this section if options is not valid
    }
    
    return (
      <div className="filter-section">
        <h3>{title}</h3>
        <div className="filter-options">
          {options.map((option, index) => {
            const value = typeof option === 'object' ? option.id : option;
            const label = typeof option === 'object' ? option.name : option;
            
            return (
              <div key={index} className="filter-option">
                <input
                  type="checkbox"
                  id={`${filterType}-${value}`}
                  checked={filters[filterType].includes(value)}
                  onChange={() => handleFilterChange(filterType, value)}
                />
                <label htmlFor={`${filterType}-${value}`}>{label}</label>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  return (
    <div className="search-profiles-container">
      <div className="search-header">
        <h1>Find Gaming Partners</h1>
        <p>Search for players that match your gaming style and preferences</p>
      </div>
      
      <div className="search-content">
        {/* Filter sidebar */}
        <div className="filter-sidebar">
          <div className="filter-header">
            <h2>Filters</h2>
            <button className="clear-filters-btn" onClick={clearFilters}>Clear All</button>
          </div>
          
          {/* Platform filters */}
          {renderFilterSection("Platforms", "platforms", availableFilters.platforms)}
          
          {/* Language filters */}
          {renderFilterSection("Languages", "languages", availableFilters.languages)}
          
          {/* Active hours filters */}
          <div className="filter-section">
            <h3>Active Hours</h3>
            <p className="filter-description">Times are automatically adjusted for each user's timezone</p>
            <div className="filter-options">
              {availableFilters.activeHours.map((option, index) => {
                const value = option.id;
                const label = option.name;
                
                return (
                  <div key={index} className="filter-option">
                    <input
                      type="checkbox"
                      id={`activeHours-${value}`}
                      checked={filters.activeHours.includes(value)}
                      onChange={() => handleFilterChange("activeHours", value)}
                    />
                    <label htmlFor={`activeHours-${value}`}>{label}</label>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Games filters */}
          {renderFilterSection("Games", "games", availableFilters.games)}
          
          {/* Player goals filters */}
          {renderFilterSection("Player Goals", "playerGoals", availableFilters.playerGoals)}
          
          {/* Mic availability filter */}
          <div className="filter-section">
            <h3>Mic Availability</h3>
            <div className="filter-options">
              <div className="filter-option">
                <input
                  type="radio"
                  id="mic-yes"
                  name="mic-availability"
                  checked={filters.hasMic === true}
                  onChange={() => handleFilterChange("hasMic", true)}
                />
                <label htmlFor="mic-yes">Has Mic</label>
              </div>
              <div className="filter-option">
                <input
                  type="radio"
                  id="mic-no"
                  name="mic-availability"
                  checked={filters.hasMic === false}
                  onChange={() => handleFilterChange("hasMic", false)}
                />
                <label htmlFor="mic-no">No Mic</label>
              </div>
              <div className="filter-option">
                <input
                  type="radio"
                  id="mic-any"
                  name="mic-availability"
                  checked={filters.hasMic === null}
                  onChange={() => handleFilterChange("hasMic", null)}
                />
                <label htmlFor="mic-any">Any</label>
              </div>
            </div>
          </div>
          
          {/* Hours played filter */}
          <div className="filter-section">
            <h3>Minimum Hours Played</h3>
            <div className="hours-slider-container">
              <div className="hours-input-container">
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={filters.minHoursPlayed || ""}
                  onChange={(e) => {
                    const value = e.target.value === "" ? "" : Math.max(0, Math.min(10000, Number(e.target.value)));
                    handleFilterChange("minHoursPlayed", value.toString());
                  }}
                  className="hours-input"
                  placeholder="Any"
                />
                <span>hours</span>
              </div>
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={filters.minHoursPlayed || 0}
                onChange={(e) => {
                  const value = e.target.value;
                  const percentage = (Number(value) / 10000) * 100;
                  e.target.style.setProperty('--slider-percentage', `${percentage}%`);
                  handleFilterChange("minHoursPlayed", value);
                }}
                className="hours-slider"
                style={{ '--slider-percentage': `${((Number(filters.minHoursPlayed) || 0) / 10000) * 100}%` }}
              />
              <div className="hours-value">
                {filters.minHoursPlayed ? `${Number(filters.minHoursPlayed).toLocaleString()} hours` : 'Any'}
                {Number(filters.minHoursPlayed) >= 10000 ? '+' : ''}
              </div>
            </div>
          </div>
        </div>
        
        {/* Main search area */}
        <div className="search-main">
          {/* Search bar */}
          <div className="search-bar">
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search by username, display name, or bio"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-button">
                Search
              </button>
            </form>
          </div>
          
          {/* Search results or recommended users */}
          <div className="search-results-container">
            {loading ? (
              <div className="loading-indicator">Loading...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : results.length > 0 ? (
              <>
                <h2>Search Results</h2>
                <div className="user-cards">
                  {results.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>
              </>
            ) : query ? (
              <div className="no-results">
                <h2>No results found</h2>
                <p>Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                <h2>Recommended Players</h2>
                <div className="user-cards">
                  {recommendedUsers.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// User card component for displaying search results
function UserCard({ user }) {
  // Return null if user is undefined
  if (!user) {
    return null;
  }
  
  // Helper function to format active hours for display
  const formatActiveHours = (activeHours, timezoneOffset = 0) => {
    if (!activeHours || !Array.isArray(activeHours) || activeHours.length === 0) {
      return "Not specified";
    }
    
    // Convert hours from UTC to user's local timezone
    const convertedHours = activeHours.map(hour => {
      const [hourStr, minuteStr] = hour.split(':');
      let hourNum = parseInt(hourStr, 10);
      
      // Apply timezone offset
      hourNum = (hourNum + timezoneOffset + 24) % 24;
      
      // Format back to string with leading zeros
      return `${hourNum.toString().padStart(2, '0')}:${minuteStr}`;
    });
    
    // Check which periods the user is active in
    const activePeriods = [];
    for (const period of TIME_PERIODS) {
      // If all hours in the period are active, add the full period
      if (period.hours.every(hour => convertedHours.includes(hour))) {
        activePeriods.push(period.name);
      }
      // If some hours in the period are active, add the period with a * to indicate partial
      else if (period.hours.some(hour => convertedHours.includes(hour))) {
        activePeriods.push(`${period.name.split(' ')[0]}*`); // Just use the first word with *
      }
    }
    
    return activePeriods.length > 0 ? activePeriods.join(", ") : "Not specified";
  };
  
  return (
    <div className="user-card">
      <Link to={`/profile/${user.username}`} className="user-card-link">
        <div className="user-card-avatar">
          <img 
            src={formatImageUrl(user.avatar_url)}
            alt={`${user.display_name || user.username}'s avatar`} 
          />
        </div>
        <div className="user-card-info">
          <h3>{user.display_name || user.username}</h3>
          {user.bio && <p className="user-bio">{user.bio.substring(0, 100)}{user.bio.length > 100 ? '...' : ''}</p>}
          
          {/* Display some user stats */}
          <div className="user-stats">
            <span>{user.followers_count} followers</span>
            {user.game_stats && user.game_stats.length > 0 && (
              <span>{user.game_stats.length} games</span>
            )}
          </div>
          
          {/* Display active hours */}
          <div className="user-active-hours">
            <span className="active-hours-label">Active: </span>
            <span className="active-hours-value">{formatActiveHours(user.active_hours, user.timezone_offset)}</span>
            {formatActiveHours(user.active_hours, user.timezone_offset).includes('*') && (
              <span className="active-hours-note">* Partially active</span>
            )}
          </div>
          
          {/* Display user tags (platforms, languages) */}
          <div className="user-tags">
            {user.platforms && user.platforms.slice(0, 3).map((platform, index) => (
              <span key={index} className="tag platform-tag">{platform}</span>
            ))}
            {user.language_preference && user.language_preference.slice(0, 2).map((lang, index) => (
              <span key={index} className="tag language-tag">{lang}</span>
            ))}
            {user.mic_available && (
              <span className="tag mic-tag">Has Mic</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

export default SearchProfiles; 