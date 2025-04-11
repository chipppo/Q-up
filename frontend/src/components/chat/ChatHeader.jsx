/**
 * Chat header component displaying the current conversation partner
 * 
 * This component shows the avatar and name of the user being chatted with,
 * and provides navigation to their profile. On mobile, it includes a back
 * button to return to the chat list.
 * 
 * @module ChatHeader
 * @requires React
 * @requires material-ui
 * @requires react-router-dom
 */
import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import API, { formatAvatarUrl } from '../../api/axios';

/**
 * Header bar for chat conversations showing the current chat partner
 * 
 * @function ChatHeader
 * @param {Object} props - Component props
 * @param {Object} props.selectedChat - The current chat data
 * @param {string} props.username - Current user's username
 * @param {boolean} props.isMobile - Whether the device is mobile
 * @param {Function} props.onBackClick - Handler for back button click
 * @returns {JSX.Element|null} The header component or null if no chat selected
 */
const ChatHeader = ({ selectedChat, username, isMobile, onBackClick }) => {
  const navigate = useNavigate();
  
  if (!selectedChat) return null;
  
  const otherUser = selectedChat.participants.find(p => p.username !== username);
  
  return (
    <Box sx={{ 
      p: 2, 
      borderBottom: '1px solid',
      borderColor: 'divider',
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'background.paper',
    }}>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          cursor: 'pointer',
          flex: 1,
        }}
        onClick={() => navigate(`/profile/${otherUser?.username}`)}
      >
        {isMobile && (
          <IconButton onClick={(e) => {
            e.stopPropagation();
            onBackClick();
          }} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        
        <Avatar
          sx={{ width: 40, height: 40 }}
          src={formatAvatarUrl(otherUser?.avatar_url, otherUser?.username || 'U')}
          onError={(e) => {
            e.target.onerror = null; // Prevent infinite error loop
            e.target.src = formatAvatarUrl(null, otherUser?.username || 'U');
          }}
        >
          {otherUser?.username?.[0]?.toUpperCase()}
        </Avatar>
        <Box sx={{ ml: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            {otherUser?.display_name || otherUser?.username}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {otherUser?.status || 'Online'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatHeader; 