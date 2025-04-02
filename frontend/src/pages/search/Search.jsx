/**
 * Search page component
 * 
 * This component provides a simple search interface for finding users.
 * Users can search by username or display name and view results with
 * profile pictures and links to user profiles.
 * 
 * @module Search
 * @requires React
 * @requires react-router-dom
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";
// import "./Search.css";

/**
 * Formats image URLs by ensuring they have the correct base URL path
 * 
 * @function formatImageUrl
 * @param {string|null} url - The image URL to format
 * @returns {string|null} The formatted URL or null if no URL provided
 */
const formatImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API.defaults.baseURL}${url}`;
};

/**
 * Search component that allows users to search for other users by name
 * 
 * @function Search
 * @returns {JSX.Element} The rendered search interface
 */
function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  /**
   * Handles the search form submission
   * Fetches search results from the API based on the query
   * 
   * @async
   * @function handleSearch
   * @param {React.FormEvent} e - The form submit event
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const response = await API.get(`/search/?q=${query}`);
      setResults(response.data);
    } catch (err) {
      console.error("Failed to retrieve search results.");
    }
  };

  return (
    <div className="search-container">
      <h2>Search Users</h2>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search by username or display name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>
      <div className="search-results">
        {results.map((user) => (
          <div key={user.id} className="search-result">
            <Link to={`/profile/${user.username}`}>
              <img src={formatImageUrl(user.avatar_url) || "https://via.placeholder.com/50"} alt="Profile" />
              <span>{user.display_name || user.username}</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Search;