import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
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

const PREDEFINED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '��', '🙏', '🔥'];

// Utility function to safely format image URLs
const formatImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API.defaults.baseURL}${url}`;
};

// Add this utility function that's referenced but missing
const stringToColor = (string) => {
  let hash = 0;
  let i;
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (i = 0; i < 3; i += 1) {
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
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messageInputRef = useRef(null);
  const editInputRef = useRef(null);
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

  // Message input handlers
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    if ((!newMessage.trim() && !selectedImage && !selectedFile) || !selectedChat) {
      return;
    }
    
    setSending(true);
    
    try {
      // Create form data for file upload
      const formData = new FormData();
      
      // Add message content if present
      if (newMessage.trim()) {
        formData.append('content', newMessage.trim());
      }
      
      // Add image if present
      if (selectedImage) {
        formData.append('image', selectedImage);
      }
      
      // Add file if present
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      
      // Add reply_to if replying to a message
      if (replyTo) {
        formData.append('parent', replyTo.id);
      }
      
      const response = await API.post(`/chats/${selectedChat.id}/messages/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Add the new message to the messages array
      setMessages(prevMessages => [...prevMessages, response.data]);
      
      // Reset form state
      setNewMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedFile(null);
      setFilePreview(null);
      setReplyTo(null);
      
      // Scroll to the bottom of the messages
      scrollToBottom();
      
      // Refresh the chat list to update the latest message
      fetchChats();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleEmojiButtonClick = (event) => {
    if (emojiAnchorEl) {
      setEmojiAnchorEl(null);
    } else {
      setEmojiAnchorEl(event.currentTarget);
    }
  };

  const handleRemoveFile = () => {
    if (selectedImage) {
      setSelectedImage(null);
      setImagePreview(null);
    }
    if (selectedFile) {
      setSelectedFile(null);
      setFilePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (documentInputRef.current) {
      documentInputRef.current.value = '';
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

  // Add the missing context menu handler
  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  // Message input component
  const MessageInput = memo(() => {
    return (
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

          <IconButton 
            onClick={() => fileInputRef.current?.click()}
            size="small"
            color={selectedImage ? 'primary' : 'default'}
          >
            <ImageIcon fontSize="small" />
          </IconButton>

          <IconButton 
            onClick={() => documentInputRef.current?.click()}
            size="small"
            color={selectedFile ? 'primary' : 'default'}
          >
            <AttachFileIcon fontSize="small" />
          </IconButton>

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
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder={replyTo ? `Reply to ${replyTo.sender.username}...` : "Type a message..."}
            variant="outlined"
            size="small"
            inputRef={messageInputRef}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: 'background.paper'
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
  });

  // Add the missing MessageMenu component and related functions
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

  // Add missing EmojiPickerComponent
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

  // Add missing handleReplyMessage function
  const handleReplyMessage = (message) => {
    if (!message) return;
    setReplyTo(message);
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  // Add missing handleDeleteMessage function
  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;
    
    try {
      await API.delete(`/messages/${messageId}/`);
      
      // Update local state
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
      
      // Close any open menus
      setContextMenu(null);
      setSelectedMessage(null);
      setMessageMenuAnchorEl(null);
      setSelectedMessageForMenu(null);
      
      toast.success('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  // Add missing handleAddReaction function
  const handleAddReaction = async (emoji) => {
    if (!selectedMessage) return;
    
    try {
      await API.post(`/messages/${selectedMessage.id}/reactions/`, { emoji });
      
      setMessages(prevMessages =>
        prevMessages.map(msg => {
          if (msg.id === selectedMessage.id) {
            const reactions = [...(msg.reactions || [])];
            const existingReaction = reactions.findIndex(r => r.user.username === username);
            
            if (existingReaction >= 0) {
              reactions[existingReaction] = {
                ...reactions[existingReaction],
                emoji
              };
            } else {
              reactions.push({
                id: Date.now(),
                emoji,
                user: { username }
              });
            }
            
            return { ...msg, reactions };
          }
          return msg;
        })
      );
      
      // Close context menu
      setContextMenu(null);
      setSelectedMessage(null);
      
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast.error('Failed to add reaction');
    }
  };

  // Handle window resize
  const handleResize = () => setIsMobile(window.innerWidth <= 768);

  // Add missing handleBack function
  const handleBack = () => {
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
    } else {
      navigate(-1);
    }
  };

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

  // Clean up any open menus or pickers when chat changes
  useEffect(() => {
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
      // Clean up any open menus or pickers
      setEmojiAnchorEl(null);
      setMessageMenuAnchorEl(null);
      setSelectedMessageForMenu(null);
      setEditingMessage(null);
      setEditContent('');
      setReplyTo(null);
    };
  }, []);

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

  useEffect(() => {
    if (editingMessage && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMessage]);

  const renderChatList = () => (
    <Box
      sx={{
        width: isMobile && selectedChat ? '0' : '300px',
        display: isMobile && selectedChat ? 'none' : 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #444',
        height: '100%'
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid #444' }}>
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
                        ? `${chat.last_message.sender === username ? 'You' : 
                            (typeof chat.last_message.sender === 'object' ? 
                              chat.last_message.sender?.username : 
                              chat.last_message.sender) || 'Unknown'}: ${
                            chat.last_message.has_image || chat.last_message.image
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
          <Box sx={{ p: 2, borderBottom: '1px solid #444', display: 'flex', alignItems: 'center' }}>
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
        </>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            bgcolor: 'background.paper'
          }}
        >
          <Typography variant="h6" color="textSecondary">
            Select a chat or search for users to start messaging
          </Typography>
        </Box>
      )}
    </Box>
  );

  const MessageComponent = ({ message }) => {
    const isOwnMessage = message.sender.username === username;
    const isEditing = editingMessage?.id === message.id;
    const messageLength = message.content?.length || 0;
    const isShortMessage = messageLength < 20 && !message.image && !message.file;
    const isHighlighted = message.id === highlightedMessageId;
    const hasFile = message.file;
    const [showOptionsButton, setShowOptionsButton] = useState(false);
    const [menuAnchorEl, setMenuAnchorEl] = useState(null);

    const handleMenuClick = (event) => {
      event.stopPropagation();
      setMenuAnchorEl(event.currentTarget);
    };
    
    const handleMenuClose = () => {
      setMenuAnchorEl(null);
    };

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
        onMouseEnter={() => setShowOptionsButton(true)}
        onMouseLeave={() => setShowOptionsButton(false)}
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

          <Box sx={{ maxWidth: { xs: '80%', sm: '85%' }, position: 'relative' }}>
            <Typography variant="caption" color="textSecondary">
              {message.sender.username}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  backgroundColor: isOwnMessage ? 'primary.main' : 'background.default',
                  color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
                  borderRadius: 2,
                  maxWidth: '100%',
                  width: isShortMessage ? 'auto' : undefined,
                  position: 'relative',
                  wordBreak: 'break-word',
                }}
              >
                {isEditing ? (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      inputRef={editInputRef}
                      size="small"
                      multiline
                      maxRows={4}
                      autoFocus
                      sx={{
                        '& .MuiInputBase-input': {
                          textAlign: 'left'
                        },
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'background.paper'
                        }
                      }}
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          handleEditMessage(message.id, editContent);
                        }}
                        color="primary"
                        sx={{
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          '&:hover': {
                            backgroundColor: 'primary.dark',
                          },
                          mb: 1
                        }}
                      >
                        <CheckIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingMessage(null);
                        }}
                        sx={{
                          backgroundColor: 'action.hover',
                          '&:hover': {
                            backgroundColor: 'action.selected',
                          }
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
                  </>
                )}
              </Paper>

              {!isEditing && (
                <IconButton
                  size="small"
                  onClick={handleMenuClick}
                  sx={{
                    opacity: showOptionsButton ? 0.9 : 0,
                    transition: 'opacity 0.2s',
                    alignSelf: 'center',
                    color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
                    backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                    '&:hover': {
                      opacity: 1,
                      backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)'
                    }
                  }}
                >
                  <MoreIcon fontSize="small" />
                </IconButton>
              )}

              <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: isOwnMessage ? 'right' : 'left',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: isOwnMessage ? 'right' : 'left',
                }}
                slotProps={{
                  paper: {
                    elevation: 3,
                    sx: { 
                      mt: 1,
                      minWidth: 120
                    }
                  }
                }}
              >
                <MenuItem onClick={() => {
                  handleReplyMessage(message);
                  handleMenuClose();
                }}>
                  <ReplyIcon sx={{ mr: 1 }} /> Reply
                </MenuItem>
                {message.sender.username === username && [
                  <MenuItem 
                    key="edit" 
                    onClick={() => {
                      setEditingMessage(message);
                      setEditContent(message.content || '');
                      handleMenuClose();
                    }}
                  >
                    <EditIcon sx={{ mr: 1 }} /> Edit
                  </MenuItem>,
                  <MenuItem 
                    key="delete" 
                    onClick={() => {
                      handleDeleteMessage(message.id);
                      handleMenuClose();
                    }}
                  >
                    <DeleteIcon sx={{ mr: 1 }} /> Delete
                  </MenuItem>
                ]}
              </Menu>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

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

  const handleMessageSearch = () => {
    if (!messageSearchQuery.trim()) {
      return;
    }
    
    const query = messageSearchQuery.toLowerCase();
    const matched = messages.filter(msg => 
      msg.content && msg.content.toLowerCase().includes(query)
    );
    
    setSearchedMessages(matched);
    setCurrentSearchIndex(matched.length > 0 ? 0 : -1);
    
    if (matched.length > 0) {
      scrollToMessage(matched[0].id);
    } else {
      toast.info("No messages found matching your search.");
    }
  };

  const scrollToMessage = (messageId) => {
    setHighlightedMessageId(messageId);
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Clear the highlight after a short time
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
    }
  };

  const handleNextSearchResult = () => {
    if (searchedMessages.length === 0) return;
    
    const nextIndex = (currentSearchIndex + 1) % searchedMessages.length;
    setCurrentSearchIndex(nextIndex);
    scrollToMessage(searchedMessages[nextIndex].id);
  };

  const handlePreviousSearchResult = () => {
    if (searchedMessages.length === 0) return;
    
    const prevIndex = (currentSearchIndex - 1 + searchedMessages.length) % searchedMessages.length;
    setCurrentSearchIndex(prevIndex);
    scrollToMessage(searchedMessages[prevIndex].id);
  };

  const handleMessageContextMenu = (event, message) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    });
    setSelectedMessage(message);
  };
  
  const handleEditMessage = async (messageId, content) => {
    if (!content.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('content', content.trim());
      
      // Send the request using the correct API endpoint format
      const response = await API.patch(`/messages/${messageId}/`, formData);

      // Update the message in the state
      setMessages(prevMessages => prevMessages.map(msg => 
        msg.id === messageId ? response.data : msg
      ));

      // Reset editing state
      setEditingMessage(null);
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error(error.response?.data?.detail || 'Failed to edit message');
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
      <Paper 
        elevation={3} 
        sx={{ 
          display: 'flex', 
          height: '100%', 
          overflow: 'hidden',
          bgcolor: 'background.paper'
        }}
      >
        {renderChatList()}
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          width: '100%', 
          height: '100%' 
        }}>
          {showMessageSearch && <MessageSearchComponent />}
          {renderChatMessages()}
        </Box>
      </Paper>

      <MessageMenu />

      <EmojiPickerComponent />

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
        <MenuItem onClick={() => handleReplyMessage(selectedMessage)}>
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
    </Container>
  );
};

export default Chat; 