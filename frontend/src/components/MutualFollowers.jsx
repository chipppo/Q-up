import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import {
  Box,
  Typography,
  Avatar,
  AvatarGroup,
  Chip,
  Paper,
  CircularProgress,
  Button
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";

const MutualFollowers = ({ username }) => {
  const { isLoggedIn, username: currentUsername } = useAuth();
  const [mutualFollowers, setMutualFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  
  // Don't fetch mutual followers if viewing own profile or not logged in
  const shouldFetch = isLoggedIn && username !== currentUsername;

  useEffect(() => {
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

  // If empty or loading or shouldn't fetch, return null
  if (!shouldFetch || loading || mutualFollowers.length === 0) {
    return null;
  }

  // Show the whole list or just first 5
  const displayedFollowers = showAll 
    ? mutualFollowers 
    : mutualFollowers.slice(0, 5);
  
  const remainingCount = mutualFollowers.length - 5;

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2, 
        mb: 3, 
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <PeopleIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="subtitle1" component="div" fontWeight="medium">
          {mutualFollowers.length} mutual connection{mutualFollowers.length !== 1 ? 's' : ''}
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {displayedFollowers.map(user => (
          <Box 
            key={user.id} 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              p: 0.5,
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
            component={Link}
            to={`/profile/${user.username}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Avatar 
              src={user.avatar ? `${API.defaults.baseURL}${user.avatar}` : null}
              sx={{ width: 30, height: 30 }}
            >
              {user.username?.[0]?.toUpperCase()}
            </Avatar>
            <Typography variant="body2" component="div">
              {user.display_name || user.username}
            </Typography>
          </Box>
        ))}
        
        {remainingCount > 0 && !showAll && (
          <Button 
            size="small" 
            onClick={() => setShowAll(true)}
            sx={{ alignSelf: 'flex-start' }}
          >
            Show {remainingCount} more
          </Button>
        )}
        
        {showAll && mutualFollowers.length > 5 && (
          <Button 
            size="small" 
            onClick={() => setShowAll(false)}
            sx={{ alignSelf: 'flex-start' }}
          >
            Show less
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default MutualFollowers; 