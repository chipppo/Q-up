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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Link,
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
  Block as BlockIcon,
  Report as ReportIcon,
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

// Define the Message component for rendering individual messages
const Message = memo(({ message }) => {
  const { username } = useAuth();
  const isOwnMessage = typeof message.sender === 'string' 
    ? message.sender === username 
    : message.sender?.username === username;
  
  const senderName = typeof message.sender === 'string' 
    ? message.sender 
    : message.sender?.display_name || message.sender?.username || 'Unknown';
  
  const messageTime = message.timestamp || message.created_at || new Date();
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
        mb: 2,
        maxWidth: '80%',
        alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
      }}
    >
      {!isOwnMessage && (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mb: 0.5 }}>
          {senderName}
        </Typography>
      )}
      
      <div className={`message-bubble ${isOwnMessage ? 'sent' : 'received'}`}>
        {message.reply_to && (
          <Box 
            className="reply-preview"
            sx={{
              borderLeft: '3px solid',
              borderColor: 'primary.main',
              pl: 1,
              py: 0.5,
              opacity: 0.7,
              mb: 1,
              fontSize: '0.85rem',
            }}
          >
            {typeof message.reply_to === 'string' ? message.reply_to : message.reply_to?.content || ''}
          </Box>
        )}
        
        {message.content && (
          <Typography variant="body1">{message.content}</Typography>
        )}
        
        {(message.image || message.has_image) && (
          <Box mt={message.content ? 1 : 0}>
            <img 
              src={formatImageUrl(message.image)}
              alt="Message attachment" 
              className="message-image"
              style={{ maxWidth: '100%', borderRadius: '8px' }}
            />
          </Box>
        )}
      </div>
      
      <Typography 
        variant="caption" 
        color="text.secondary"
        sx={{ mt: 0.5, mr: isOwnMessage ? 1 : 0, ml: isOwnMessage ? 0 : 1 }}
      >
        {new Date(messageTime).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        })}
        {isOwnMessage && message.is_read !== undefined && (
          <span style={{ marginLeft: '5px' }}>
            {message.is_read ? <DoneAllIcon fontSize="inherit" /> : <CheckIcon fontSize="inherit" />}
          </span>
        )}
      </Typography>
    </Box>
  );
});

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
  const [showUserInfo, setShowUserInfo] = useState(false);
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
  const MessageInput = () => {
    const { username } = useAuth();
    const [message, setMessage] = useState('');
    
    const handleSendMessage = () => {
      if (!message.trim() || !selectedChat) return;
      
      // Correct API structure: POST /chats/{chat_id}/messages/
      const messageData = {
        content: message
        // chat_id is in the URL path, not the payload
      };
      
      API.post(`/chats/${selectedChat.id}/messages/`, messageData)
        .then(response => {
          setMessage('');
          console.log('Message sent successfully:', response.data);
        })
        .catch(err => {
          console.error('Error sending message:', err);
          toast.error('Failed to send message');
        });
    };
    
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <TextField
          fullWidth
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          variant="outlined"
          size="small"
          multiline
          maxRows={4}
          sx={{ mr: 1 }}
        />
        <IconButton 
          color="primary" 
          onClick={handleSendMessage}
          disabled={!message.trim() || !selectedChat}
        >
          <SendIcon />
        </IconButton>
      </Box>
    );
  };

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

  const renderChatListHeader = () => (
    <Box>
        {location.state?.returnTo && (
          <IconButton onClick={handleBack} sx={{ mb: 1 }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <TextField
          fullWidth
        size="small"
        placeholder="Search users..."
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
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'background.paper',
          }
          }}
        />
      </Box>
  );

  const renderChatList = () => (
    <Box sx={{ overflow: 'auto' }}>
        {searchQuery ? (
        // Show search results
        searchResults.length > 0 ? (
          <List>
            {searchResults.map((user) => (
            <ListItem
              key={user.username}
                button
              onClick={() => handleStartChat(user.username)}
                sx={{ py: 1 }}
            >
              <ListItemAvatar>
                  <Avatar src={formatImageUrl(user.avatar_url)}>
                  {user.username[0].toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={user.display_name || user.username}
                secondary="Start new chat"
              />
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
        // Show existing chats
        <List>
          {chats.map((chat) => {
            const otherParticipant = chat.participants.find(p => p.username !== username);
            return (
              <ListItemButton
                key={chat.id}
                selected={selectedChat?.id === chat.id}
                onClick={() => handleChatSelect(chat)}
                sx={{ 
                  py: 1.5,
                  borderLeft: selectedChat?.id === chat.id ? '3px solid' : 'none',
                  borderColor: 'primary.main',
                  bgcolor: selectedChat?.id === chat.id ? 'action.selected' : 'transparent',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ListItemAvatar>
                    <Badge
                      color="primary"
                      badgeContent={chat.unread_count}
                      invisible={!chat.unread_count}
                    >
                      <Avatar 
                      src={formatImageUrl(otherParticipant?.avatar_url)}
                      alt={otherParticipant?.username}
                      >
                      {otherParticipant?.username?.[0]?.toUpperCase()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={otherParticipant?.display_name || otherParticipant?.username}
                    secondary={
                    chat.last_message ? (
                      <Typography 
                        noWrap 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ maxWidth: '180px' }}
                      >
                        {chat.last_message.sender === username ? 'You: ' : ''}
                        {chat.last_message.has_image && !chat.last_message.content ? 
                          '📷 Image' : chat.last_message.content}
                      </Typography>
                    ) : 'No messages yet'
                    }
                    primaryTypographyProps={{
                    fontWeight: chat.unread_count ? 'bold' : 'normal',
                    }}
                    secondaryTypographyProps={{
                    fontWeight: chat.unread_count ? 'medium' : 'normal',
                    }}
                  />
                </ListItemButton>
            );
          })}
      </List>
      )}
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
              <Message key={message.id} message={message} />
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

  // Add this component to handle the user info panel content
  const UserInfoContent = ({ otherUser, onClose }) => {
    const navigate = useNavigate();
    const [blockDialogOpen, setBlockDialogOpen] = useState(false);

    // Helper function to format active hours into groups of consecutive hours
    const formatActiveHours = (hours) => {
      if (!hours || !Array.isArray(hours) || hours.length === 0) return [];
      
      // Sort hours numerically
      const sortedHours = [...hours].sort((a, b) => parseInt(a) - parseInt(b));
      
      // Group consecutive hours
      const groups = [];
      let currentGroup = [sortedHours[0]];
      
      for (let i = 1; i < sortedHours.length; i++) {
        const current = parseInt(sortedHours[i]);
        const previous = parseInt(sortedHours[i-1]);
        
        if (current === previous + 1) {
          // Hour is consecutive, add to current group
          currentGroup.push(sortedHours[i]);
        } else {
          // Hour is not consecutive, start new group
          groups.push([...currentGroup]);
          currentGroup = [sortedHours[i]];
        }
      }
      
      // Add the last group
      groups.push(currentGroup);
      return groups;
    };

    const handleBlockUser = async () => {
      try {
        // This would call an API to block the user
        // await API.post(`/users/${otherUser.username}/block/`);
        toast.success(`You have blocked ${otherUser.username}`);
        setBlockDialogOpen(false);
        // Optionally navigate away or refresh the chat list
      } catch (error) {
        console.error('Error blocking user:', error);
        toast.error('Failed to block user');
      }
    };

    return (
      <Box className="user-info-content" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" component="h2">
            User Profile
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* User Profile Header */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar
            src={formatImageUrl(otherUser?.avatar_url)}
            sx={{ width: 120, height: 120, mb: 2 }}
          >
            {otherUser?.username?.[0]?.toUpperCase()}
          </Avatar>
          <Typography variant="h6">
            {otherUser?.display_name || otherUser?.username}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            @{otherUser?.username}
          </Typography>
          <Button 
            variant="outlined" 
            onClick={() => navigate(`/profile/${otherUser?.username}`)}
            startIcon={<PersonIcon />}
            fullWidth
          >
            View Full Profile
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* User Basic Info */}
        <Box>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold" color="primary">
            Basic Information
          </Typography>
          <List dense disablePadding>
            {otherUser?.bio && (
              <ListItem sx={{ px: 0, py: 1 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Bio"
                  secondary={otherUser.bio}
                  primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            )}
            {otherUser?.email && (
              <ListItem sx={{ px: 0, py: 1 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <EmailIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Email"
                  secondary={otherUser.email}
                  primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            )}
            <ListItem sx={{ px: 0, py: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <AccessTimeIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Joined"
                secondary={otherUser?.created_at ? new Date(otherUser.created_at).toLocaleDateString() : 'Not available'}
                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                secondaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Gaming Info */}
        <Box>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold" color="primary">
            Gaming Information
          </Typography>
          
          {/* Platforms */}
          {otherUser?.platforms && otherUser.platforms.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Platforms
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {otherUser.platforms.map((platform, idx) => (
                  <Chip 
                    key={idx}
                    label={platform}
                    size="small"
                    sx={{ 
                      fontSize: '0.75rem',
                      height: 24,
                      bgcolor: 'action.selected'
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
          
          {/* Languages */}
          {otherUser?.language_preference && otherUser.language_preference.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Languages
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {otherUser.language_preference.map((lang, idx) => (
                  <Chip 
                    key={idx}
                    label={lang}
                    size="small"
                    sx={{ 
                      fontSize: '0.75rem',
                      height: 24,
                      bgcolor: 'action.selected'
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
          
          {/* Mic Available */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Microphone
            </Typography>
            <Chip 
              icon={otherUser?.mic_available ? <CheckIcon /> : <CloseIcon />}
              label={otherUser?.mic_available ? "Available" : "Not Available"}
              size="small"
              color={otherUser?.mic_available ? "success" : "default"}
              sx={{ 
                fontSize: '0.75rem',
                height: 24
              }}
            />
          </Box>
          
          {/* Active Hours */}
          {otherUser?.active_hours && otherUser.active_hours.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Active Hours (User's local time)
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {formatActiveHours(otherUser.active_hours).map((group, idx) => (
                  <Chip 
                    key={idx}
                    label={`${group[0]} - ${group[group.length-1]}`}
                    size="small"
                    className="active-hour-chip"
                    sx={{ 
                      fontSize: '0.75rem',
                      height: 24,
                      alignSelf: 'flex-start',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Social Links */}
        {otherUser?.social_links && otherUser.social_links.length > 0 && (
          <>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold" color="primary">
              Social Links
            </Typography>
            <List dense disablePadding>
              {otherUser.social_links.map((link, idx) => (
                <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <LinkIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Link 
                        href={link.startsWith('http') ? link : `https://${link}`} 
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: 'primary.main' }}
                      >
                        {link}
                      </Link>
                    }
                  />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* Actions */}
        <Box>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold" color="primary">
            Actions
          </Typography>
          <Button 
            variant="outlined" 
            color="error"
            startIcon={<BlockIcon />}
            fullWidth
            onClick={() => setBlockDialogOpen(true)}
            sx={{ mb: 1 }}
          >
            Block User
          </Button>
          <Button 
            variant="outlined"
            startIcon={<ReportIcon />}
            fullWidth
          >
            Report User
          </Button>
        </Box>
        
        {/* Block User Dialog */}
        <Dialog
          open={blockDialogOpen}
          onClose={() => setBlockDialogOpen(false)}
        >
          <DialogTitle>Block User?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to block {otherUser?.username}? 
              You will no longer receive messages from this user.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBlockUser} color="error" variant="contained">
              Block
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  // Add this function before the return statement
  const renderChatHeader = () => {
    const otherUser = selectedChat?.participants.find(p => p.username !== username);
    
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
              setSelectedChat(null);
            }} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
          )}
          
          <Avatar
            sx={{ width: 40, height: 40 }}
            src={formatImageUrl(otherUser?.avatar_url)}
          >
            {otherUser?.username?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ ml: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              {otherUser?.display_name || otherUser?.username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {otherUser?.status || 'Offline'}
            </Typography>
        </Box>
        </Box>

        <IconButton 
          onClick={(e) => {
            e.stopPropagation();
            setShowUserInfo(!showUserInfo);
          }}
          color={showUserInfo ? "primary" : "default"}
        >
          <InfoIcon />
        </IconButton>
      </Box>
    );
  };

  // Update the main container and layout to match Instagram's behavior
  return (
    <Box 
        sx={{ 
        position: 'fixed',
        top: 64, // Height of the main navbar
        left: 0,
        right: 0,
        bottom: 0,
          display: 'flex', 
          overflow: 'hidden',
        bgcolor: 'background.default',
        width: '100%' // Ensure full width
      }}
    >
      {/* Chat list - fixed width */}
      <Box
        sx={{
          width: isMobile && selectedChat ? '0' : '300px',
          display: isMobile && selectedChat ? 'none' : 'flex',
          flexDirection: 'column',
          borderRight: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          bgcolor: 'background.paper',
          flexShrink: 0,
        }}
      >
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}>
          {renderChatListHeader()}
        </Box>

        <Box sx={{ 
          flexGrow: 1,
          overflow: 'auto',
        }}>
        {renderChatList()}
        </Box>
      </Box>
        
      {/* Main chat area - flexible width */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
        flexGrow: 1,
        height: '100%',
        overflow: 'hidden',
        width: showUserInfo ? 'calc(100% - 600px)' : 'calc(100% - 300px)', // Adjust width based on drawer
      }}>
        {selectedChat ? (
          <>
            {renderChatHeader()}
            <Box 
              className="messages-container"
              sx={{
                flexGrow: 1,
                overflow: 'auto',
                width: '100%',
              }}
            >
              {messages.map((message) => (
                <Message key={message.id} message={message} />
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
            }}
          >
            <Typography variant="h6" color="textSecondary">
              Select a chat or search for users to start messaging
            </Typography>
          </Box>
        )}
      </Box>

      {/* Drawer - fixed width */}
      <Drawer
        variant="persistent"
        anchor="right"
        open={showUserInfo}
        sx={{
          width: 300,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 300,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderLeft: '1px solid',
            borderColor: 'divider',
            height: '100%',
            top: 'auto',
            position: 'relative',
          },
        }}
      >
        <UserInfoContent 
          otherUser={selectedChat?.participants.find(p => p.username !== username)} 
          onClose={() => setShowUserInfo(false)}
        />
      </Drawer>

      <MessageMenu />
      <EmojiPickerComponent />
    </Box>
  );
};

export default Chat; 