import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
// import "./Search.css";

// Utility function to safely format image URLs
const formatImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API.defaults.baseURL}${url}`;
};

function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

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