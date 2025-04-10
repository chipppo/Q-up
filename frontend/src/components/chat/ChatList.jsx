import React, { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Badge,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import API, { formatAvatarUrl } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import '../../styles/components/chat/ChatList.css';

// Helper function to format message time
const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  const messageDate = new Date(timestamp);
  const now = new Date();
  const diffMs = now - messageDate;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  // Format date as YYYY-MM-DD
  const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
  const formattedDate = messageDate.toLocaleDateString('en-GB', dateOptions).replace(/\//g, '-');
  
  // Format time in 24-hour mode (HH:MM)
  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
  const formattedTime = messageDate.toLocaleTimeString('en-GB', timeOptions);
  
  // For today: show only time
  if (diffDay < 1) return formattedTime;
  
  // For older messages: show date and time
  return `${formattedDate} ${formattedTime}`;
};

// Helper function to safely format image URLs
const formatImageUrl = (url, username = 'U') => {
  if (!url) return `https://ui-avatars.com/api/?name=${username[0].toUpperCase()}&background=random&color=fff`;
  if (url.startsWith('http')) {
    // Don't use default URLs that result in 404s
    if (url.includes('/media/default/') || url.includes('profile_pics') && url.includes('404')) {
      return `https://ui-avatars.com/api/?name=${username[0].toUpperCase()}&background=random&color=fff`;
    }
    return url;
  }
  if (url.includes('/media/default/')) {
    return `https://ui-avatars.com/api/?name=${username[0].toUpperCase()}&background=random&color=fff`;
  }
  return `${API.defaults.baseURL}${url}`;
};

const ChatList = ({
  chats,
  selectedChat,
  onChatSelect,
  onStartChat,
  onGoBack,
  showBackButton,
  unreadChats
}) => {
  const { username } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Function to search users
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      setSearching(true);
      const response = await API.get(`/search/?q=${encodeURIComponent(query)}&type=user`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };
  
  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search query
    const delayDebounceFn = setTimeout(() => {
      if (query) {
        searchUsers(query);
      } else {
        setSearchResults([]);
      }
    }, 300);
    
    return () => clearTimeout(delayDebounceFn);
  };

  return (
    <Box 
      sx={{ 
        height: '100%',
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      className="chat-sidebar"
    >
      {/* Header with search */}
      <Box sx={{ p: 2 }}>
        {showBackButton && (
          <Box sx={{ mb: 1.5 }}>
            <ArrowBackIcon 
              onClick={onGoBack}
              sx={{ cursor: 'pointer' }}
            />
          </Box>
        )}
        
        <TextField
          fullWidth
          size="small"
          placeholder="Search users..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searching && (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            ),
            sx: {
              backgroundColor: 'background.paper',
            }
          }}
        />
      </Box>
      
      {/* User search results or chat list */}
      <Box 
        sx={{ 
          flexGrow: 1,
          overflow: 'auto',
          width: '100%',
        }}
        className="chat-list-container"
      >
        {searchQuery ? (
          // Show search results
          searchResults.length > 0 ? (
            <List>
              {searchResults.map((user) => (
                <ListItem
                  key={user.username}
                  button
                  onClick={() => onStartChat(user.username)}
                  sx={{ py: 1 }}
                >
                  <ListItemAvatar>
                    <Avatar 
                      src={formatAvatarUrl(user.avatar_url, user.username)}
                      onError={(e) => {
                        // Replace broken image with letter avatar
                        e.target.src = `https://ui-avatars.com/api/?name=${user.username[0].toUpperCase()}&background=random&color=fff`;
                      }}
                    >
                      {user.username[0].toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1">
                      {user.display_name || user.username}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Start new chat
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : searching ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">No users found</Typography>
            </Box>
          )
        ) : (
          // Show chat list when not searching
          <List>
            {chats.map((chat) => {
              const otherUser = chat.participants.find(p => p.username !== username);
              const lastMessage = chat.last_message;
              const isOwnLastMessage = lastMessage && lastMessage.sender === username;
              
              // Prepare message preview with status
              let messagePreview;
              
              if (lastMessage) {
                if (lastMessage.has_image) {
                  messagePreview = 'Sent a photo';
                } else if (lastMessage.has_file) {
                  messagePreview = 'Sent a file';
                } else if (lastMessage.content) {
                  messagePreview = lastMessage.content;
                } else {
                  messagePreview = 'New chat';
                }
              } else {
                messagePreview = 'New chat';
              }
              
              // Format last message time
              const messageTime = lastMessage ? formatMessageTime(lastMessage.created_at) : '';
              
              return (
                <ListItem
                  key={chat.id}
                  button
                  selected={selectedChat?.id === chat.id}
                  onClick={() => onChatSelect(chat)}
                  sx={{ 
                    py: 1.5,
                    borderLeft: unreadChats[chat.id] ? '3px solid var(--color-primary)' : 'none',
                    backgroundColor: unreadChats[chat.id] ? 'rgba(0, 255, 170, 0.05)' : 'inherit',
                  }}
                  className={`chat-list-item ${unreadChats[chat.id] ? 'unread-chat-item' : ''}`}
                >
                  <ListItemAvatar>
                    <Badge color="primary" variant="dot" invisible={!unreadChats[chat.id]}>
                      <Avatar 
                        src={formatAvatarUrl(otherUser?.avatar_url, otherUser?.username)}
                        onError={(e) => {
                          // Replace broken image with letter avatar
                          e.target.src = `https://ui-avatars.com/api/?name=${otherUser?.username?.[0]?.toUpperCase() || 'U'}&background=random&color=fff`;
                        }}
                      >
                        {otherUser?.username?.[0]?.toUpperCase()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography fontWeight={unreadChats[chat.id] ? 'bold' : 'normal'}>
                        {otherUser?.display_name || otherUser?.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" className="message-time">
                        {messageTime}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography 
                        variant="body2" 
                        noWrap 
                        fontWeight={unreadChats[chat.id] ? 'medium' : 'normal'}
                        sx={{ 
                          maxWidth: '200px',
                          color: unreadChats[chat.id] ? 'text.primary' : 'text.secondary',
                          fontStyle: isOwnLastMessage ? 'italic' : 'normal'
                        }}
                        className={`message-preview ${isOwnLastMessage ? 'own' : ''} ${unreadChats[chat.id] ? 'unread' : ''}`}
                      >
                        {isOwnLastMessage ? `You: ${messagePreview}` : messagePreview}
                      </Typography>
                      
                      {unreadChats[chat.id] && (
                        <Chip 
                          size="small" 
                          color="primary" 
                          label={unreadChats[chat.id]} 
                          sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default ChatList; 