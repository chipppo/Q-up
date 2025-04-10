/**
 * Search component for finding users
 * 
 * This component provides a search interface that allows users to find other
 * users by username or display name. It displays search results with avatars
 * and profile links.
 * 
 * @module Search
 * @requires React
 * @requires react-router-dom
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";
import "../../styles/components/search/SearchBar.css";
import { formatImageUrl } from "../../utils/formatters";

/**
 * Search component with form and results display
 * 
 * @function Search
 * @returns {JSX.Element} The search component
 */
function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  /**
   * Handles search form submission and fetches results
   * 
   * @async
   * @function handleSearch
   * @param {React.FormEvent} e - Form submit event
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const response = await API.get(`/search/?q=${query}`);
      setResults(response.data);
    } catch (err) {
      console.error("Failed to fetch search results.");
    }
  };

  return (
    <div className="search-container">
      <h2>Search Users</h2>
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-container">
          <input
            className="search-bar"
            type="text"
            placeholder="Search by username or display name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="search-button">Search</button>
        </div>
      </form>
      
      {results.length > 0 ? (
        <div className="search-results">
          {results.map((user) => (
            <Link key={user.id} to={`/profile/${user.username}`} className="search-results-item">
              <img 
                src={formatImageUrl(user.avatar_url) || "https://via.placeholder.com/50"} 
                alt="Profile" 
                className="search-result-avatar"
              />
              <div className="search-result-info">
                <div className="search-result-name">{user.display_name || user.username}</div>
                <div className="search-result-username">@{user.username}</div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        query && <div className="search-results-empty">No users found</div>
      )}
    </div>
  );
}

export default Search;