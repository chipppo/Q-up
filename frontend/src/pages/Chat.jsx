import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  IconButton,
  Divider,
  Menu,
  MenuItem,
  Button,
  CircularProgress,
  Badge,
  InputAdornment,
  Alert,
  Tooltip,
  Popover,
  ClickAwayListener,
  Drawer,
  Card,
  CardContent,
  CardActions,
  Chip,
  Zoom,
  ListItemButton,
  ListItemIcon,
} from '@mui/material';
import {
  Send as SendIcon,
  Image as ImageIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  EmojiEmotions as EmojiIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon,
  AttachFile as AttachFileIcon,
  Info as InfoIcon,
  Email as EmailIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Link as LinkIcon,
  ArrowForward as ArrowForwardIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { toast } from 'react-toastify';
import './Chat.css';
import { keyframes } from '@emotion/react';

const PREDEFINED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏', '🙏', '🔥'];

// Add a styled component for the animation
const typingDotAnimation = keyframes`
  0% { opacity: 0.5; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0.5; transform: scale(0.8); }
`;

// Utility function to safely format image URLs
const formatImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API.defaults.baseURL}${url}`;
};

// Add this utility function that's referenced but missing
const stringToColor = (string) => {
  if (!string) return '#1976d2'; // Default color if string is empty
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
};

const Chat = () => {
  const { isLoggedIn, username } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showChatList, setShowChatList] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const [messageMenuAnchorEl, setMessageMenuAnchorEl] = useState(null);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState(null);
  const [showUserInfo, setShowUserInfo] = useState(!isMobile);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const messageRefs = useRef({});
  const [sending, setSending] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [searchedMessages, setSearchedMessages] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});

  // Handle window resize
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleResize = () => setIsMobile(window.innerWidth <= 768);

  // Initial load
  useEffect(() => {
    if (isLoggedIn) {
      fetchChats();
    }
  }, [isLoggedIn]);

  // Handle initial chat selection from state
  useEffect(() => {
    if (location.state?.selectedChatId && chats.length > 0) {
      const chat = chats.find(c => c.id === location.state.selectedChatId);
      if (chat) {
        setSelectedChat(chat);
        fetchMessages(chat.id);
        if (isMobile) {
          setShowChatList(false);
        }
      }
    }
  }, [location.state, chats]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await API.get('/chats/');
      setChats(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError('Failed to load chats');
      toast.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const response = await API.get(`/chats/${chatId}/messages/`);
      setMessages(response.data);
      scrollToBottom();
    } catch (err) {
      console.error('Error fetching messages:', err);
      toast.error('Failed to load messages');
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    
    if (!selectedChat) {
      toast.error('No chat selected');
      return;
    }
    
    if (!newMessage.trim() && !selectedImage && !selectedFile) {
      toast.error('Please enter a message or select a file');
      return;
    }

    try {
      setSending(true);
      const formData = new FormData();
      
      if (newMessage.trim()) {
        formData.append('content', newMessage.trim());
      }
      
      if (selectedImage) {
        formData.append('image', selectedImage);
      }
      
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      
      if (replyTo) {
        formData.append('parent', replyTo.id);
      }

      const response = await API.post(`/chats/${selectedChat.id}/messages/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Message sent successfully:', response.data);

      // Clear input and files
      setNewMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedFile(null);
      setFilePreview(null);
      setReplyTo(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
      
      // Update messages list
      await fetchMessages(selectedChat.id);
      
      // Update chat list to show latest message
      await fetchChats();
      
      // Scroll to bottom
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      setSelectedImage(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
      
      // Clear any selected files
      setSelectedFile(null);
      setFilePreview(null);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size should be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setFilePreview(file);
      
      // Clear any selected images
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedFile(null);
    setFilePreview(null);
    
    // Reset file inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (documentInputRef.current) documentInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleBack = () => {
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
    } else {
      setSelectedChat(null);
    }
  };

  const searchMutualFollowers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await API.get(`/users/${username}/mutual-followers/?q=${query}`);
      setSearchResults(response.data);
    } catch (err) {
      console.error('Error searching mutual followers:', err);
      toast.error('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleStartChat = async (username) => {
    try {
      setSearching(true);
      const response = await API.post('/chats/', { username });
      
      // Update chats list
      setChats(prevChats => {
        // Check if chat already exists in the list
        const chatExists = prevChats.some(chat => chat.id === response.data.id);
        if (chatExists) {
          return prevChats.map(chat => 
            chat.id === response.data.id ? response.data : chat
          );
        } else {
          return [response.data, ...prevChats];
        }
      });
      
      // Select the new chat
      setSelectedChat(response.data);
      fetchMessages(response.data.id);
      
      // Clear search
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    } finally {
      setSearching(false);
    }
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    if (chat) {
      fetchMessages(chat.id);
    }
    if (isMobile) {
      setShowChatList(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: '/chat' } });
      return;
    }

    fetchChats();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        searchMutualFollowers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Add a cleanup effect for anchor elements
  useEffect(() => {
    // Clean up any open menus or pickers when chat changes
    setEmojiAnchorEl(null);
    setMessageMenuAnchorEl(null);
    setSelectedMessageForMenu(null);
    setEditingMessage(null);
    setEditContent('');
    setReplyTo(null);
  }, [selectedChat]);

  // Add a cleanup effect for when the component unmounts
  useEffect(() => {
    return () => {
      // Clean up any timeouts
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Clean up any open menus or pickers
      setEmojiAnchorEl(null);
      setMessageMenuAnchorEl(null);
      setSelectedMessageForMenu(null);
      setEditingMessage(null);
      setEditContent('');
      setReplyTo(null);
    };
  }, []);

  // Add this effect to simulate receiving typing status updates
  // In a real app, this would come from WebSockets
  useEffect(() => {
    // Cleanup typing status when chat changes
    setTypingUsers({});
    
    // This simulates receiving updates in selected chat
    if (selectedChat) {
      const typingStatusListener = setInterval(() => {
        // In a real app, you would check for updates from WebSocket
        // This is just a placeholder
      }, 3000);
      
      return () => clearInterval(typingStatusListener);
    }
  }, [selectedChat?.id]);

  // Add these styles for typing indicator animation
  const typingDotKeyframes = keyframes`
    0% { opacity: 0.3; transform: translateY(0); }
    50% { opacity: 1; transform: translateY(-3px); }
    100% { opacity: 0.3; transform: translateY(0); }
  `;

  const typingDotStyle = (delay) => ({
    width: 6,
    height: 6,
    backgroundColor: 'primary.main',
    borderRadius: '50%',
    display: 'inline-block',
    mx: 0.5,
    animation: `${typingDotKeyframes} 1.4s infinite ease-in-out`,
    animationDelay: `${delay}s`,
  });

  // Custom hook for message scroll behavior
  useEffect(() => {
    if (messages.length && messagesEndRef.current) {
      // Scroll to bottom when new messages arrive
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Improved message input focus
  useEffect(() => {
    // Focus the message input when selected chat changes
    if (selectedChat && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [selectedChat]);

  const renderChatList = () => (
    <Box
      sx={{
        width: isMobile && selectedChat ? '0' : '300px',
        display: isMobile && selectedChat ? 'none' : 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #e0e0e0',
        height: '100%'
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        {location.state?.returnTo && (
          <IconButton onClick={handleBack} sx={{ mb: 1 }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <TextField
          fullWidth
          placeholder="Search mutual followers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
            )
          }}
        />
      </Box>

      <List sx={{ flexGrow: 1, overflow: 'auto' }}>
        {searchQuery ? (
          searchResults.map((user) => (
            <ListItem
              key={user.username}
              component="div"
              onClick={() => handleStartChat(user.username)}
              sx={{ cursor: 'pointer' }}
            >
              <ListItemAvatar>
                <Avatar src={formatImageUrl(user.avatar_url)} alt={user.username}>
                  {user.username[0].toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={user.display_name || user.username}
                secondary="Start new chat"
              />
            </ListItem>
          ))
        ) : (
          chats.map((chat) => {
            const otherParticipant = chat.participants.find(p => p.username !== username);
            return (
              <ListItem
                key={chat.id}
                disablePadding
                selected={selectedChat?.id === chat.id}
                onClick={() => handleChatSelect(chat)}
                sx={{ 
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                  },
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemButton sx={{ py: { xs: 1, sm: 1.5 } }}>
                  <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 50 } }}>
                    <Badge
                      color="primary"
                      badgeContent={chat.unread_count}
                      invisible={!chat.unread_count}
                    >
                      <Avatar 
                        src={formatImageUrl(otherParticipant?.avatar_url || '')}
                        alt={otherParticipant?.username || ''}
                        sx={{ width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}
                      >
                        {otherParticipant?.username?.[0]?.toUpperCase() || '?'}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={otherParticipant?.display_name || otherParticipant?.username}
                    secondary={
                      chat.last_message
                        ? `${chat.last_message.sender?.username === username ? 'You' : chat.last_message.sender?.username}: ${
                            chat.last_message.image
                              ? '📷 Image'
                              : chat.last_message.content
                          }`
                        : 'No messages yet'
                    }
                    primaryTypographyProps={{
                      noWrap: true,
                      sx: { display: { xs: 'none', sm: 'block' } }
                    }}
                    secondaryTypographyProps={{
                      noWrap: true,
                      sx: { 
                        maxWidth: '180px',
                        display: { xs: 'none', sm: 'block' }
                      }
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })
        )}
      </List>
    </Box>
  );

  const renderChatMessages = () => (
    <Box
      sx={{
        flexGrow: 1,
        flexDirection: 'column',
        height: '100%',
        width: isMobile ? '100%' : 'calc(100% - 300px)',
        display: (!isMobile || selectedChat) ? 'flex' : 'none'
      }}
    >
      {selectedChat ? (
        <>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
            {isMobile && (
              <IconButton onClick={() => setSelectedChat(null)} sx={{ mr: 1 }}>
                <ArrowBackIcon />
              </IconButton>
            )}
            <Avatar
              sx={{ width: 40, height: 40 }}
              src={formatImageUrl(selectedChat.participants.find(p => p.username !== username)?.avatar_url || '')}
              alt={selectedChat.participants.find(p => p.username !== username)?.username || ''}
            >
              {selectedChat.participants.find(p => p.username !== username)?.username?.[0]?.toUpperCase() || '?'}
            </Avatar>
            <Typography variant="h6" sx={{ ml: 2 }}>
              {selectedChat.participants.find(p => p.username !== username)?.display_name ||
               selectedChat.participants.find(p => p.username !== username)?.username}
            </Typography>
          </Box>

          <Box className="messages-container">
            {messages.map((message) => (
              <MessageComponent key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </Box>

          <MessageInput />

          {selectedImage && (
            <Box className="image-preview">
              <img src={URL.createObjectURL(selectedImage)} alt="Selected" />
              <IconButton className="remove-image-button" onClick={handleRemoveFile}>
                <CloseIcon />
              </IconButton>
            </Box>
          )}
        </>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            bgcolor: '#f5f5f5'
          }}
        >
          <Typography variant="h6" color="textSecondary">
            Select a chat or search for users to start messaging
          </Typography>
        </Box>
      )}
    </Box>
  );

  // Restore handleEmojiButtonClick function
  const handleEmojiButtonClick = (event) => {
    // If we already have an anchor element, close the picker
    if (emojiAnchorEl) {
      setEmojiAnchorEl(null);
      return;
    }
    
    // Otherwise, open the picker with the current target
    if (event && event.currentTarget) {
      setEmojiAnchorEl(event.currentTarget);
    }
  };

  // Add handleEmojiClick function
  const handleEmojiClick = (emojiData) => {
    // In the latest version of emoji-picker-react, emojiData is an object with emoji property
    if (!emojiData) {
      console.error('Invalid emoji data:', emojiData);
      return;
    }
    
    // Extract the emoji character
    const emoji = emojiData.emoji;
    
    if (!emoji) {
      console.error('No emoji character found in:', emojiData);
      return;
    }

    if (editingMessage) {
      // If editing a message, add emoji to edit content
      setEditContent(prev => prev + emoji);
    } else {
      // Add to new message
      setNewMessage(prev => prev + emoji);
    }
    
    // Close the emoji picker
    setEmojiAnchorEl(null);
  };

  const handleMessageMenuOpen = (event, message) => {
    // Prevent event propagation to avoid conflicts
    event.stopPropagation();
    
    // If we already have this message selected, close the menu
    if (selectedMessageForMenu && selectedMessageForMenu.id === message.id && messageMenuAnchorEl) {
      setMessageMenuAnchorEl(null);
      setSelectedMessageForMenu(null);
      return;
    }
    
    // Use the current target for menu positioning
    const currentTarget = event.currentTarget;
    
    // Make sure the element is valid before setting it as anchorEl
    if (currentTarget && document.body.contains(currentTarget)) {
      setMessageMenuAnchorEl(currentTarget);
      setSelectedMessageForMenu(message);
    } else {
      console.error('Invalid anchor element for message menu');
    }
  };

  const handleMessageMenuClose = () => {
    setMessageMenuAnchorEl(null);
    setSelectedMessageForMenu(null);
  };

  const MessageMenu = () => {
    if (!messageMenuAnchorEl || !selectedMessageForMenu) return null;
    
    return (
      <Menu
        id="message-menu"
        anchorEl={messageMenuAnchorEl}
        open={Boolean(messageMenuAnchorEl)}
        onClose={handleMessageMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        MenuListProps={{
          dense: true,
        }}
      >
        <MenuItem onClick={() => {
          handleReplyMessage(selectedMessageForMenu);
          handleMessageMenuClose();
        }}>
          <ReplyIcon sx={{ mr: 1 }} /> Reply
        </MenuItem>
        {selectedMessageForMenu?.sender?.username === username && [
          <MenuItem 
            key="edit" 
            onClick={() => {
              setEditingMessage(selectedMessageForMenu);
              setEditContent(selectedMessageForMenu.content || '');
              handleMessageMenuClose();
            }}
          >
            <EditIcon sx={{ mr: 1 }} /> Edit
          </MenuItem>,
          <MenuItem 
            key="delete" 
            onClick={() => {
              handleDeleteMessage(selectedMessageForMenu.id);
              handleMessageMenuClose();
            }}
          >
            <DeleteIcon sx={{ mr: 1 }} /> Delete
          </MenuItem>
        ]}
      </Menu>
    );
  };

  // Update EmojiPickerComponent to use handleEmojiClick
  const EmojiPickerComponent = () => {
    if (!emojiAnchorEl) return null;
    
    const [customEmojis, setCustomEmojis] = useState(
      localStorage.getItem('customEmojis') 
        ? JSON.parse(localStorage.getItem('customEmojis')) 
        : PREDEFINED_EMOJIS
    );

    const [customEmojiInput, setCustomEmojiInput] = useState('');
    const [showCustomizer, setShowCustomizer] = useState(false);

    const addCustomEmoji = () => {
      if (customEmojiInput.trim() && !customEmojis.includes(customEmojiInput)) {
        const newCustomEmojis = [...customEmojis, customEmojiInput];
        setCustomEmojis(newCustomEmojis);
        localStorage.setItem('customEmojis', JSON.stringify(newCustomEmojis));
        setCustomEmojiInput('');
      }
    };

    const removeCustomEmoji = (emoji) => {
      const newCustomEmojis = customEmojis.filter(e => e !== emoji);
      setCustomEmojis(newCustomEmojis);
      localStorage.setItem('customEmojis', JSON.stringify(newCustomEmojis));
    };
    
    return (
      <Popover
        id="emoji-picker-popover"
        open={Boolean(emojiAnchorEl)}
        anchorEl={emojiAnchorEl}
        onClose={() => setEmojiAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        slotProps={{
          paper: {
            sx: { 
              mt: 1,
              overflow: 'visible',
              '& .EmojiPickerReact': {
                '--epr-hover-bg-color': theme => theme.palette.action.hover,
                '--epr-focus-bg-color': theme => theme.palette.action.selected,
                '--epr-highlight-color': theme => theme.palette.primary.main,
                '--epr-search-border-color': theme => theme.palette.divider,
                '--epr-category-label-bg-color': theme => theme.palette.background.paper,
              }
            }
          }
        }}
      >
        <Box sx={{ p: 1 }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Quick Emojis
              <IconButton 
                size="small" 
                onClick={() => setShowCustomizer(!showCustomizer)}
                sx={{ ml: 1 }}
                color={showCustomizer ? "primary" : "default"}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Typography>

            {showCustomizer && (
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="Add emoji"
                  value={customEmojiInput}
                  onChange={(e) => setCustomEmojiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addCustomEmoji();
                    }
                  }}
                  sx={{ mr: 1, flex: 1 }}
                />
                <Button
                  size="small"
                  variant="contained"
                  onClick={addCustomEmoji}
                  disabled={!customEmojiInput.trim()}
                >
                  Add
                </Button>
              </Box>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
              {customEmojis.map((emoji) => (
                <Chip
                  key={emoji}
                  label={emoji}
                  onClick={() => handleEmojiClick({ emoji })}
                  onDelete={showCustomizer ? () => removeCustomEmoji(emoji) : undefined}
                  sx={{ 
                    cursor: 'pointer',
                    py: 0.25,
                    height: 28,
                    '& .MuiChip-label': { px: 1 }
                  }}
                />
              ))}
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />
          
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            width={300}
            height={400}
            searchDisabled={false}
            skinTonesDisabled
            previewConfig={{
              showPreview: false
            }}
            lazyLoadEmojis={true}
          />
        </Box>
      </Popover>
    );
  };

  const MessageComponent = ({ message }) => {
    const isOwnMessage = message.sender.username === username;
    const isEditing = editingMessage?.id === message.id;
    const messageLength = message.content?.length || 0;
    const isShortMessage = messageLength < 20 && !message.image && !message.file;
    const isHighlighted = message.id === highlightedMessageId;
    const hasFile = message.file;

    return (
      <Box
        ref={el => messageRefs.current[message.id] = el}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
          mb: 2,
          width: '100%',
          transition: 'all 0.3s ease',
          backgroundColor: isHighlighted ? 'rgba(255, 236, 179, 0.4)' : 'transparent',
          padding: isHighlighted ? 1 : 0,
          borderRadius: 1,
        }}
      >
        {message.parent_message && (
          <Box
            sx={{
              backgroundColor: 'action.hover',
              borderRadius: 1,
              p: 1,
              mb: 1,
              maxWidth: '80%',
              cursor: 'pointer',
              border: '1px solid',
              borderColor: 'divider',
            }}
            onClick={() => scrollToMessage(message.parent_message.id)}
          >
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>
              Reply to {message.parent_message.sender?.username || 'Unknown'}
            </Typography>
            <Typography variant="body2" noWrap>
              {message.parent_message.content || (message.parent_message.image ? '📷 Image' : '')}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            flexDirection: isOwnMessage ? 'row-reverse' : 'row',
            gap: 1,
            width: '100%',
            maxWidth: '100%',
          }}
        >
          <ListItemAvatar sx={{ minWidth: { xs: 36, sm: 48 } }}>
            <Avatar 
              src={formatImageUrl(message.sender.avatar_url || '')}
              alt={message.sender.username || ''}
              sx={{ 
                width: { xs: 28, sm: 36 }, 
                height: { xs: 28, sm: 36 } 
              }}
            >
              {message.sender.username?.[0]?.toUpperCase() || '?'}
            </Avatar>
          </ListItemAvatar>

          <Box sx={{ maxWidth: { xs: '80%', sm: '85%' } }}>
            <Typography variant="caption" color="textSecondary">
              {message.sender.username}
            </Typography>

            <Paper
              elevation={1}
              sx={{
                p: 1.5,
                backgroundColor: isOwnMessage ? 'primary.main' : 'background.paper',
                color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
                borderRadius: 2,
                maxWidth: '100%',
                width: isShortMessage ? 'auto' : undefined,
                position: 'relative',
                wordBreak: 'break-word',
                cursor: isEditing ? 'default' : 'pointer',
                display: 'inline-block',
              }}
              onClick={(e) => {
                if (!isEditing) {
                  handleMessageMenuOpen(e, message);
                }
              }}
            >
              {isEditing ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    size="small"
                    autoFocus
                    multiline
                    maxRows={4}
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleEditMessage(message.id)}
                      color="primary"
                    >
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingMessage(null);
                        setEditContent('');
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <>
                  {message.content && (
                    <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                      {message.content}
                    </Typography>
                  )}

                  {message.image && (
                    <Box sx={{ mt: message.content ? 1 : 0 }}>
                      <img
                        src={message.image}
                        alt="Message attachment"
                        style={{ maxWidth: '100%', borderRadius: 8 }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/200x150?text=Image+Not+Available';
                        }}
                      />
                    </Box>
                  )}

                  {hasFile && (
                    <Box 
                      sx={{ 
                        mt: message.content ? 1 : 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: isOwnMessage ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                        p: 1,
                        borderRadius: 1,
                      }}
                    >
                      <AttachFileIcon fontSize="small" />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" noWrap>
                          {message.file.name}
                        </Typography>
                        <Typography variant="caption" color={isOwnMessage ? 'primary.contrastText' : 'textSecondary'}>
                          {message.file.size}
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        href={message.file.url} 
                        download
                        sx={{ 
                          color: isOwnMessage ? 'primary.contrastText' : 'primary.main',
                          '&:hover': {
                            bgcolor: isOwnMessage ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                          }
                        }}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </>
              )}
            </Paper>

            <Box
              sx={{
                display: 'flex',
                justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                alignItems: 'center',
                mt: 0.5,
                gap: 1,
              }}
            >
              <Typography variant="caption" color="textSecondary">
                {formatTime(message.created_at)}
              </Typography>
              {message.is_edited && (
                <Typography variant="caption" color="textSecondary">
                  (edited)
                </Typography>
              )}
              {isOwnMessage && (
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                  {!message.is_delivered && !message.is_read && (
                    <Tooltip title="Sending...">
                      <CircularProgress size={10} color="inherit" />
                    </Tooltip>
                  )}
                  {message.is_delivered && !message.is_read && (
                    <Tooltip title="Delivered">
                      <DoneAllIcon fontSize="small" color="action" sx={{ fontSize: 12 }} />
                    </Tooltip>
                  )}
                  {message.is_read && (
                    <Tooltip title="Read">
                      <DoneAllIcon fontSize="small" color="primary" sx={{ fontSize: 12 }} />
                    </Tooltip>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  const MessageInput = () => (
    <Box
      sx={{
        p: { xs: 1, sm: 2 },
        borderTop: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      {replyTo && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1,
            mb: 1,
            backgroundColor: 'action.hover',
            borderRadius: 1,
            borderLeft: '4px solid',
            borderColor: 'primary.main',
          }}
        >
          <ReplyIcon color="action" fontSize="small" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="textSecondary" fontWeight="bold">
              Replying to {replyTo.sender.username}
            </Typography>
            <Typography variant="body2" noWrap>
              {replyTo.content || (replyTo.image ? '📷 Image' : '')}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setReplyTo(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Preview for selected file or image */}
      {(imagePreview || filePreview) && (
        <Box
          sx={{
            mb: 2,
            p: 1,
            borderRadius: 1,
            backgroundColor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          {imagePreview && (
            <Box sx={{ position: 'relative', maxWidth: 100 }}>
              <img
                src={imagePreview}
                alt="Selected"
                style={{ 
                  maxWidth: '100%', 
                  borderRadius: 4,
                  maxHeight: 80,
                  objectFit: 'cover' 
                }}
              />
              <Chip
                label="Image"
                size="small"
                color="primary"
                sx={{ 
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  fontSize: '0.65rem',
                  height: 20,
                }}
              />
            </Box>
          )}
          
          {filePreview && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              p: 1,
              maxWidth: 200,
            }}>
              <Typography variant="caption" noWrap fontWeight="bold">
                {filePreview.name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {filePreview.size}
              </Typography>
              <Chip 
                label={filePreview.type.split('/')[1]?.toUpperCase() || 'FILE'} 
                size="small"
                sx={{ 
                  alignSelf: 'flex-start', 
                  mt: 0.5,
                  height: 20,
                  fontSize: '0.65rem',
                }}
              />
            </Box>
          )}
          
          <IconButton size="small" onClick={handleRemoveFile} sx={{ ml: 'auto' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <IconButton
          id="emoji-button"
          onClick={handleEmojiButtonClick}
          color={Boolean(emojiAnchorEl) ? 'primary' : 'default'}
          size="small"
        >
          <EmojiIcon fontSize="small" />
        </IconButton>

        {/* Image attachment button */}
        <IconButton 
          onClick={() => fileInputRef.current?.click()}
          size="small"
          color={selectedImage ? 'primary' : 'default'}
        >
          <ImageIcon fontSize="small" />
        </IconButton>

        {/* File attachment button */}
        <IconButton 
          onClick={() => documentInputRef.current?.click()}
          size="small"
          color={selectedFile ? 'primary' : 'default'}
        >
          <AttachFileIcon fontSize="small" />
        </IconButton>

        {/* Hidden file inputs */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleImageSelect}
          accept="image/*"
        />
        
        <input
          type="file"
          ref={documentInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
        />
        
        <TextField
          id="message-input"
          fullWidth
          multiline
          maxRows={4}
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTypingStatus();
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
          placeholder={replyTo ? `Reply to ${replyTo.sender.username}...` : "Type a message..."}
          variant="outlined"
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            }
          }}
        />

        <IconButton
          onClick={handleSendMessage}
          disabled={!newMessage.trim() && !selectedImage && !selectedFile}
          color="primary"
          size="small"
          sx={{
            backgroundColor: (!newMessage.trim() && !selectedImage && !selectedFile) ? 'transparent' : 'primary.main',
            color: (!newMessage.trim() && !selectedImage && !selectedFile) ? 'action.disabled' : 'white',
            '&:hover': {
              backgroundColor: (!newMessage.trim() && !selectedImage && !selectedFile) ? 'transparent' : 'primary.dark',
            }
          }}
        >
          {sending ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <SendIcon fontSize="small" />
          )}
        </IconButton>
      </Box>
    </Box>
  );

  // Message search component
  const MessageSearchComponent = () => (
    <Box
      sx={{
        p: 2,
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        display: showMessageSearch ? 'flex' : 'none',
        gap: 1,
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        alignItems: 'center',
      }}
    >
      <TextField
        fullWidth
        size="small"
        value={messageSearchQuery}
        onChange={(e) => setMessageSearchQuery(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleMessageSearch();
          }
        }}
        placeholder="Search in messages..."
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton 
                size="small" 
                onClick={handleMessageSearch}
                disabled={!messageSearchQuery.trim()}
              >
                <ArrowForwardIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {searchedMessages.length > 0 && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          bgcolor: 'action.selected',
          borderRadius: 1,
          px: 1,
          py: 0.5,
          minWidth: { xs: '100%', sm: 'auto' },
          justifyContent: { xs: 'space-between', sm: 'flex-start' },
          mt: { xs: 1, sm: 0 }
        }}>
          <Typography variant="body2" color="textSecondary">
            {currentSearchIndex + 1} of {searchedMessages.length}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton 
              size="small" 
              onClick={handlePreviousSearchResult}
              color="primary"
            >
              <KeyboardArrowUpIcon fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={handleNextSearchResult}
              color="primary"
            >
              <KeyboardArrowDownIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )}

      <IconButton 
        size="small" 
        onClick={() => {
          setShowMessageSearch(false);
          setMessageSearchQuery('');
          setSearchedMessages([]);
          setCurrentSearchIndex(-1);
          setHighlightedMessageId(null);
        }}
        sx={{ ml: { xs: 'auto', sm: 0 } }}
      >
        <CloseIcon />
      </IconButton>
    </Box>
  );

  // Add the missing handleMessageSearch function
  const handleMessageSearch = () => {
    if (!messageSearchQuery.trim()) {
      setSearchedMessages([]);
      setCurrentSearchIndex(-1);
      return;
    }

    const query = messageSearchQuery.toLowerCase();
    const matchedMessages = messages.filter(message => 
      message.content?.toLowerCase().includes(query)
    );

    setSearchedMessages(matchedMessages);
    if (matchedMessages.length > 0) {
      setCurrentSearchIndex(0);
      scrollToMessage(matchedMessages[0].id);
    } else {
      toast.info('No matching messages found');
    }
  };

  // Add the missing scrollToMessage function if it doesn't exist
  const scrollToMessage = (messageId) => {
    setHighlightedMessageId(messageId);
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Clear the highlight after a few seconds
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3000);
    }
  };

  // Add the missing navigation functions for search results
  const handleNextSearchResult = () => {
    if (searchedMessages.length === 0) return;
    
    const nextIndex = (currentSearchIndex + 1) % searchedMessages.length;
    setCurrentSearchIndex(nextIndex);
    scrollToMessage(searchedMessages[nextIndex].id);
  };

  const handlePreviousSearchResult = () => {
    if (searchedMessages.length === 0) return;
    
    const prevIndex = currentSearchIndex <= 0 ? 
      searchedMessages.length - 1 : 
      currentSearchIndex - 1;
    setCurrentSearchIndex(prevIndex);
    scrollToMessage(searchedMessages[prevIndex].id);
  };

  // Add message context menu handlers
  const handleMessageContextMenu = (event, message) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    });
    setSelectedMessage(message);
  };
  
  const handleContextMenuClose = () => {
    setContextMenu(null);
    setSelectedMessage(null);
  };
  
  // Add message reaction handler
  const handleAddReaction = async (emoji) => {
    if (!selectedMessage) return;
    
    try {
      await API.post(`/messages/${selectedMessage.id}/reactions/`, { emoji });
      
      // Update messages locally
      setMessages(prevMessages =>
        prevMessages.map(msg => {
          if (msg.id === selectedMessage.id) {
            // Add the reaction to the message if it doesn't exist
            const reactions = [...(msg.reactions || [])];
            const existingReaction = reactions.findIndex(r => r.user.username === username);
            
            if (existingReaction >= 0) {
              // Update existing reaction
              reactions[existingReaction] = {
                ...reactions[existingReaction],
                emoji
              };
            } else {
              // Add new reaction
              reactions.push({
                id: Date.now(), // Temporary ID
                emoji,
                user: { username }
              });
            }
            
            return { ...msg, reactions };
          }
          return msg;
        })
      );
      
      handleContextMenuClose();
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast.error('Failed to add reaction');
    }
  };
  
  // Add message delete handler
  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;
    
    try {
      await API.delete(`/messages/${selectedMessage.id}/`);
      
      // Remove message locally
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== selectedMessage.id)
      );
      
      toast.success('Message deleted');
      handleContextMenuClose();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  // Add handler for reply functionality
  const handleReply = (message) => {
    setReplyTo(message);
    messageInputRef.current?.focus();
  };

  if (loading && !selectedChat) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography color="error" gutterBottom>{error}</Typography>
          <Button variant="contained" onClick={fetchChats}>Try Again</Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ height: 'calc(100vh - 64px)', py: 2 }}>
      <Box
        sx={{
          display: 'flex',
          height: '100%',
          backgroundColor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: 3
        }}
      >
        {/* Chat list - Adjustable width depending on screen size */}
        <Box
          sx={{
            width: { xs: isMobile && selectedChat ? '0px' : '100%', sm: isMobile && selectedChat ? '0px' : '300px' },
            borderRight: 1,
            borderColor: 'divider',
            display: isMobile && selectedChat ? 'none' : 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            transition: 'width 0.3s ease'
          }}
        >
          <Box sx={{ p: { xs: 1, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
            <TextField
              fullWidth
              size="small"
              placeholder={window.innerWidth <= 600 ? "Search..." : "Search chats..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <List sx={{ flex: 1, overflow: 'auto' }}>
            {searchQuery ? (
              searchResults.map((user) => (
                <ListItem
                  key={user.username}
                  component="div"
                  onClick={() => handleStartChat(user.username)}
                  sx={{ cursor: 'pointer' }}
                >
                  <ListItemAvatar>
                    <Avatar src={formatImageUrl(user.avatar_url)} alt={user.username}>
                      {user.username[0].toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.display_name || user.username}
                    secondary="Start new chat"
                  />
                </ListItem>
              ))
            ) : (
              chats.map((chat) => {
                const otherParticipant = chat.participants.find(p => p.username !== username);
                return (
                  <ListItem
                    key={chat.id}
                    disablePadding
                    selected={selectedChat?.id === chat.id}
                    onClick={() => handleChatSelect(chat)}
                    sx={{ 
                      '&.Mui-selected': {
                        backgroundColor: 'action.selected',
                      },
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemButton sx={{ py: { xs: 1, sm: 1.5 } }}>
                      <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 50 } }}>
                        <Badge
                          color="primary"
                          badgeContent={chat.unread_count}
                          invisible={!chat.unread_count}
                        >
                          <Avatar 
                            src={formatImageUrl(otherParticipant?.avatar_url || '')}
                            alt={otherParticipant?.username || ''}
                            sx={{ width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}
                          >
                            {otherParticipant?.username?.[0]?.toUpperCase() || '?'}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={otherParticipant?.display_name || otherParticipant?.username}
                        secondary={
                          chat.last_message
                            ? `${chat.last_message.sender?.username === username ? 'You' : chat.last_message.sender?.username}: ${
                                chat.last_message.image
                                  ? '📷 Image'
                                  : chat.last_message.content
                              }`
                            : 'No messages yet'
                        }
                        primaryTypographyProps={{
                          noWrap: true,
                          sx: { display: { xs: 'none', sm: 'block' } }
                        }}
                        secondaryTypographyProps={{
                          noWrap: true,
                          sx: { 
                            maxWidth: '180px',
                            display: { xs: 'none', sm: 'block' }
                          }
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })
            )}
          </List>
        </Box>

        {/* Chat message area - Fixed for mobile, flexible for desktop */}
        {selectedChat ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              height: '100%',
              overflow: 'hidden'
            }}
          >
            {/* Chat header */}
            <Box
              sx={{
                p: { xs: 1, sm: 2 },
                borderBottom: 1,
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 2 },
                zIndex: 10,
              }}
            >
              {isMobile && (
                <IconButton onClick={() => setSelectedChat(null)} size="small">
                  <ArrowBackIcon />
                </IconButton>
              )}

              <Avatar 
                sx={{ width: 40, height: 40 }}
                src={formatImageUrl(selectedChat.participants.find(p => p.username !== username)?.avatar_url || '')}
                alt={selectedChat.participants.find(p => p.username !== username)?.username || ''}
              >
                {selectedChat.participants.find(p => p.username !== username)?.username?.[0]?.toUpperCase() || '?'}
              </Avatar>

              <Typography 
                variant="subtitle1" 
                fontWeight="medium"
                sx={{ 
                  flex: 1, 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap' 
                }}
              >
                {selectedChat.participants
                  .filter((p) => p.username !== username)
                  .map((p) => p.display_name || p.username)
                  .join(', ')}
              </Typography>

              <IconButton
                onClick={() => setShowMessageSearch(!showMessageSearch)}
                color={showMessageSearch ? 'primary' : 'default'}
                size="small"
              >
                <SearchIcon />
              </IconButton>

              <IconButton
                onClick={() => setShowUserInfo(!showUserInfo)}
                color={showUserInfo ? 'primary' : 'default'}
                size="small"
                sx={{ display: { xs: 'none', md: 'flex' } }}
              >
                <InfoIcon />
              </IconButton>
            </Box>

            {/* Message search */}
            <MessageSearchComponent />

            {/* Messages container - Improved scrolling */}
            <Box
              ref={messagesContainerRef}
              sx={{
                flex: 1,
                overflowY: 'auto',
                p: 2,
                bgcolor: '#f5f8fa',
                display: 'flex',
                flexDirection: 'column',
                '&::-webkit-scrollbar': { width: '8px' },
                '&::-webkit-scrollbar-track': { bgcolor: 'rgba(0,0,0,0.05)' },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.15)', borderRadius: '4px' },
                pb: 2 // Add extra padding at the bottom
              }}
            >
              {messages.map((message) => (
                <MessageComponent key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} style={{ height: '1px', width: '100%' }} />
            </Box>

            {/* Fixed position containers for reply banner, image preview, and input */}
            {replyTo && (
              <Box
                sx={{
                  p: 1,
                  bgcolor: 'background.paper',
                  borderTop: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative', // Changed from sticky to relative
                  zIndex: 5
                }}
              >
                {/* ... existing reply banner code ... */}
              </Box>
            )}

            {/* Image/file preview */}
            {(imagePreview || filePreview) && (
                <Box
                  sx={{
                  p: 1.5,
                  bgcolor: 'background.paper',
                  borderTop: !replyTo && 1,
                  borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative', // Changed from sticky to relative
                  zIndex: 4
                  }}
                >
                {/* ... existing preview code ... */}
              </Box>
            )}

            {/* Message input - fixed at the bottom */}
                  <Box
                    sx={{
                p: 2,
                borderTop: !(replyTo || imagePreview || filePreview) && 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                position: 'relative', // Changed from sticky to relative
                bgcolor: 'background.paper',
                zIndex: 3
              }}
            >
              {/* ... existing message input code ... */}
                </Box>
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#f5f8fa',
              p: 3
            }}
          >
            <Typography variant="h6" color="textSecondary">
              Select a chat to start messaging
            </Typography>
          </Box>
        )}

        {/* User info panel - Fixed for desktop, hidden for mobile */}
        {!isMobile && selectedChat && showUserInfo && (
          <Box
            sx={{
              width: { sm: 220, md: 280 },
              borderLeft: 1,
              borderColor: 'divider',
              display: { xs: 'none', md: 'block' },
              overflow: 'auto',
              flexShrink: 0,
            }}
          >
            {selectedChat.participants
              .filter(p => p.username !== username)
              .map(participant => (
                <Box key={participant.username} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">User Profile</Typography>
                    <IconButton size="small" onClick={() => setShowUserInfo(false)}>
                      <CloseIcon />
                    </IconButton>
                  </Box>
                  <Divider sx={{ mb: 3 }} />
                  
                  {/* User Avatar and Name */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                    <Avatar 
                      src={formatImageUrl(participant.avatar_url || '')}
                      alt={participant.username || ''}
                      sx={{ width: 100, height: 100, mb: 2 }}
                    >
                      {participant.username?.[0]?.toUpperCase() || '?'}
                    </Avatar>
                    <Typography variant="h6" gutterBottom>
                      {participant.display_name || participant.username}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      @{participant.username}
                    </Typography>
                    
                    <Button 
                      variant="outlined" 
                      size="small" 
                      startIcon={<PersonIcon />}
                      onClick={() => navigate(`/profile/${participant.username}`)}
                      sx={{ mt: 1 }}
                    >
                      View Full Profile
                    </Button>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  {/* User Information */}
                  <Box>
                    <Typography variant="subtitle2" gutterBottom color="primary">
                      User Information
                    </Typography>
                    
                    <List dense disablePadding>
                      {participant.bio && (
                        <ListItem sx={{ px: 0, py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <InfoIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Bio"
                            secondary={participant.bio}
                            primaryTypographyProps={{ variant: 'caption', color: 'textSecondary' }}
                            secondaryTypographyProps={{ 
                              variant: 'body2',
                              sx: { 
                                whiteSpace: 'normal',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                              }
                            }}
                          />
                        </ListItem>
                      )}
                      
                      <ListItem sx={{ px: 0, py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <EmailIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Email" 
                          secondary={participant.email || 'Not available'}
                          primaryTypographyProps={{ variant: 'caption', color: 'textSecondary' }}
                        />
                      </ListItem>
                      
                      {participant.active_hours && participant.active_hours.length > 0 && (
                        <ListItem sx={{ px: 0, py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <AccessTimeIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Active Hours" 
                            secondary={participant.active_hours.join(', ')}
                            primaryTypographyProps={{ variant: 'caption', color: 'textSecondary' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Box>
                  
                  {participant.platforms && participant.platforms.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box>
                        <Typography variant="subtitle2" gutterBottom color="primary">
                          Gaming Platforms
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                          {participant.platforms.map(platform => (
                            <Chip 
                              key={platform} 
                              label={platform} 
                              size="small" 
                              sx={{ m: 0.5 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    </>
                  )}
                  
                  {participant.language_preference && participant.language_preference.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box>
                        <Typography variant="subtitle2" gutterBottom color="primary">
                          Languages
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                          {participant.language_preference.map(language => (
                            <Chip 
                              key={language} 
                              label={language} 
                              size="small" 
                              sx={{ m: 0.5 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    </>
                  )}

                  {participant.social_links && participant.social_links.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box>
                        <Typography variant="subtitle2" gutterBottom color="primary">
                          Social Links
                        </Typography>
                        <List dense disablePadding>
                          {participant.social_links.map((link, index) => (
                            <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <LinkIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary={
                                  <Link href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer">
                                    {link}
                                  </Link>
                                }
                                primaryTypographyProps={{ 
                                  variant: 'body2',
                                  sx: { 
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    </>
                  )}
                </Box>
              ))}
          </Box>
        )}
      </Box>

      {/* Message menu */}
      <MessageMenu />

      {/* Emoji picker */}
      <EmojiPickerComponent />

      {/* Add this context menu component */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={() => handleReply(selectedMessage)}>
          <ReplyIcon fontSize="small" sx={{ mr: 1 }} />
          Reply
        </MenuItem>
        
        <MenuItem>
          <Box sx={{ width: '100%' }}>
            <Typography variant="body2" sx={{ mb: 1 }}>React with</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {PREDEFINED_EMOJIS.map(emoji => (
                <IconButton 
                  key={emoji}
                  size="small" 
                  onClick={() => handleAddReaction(emoji)}
                >
                  {emoji}
                </IconButton>
              ))}
            </Box>
          </Box>
        </MenuItem>
        
        {selectedMessage && selectedMessage.sender.username === username && (
          <MenuItem onClick={handleDeleteMessage} sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Typing indicator example - add this inside the messages container before the messagesEndRef */}
      {Object.keys(typingUsers).length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, mb: 2 }}>
          <Avatar
            src={formatImageUrl(typingUsers[Object.keys(typingUsers)[0]]?.avatar_url)}
            sx={{ width: 24, height: 24, mr: 1 }}
          >
            {typingUsers[Object.keys(typingUsers)[0]]?.username?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={typingDotStyle(0)} />
            <Box sx={typingDotStyle(0.2)} />
            <Box sx={typingDotStyle(0.4)} />
          </Box>
          <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
            typing...
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default Chat; 