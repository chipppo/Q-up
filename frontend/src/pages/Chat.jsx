import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  List,
  ListItem,
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
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Close as CloseIcon,
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
  Mic as MicIcon,
  MicOff as MicOffIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { toast } from 'react-toastify';
import './Chat.css';
import { keyframes } from '@emotion/react';

// Define time periods with their corresponding hours - add this near the top of the file
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

// Define a utility function for formatting message timestamps in a user-friendly way
const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  const messageDate = new Date(timestamp);
  const now = new Date();
  const diffMs = now - messageDate;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  // Just now: less than 1 minute ago
  if (diffMin < 1) return 'just now';
  
  // X minutes ago: less than 60 minutes ago
  if (diffHour < 1) return `${diffMin}m ago`;
  
  // Today: format as hour:minute
  if (diffDay < 1) return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Yesterday
  if (diffDay === 1) return 'Yesterday';
  
  // This week: show day name
  if (diffDay < 7) {
    return messageDate.toLocaleDateString([], { weekday: 'short' });
  }
  
  // Older: show date
  return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// Define the Message component for rendering individual messages
const Message = memo(({ message, highlightedId, onMenuOpen }) => {
  const { username } = useAuth();
  const isOwnMessage = typeof message.sender === 'string' 
    ? message.sender === username 
    : message.sender?.username === username;
  
  // Add React imports
  const { useEffect, useState } = React;
  
  // Local state for this message's menu
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  // Get the API
  const APIInstance = API;
  
  const senderName = typeof message.sender === 'string' 
    ? message.sender 
    : message.sender?.display_name || message.sender?.username || 'Unknown';
  
  const messageTime = message.timestamp || message.created_at || new Date();
  
  // Function to determine if the attachment is an image or a file
  const isImageAttachment = (url) => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    return imageExtensions.some(ext => url.toLowerCase().endsWith(ext));
  };
  
  // Function to extract file name from URL
  const getFileName = (url) => {
    if (!url) return 'File';
    const parts = url.split('/');
    return parts[parts.length - 1];
  };
  
  // Handle file download
  const handleFileDownload = (url, fileName) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const isHighlighted = highlightedId === message.id;

  // Handle menu open/close locally
  const handleMenuClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleMenuAction = (action) => {
    if (onMenuOpen) {
      onMenuOpen(anchorEl, message, action);
    }
    handleMenuClose();
  };

  return (
    <Box
      className={`message-wrapper ${isOwnMessage ? 'sent' : 'received'}`}
    >
      {!isOwnMessage && (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mb: 0.5 }}>
          {senderName}
        </Typography>
      )}
      
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'flex-start', 
          maxWidth: '100%',
          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
          width: '100%'
        }}
      >
        {!isOwnMessage && (
          <IconButton 
            size="small" 
            onClick={handleMenuClick}
            sx={{ 
              opacity: 0.5, 
              mr: 0.5, 
              minWidth: '24px',
              flexShrink: 0,
              '&:hover': { opacity: 1 } 
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )}
        
        <div 
          className={`message-bubble ${isOwnMessage ? 'sent' : 'received'} ${isHighlighted ? 'highlighted-message' : ''}`}
          id={`message-${message.id}`}
          style={{ 
            backgroundColor: isHighlighted ? 'rgba(255, 214, 0, 0.2)' : undefined,
            maxWidth: isOwnMessage ? 'calc(100% - 40px)' : 'calc(100% - 40px)'
          }}
        >
        {message.parent && (
          <Box 
            className="reply-preview"
            sx={{
              borderLeft: '3px solid',
              borderColor: 'primary.main',
              pl: 1,
              py: 0.5,
              opacity: 0.8,
              mb: 1,
              fontSize: '0.85rem',
              backgroundColor: 'rgba(0, 255, 170, 0.05)',
              borderRadius: '4px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <Typography variant="caption" fontWeight="medium" sx={{ display: 'block', mb: 0.5 }}>
              {message.parent_sender || (message.parent?.sender?.username ? message.parent.sender.username : 'User')}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {message.parent_message?.content || message.parent?.content || (message.parent?.has_image ? 'Image' : 'File')}
            </Typography>
          </Box>
        )}
        
        {message.content && (
          <div className="message-content" style={{ overflowWrap: 'anywhere', wordBreak: 'break-all', maxWidth: '100%' }}>
            {message.content}
          </div>
        )}
        
        {(message.image || message.has_image) && (
          <Box mt={message.content ? 1 : 0} sx={{ width: '100%', boxSizing: 'border-box' }}>
            {isImageAttachment(formatImageUrl(message.image)) ? (
              <img 
                src={formatImageUrl(message.image)}
                alt="Message attachment" 
                className="message-image"
                style={{ maxWidth: '100%', borderRadius: '8px' }}
              />
            ) : (
              <Box 
                className="file-attachment"
                onClick={() => handleFileDownload(formatImageUrl(message.image), getFileName(message.image))}
              >
                <AttachFileIcon />
                <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', ml: 1 }}>
                  <Typography className="file-name" variant="body2" noWrap sx={{ fontWeight: 'medium' }}>
                    {getFileName(message.image)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Click to download
                  </Typography>
                </Box>
                <DownloadIcon sx={{ ml: 'auto' }} />
              </Box>
            )}
          </Box>
        )}
        </div>
        
        {isOwnMessage && (
          <IconButton 
            size="small" 
            onClick={handleMenuClick}
            sx={{ 
              opacity: 0.5, 
              ml: 0.5, 
              minWidth: '24px',
              flexShrink: 0,
              '&:hover': { opacity: 1 } 
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )}
        
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          MenuListProps={{
            'aria-labelledby': 'message-options',
          }}
        >
          <MenuItem onClick={() => handleMenuAction('reply')}>
            <ListItemIcon>
              <ReplyIcon fontSize="small" />
            </ListItemIcon>
            Reply
          </MenuItem>
          {isOwnMessage && (
            <MenuItem onClick={() => handleMenuAction('edit')}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              Edit
            </MenuItem>
          )}
          {isOwnMessage && (
            <MenuItem onClick={() => handleMenuAction('delete')}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <Typography color="error">Delete</Typography>
            </MenuItem>
          )}
        </Menu>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: isOwnMessage ? 'auto' : 1, mr: isOwnMessage ? 1 : 'auto' }} className="message-timestamp">
        {new Date(messageTime).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        })}
        {isOwnMessage && message.is_read !== undefined && (
          <span className="message-status">
            {message.is_read ? 
              <span style={{ marginLeft: '5px', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center' }}>
                <DoneAllIcon fontSize="inherit" style={{ marginRight: '2px' }} /> Seen
              </span> 
              : 
              <span style={{ marginLeft: '5px', color: 'var(--color-text-tertiary)', display: 'inline-flex', alignItems: 'center' }}>
                <CheckIcon fontSize="inherit" style={{ marginRight: '2px' }} /> Sent
              </span>
            }
          </span>
        )}
      </Typography>
    </Box>
  );
});

// Add an EditMessageForm component before the main Chat component
const EditMessageForm = ({ message, onSave, onCancel }) => {
  const [content, setContent] = useState(message.content || '');
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  const handleSave = () => {
    if (content.trim()) {
      onSave(message.id, content);
    }
  };
  
  return (
    <Box
      sx={{
        p: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.selected',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Editing message
        </Typography>
      </Box>
      
      <TextField
        fullWidth
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
          }
        }}
        variant="outlined"
        size="small"
        multiline
        maxRows={4}
        inputRef={inputRef}
        sx={{ mb: 1 }}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="outlined" size="small" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          size="small" 
          onClick={handleSave}
          disabled={!content.trim()}
        >
          Save
        </Button>
      </Box>
    </Box>
  );
};

const Chat = () => {
  const { isLoggedIn, username } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showChatList, setShowChatList] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [messageMenuAnchorEl, setMessageMenuAnchorEl] = useState(null);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState(null);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [olderMessagesLoading, setOlderMessagesLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messageInputRef = useRef(null);
  const editInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const messageRefs = useRef({});
  const messagesStartRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [searchedMessages, setSearchedMessages] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [unreadChats, setUnreadChats] = useState({});
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
  // Add polling interval reference
  const pollingIntervalRef = useRef(null);

  // Simplified file handlers
  const handleRemoveFile = () => {
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedFile(null);
      setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (documentInputRef.current) documentInputRef.current.value = '';
  };

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
      setSelectedFile(null);
      setFilePreview(null);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size should be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setFilePreview(file);
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  // Message input component
  const MessageInput = () => {
    const messageInputRef = useRef(null);
    const [message, setMessage] = useState('');
    const [localImagePreview, setLocalImagePreview] = useState(null);
    const [localFilePreview, setLocalFilePreview] = useState(null);
    const [localSending, setLocalSending] = useState(false);
    const typingTimeoutRef = useRef(null);
    
    // New function to handle typing with debounce
    const handleMessageChange = (e) => {
      const newValue = e.target.value;
      setMessage(newValue);
      
      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // No need to send typing status if no chat is selected
      if (!selectedChat) return;
    };
    
    const handleSendMessage = async (e) => {
      if (e) e.preventDefault();
      
      if ((!message.trim() && !selectedImage && !selectedFile) || !selectedChat) {
        return;
      }
      
      setLocalSending(true);
      
      try {
        // Create form data for file upload
        const formData = new FormData();
        
        // Add message content if present
        if (message.trim()) {
          formData.append('content', message.trim());
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
        setMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        setLocalImagePreview(null);
        setSelectedFile(null);
        setFilePreview(null);
        setLocalFilePreview(null);
        setReplyTo(null);
        
        // Always scroll to bottom when sending a new message
        setTimeout(() => scrollToBottom(), 100);
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      } finally {
        setLocalSending(false);
      }
    };

    const handleLocalImageSelect = (e) => {
      handleImageSelect(e);
      // Also set local preview
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => setLocalImagePreview(e.target.result);
        reader.readAsDataURL(file);
      }
    };

    const handleLocalFileSelect = (e) => {
      handleFileSelect(e);
      // Set local file preview
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setLocalFilePreview(file);
      }
    };

    const handleLocalRemoveFile = () => {
      handleRemoveFile();
      setLocalImagePreview(null);
      setLocalFilePreview(null);
    };
    
    // Clear typing notification timeout when component unmounts
    useEffect(() => {
      return () => {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }, []);
    
    return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              p: 1,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
        {replyTo && (
          <Box 
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              p: 1,
              bgcolor: 'action.selected',
              borderRadius: 1,
              mb: 1,
            }}
          >
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Typography variant="body2" color="text.secondary" fontWeight="medium">
                Replying to {typeof replyTo.sender === 'string' ? replyTo.sender : replyTo.sender?.username}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  opacity: 0.8, 
                  textOverflow: 'ellipsis', 
                  overflow: 'hidden', 
                  whiteSpace: 'nowrap', 
                  maxWidth: '100%',
                  mt: 0.5,
                  borderLeft: '2px solid',
                  borderColor: 'primary.main',
                  pl: 1
                }}
              >
                {replyTo.content ? replyTo.content : replyTo.image ? 'Image' : 'File'}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setReplyTo(null)} sx={{ ml: 1 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
        
        {(imagePreview || localImagePreview || filePreview || localFilePreview) && (
          <Box sx={{ position: 'relative', mb: 1 }}>
            {(imagePreview || localImagePreview) && (
              <img 
                src={imagePreview || localImagePreview} 
                alt="Preview" 
                style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }} 
              />
            )}
            {(filePreview || localFilePreview) && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                }}
              >
                <AttachFileIcon sx={{ mr: 1 }} />
                <Typography sx={{ fontSize: '0.875rem' }}>
                  {(filePreview || localFilePreview)?.name || 'File attachment'}
                </Typography>
              </Box>
            )}
            <IconButton
              size="small"
              onClick={handleLocalRemoveFile}
              sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': {
                  bgcolor: 'background.paper',
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleLocalImageSelect}
          />
          <input
            type="file"
            style={{ display: 'none' }}
            ref={documentInputRef}
            onChange={handleLocalFileSelect}
          />
          
          <IconButton 
            size="small" 
            onClick={() => fileInputRef.current?.click()}
            color="primary"
          >
            <ImageIcon />
          </IconButton>
          
          <IconButton 
            size="small" 
            onClick={() => documentInputRef.current?.click()}
            color="primary"
          >
            <AttachFileIcon />
          </IconButton>
          
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={message}
            onChange={handleMessageChange}
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
            InputProps={{
              sx: { fontFamily: 'inherit' },
              className: 'message-input'
            }}
            inputRef={messageInputRef}
          />
          
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={(!message.trim() && !selectedImage && !selectedFile) || !selectedChat || localSending}
          >
            {localSending ? <CircularProgress size={24} /> : <SendIcon />}
          </IconButton>
        </Box>
      </Box>
    );
  };

  // Add the missing MessageMenu component and related functions
  const handleMessageMenuOpen = (event, message, action) => {
    // If we received a specific action directly from the Message component's menu
    if (action) {
      if (action === 'reply') {
        handleReplyMessage(message);
      } else if (action === 'edit') {
        setEditingMessage(message);
        setEditContent(message.content || '');
      } else if (action === 'delete') {
        handleDeleteMessage(message.id);
      }
      return;
    }
    
    // For backward compatibility or other use cases
    // Prevent event propagation to avoid conflicts
    if (event) {
      event.stopPropagation();
    }
    
    // If we already have this message selected, close the menu
    if (selectedMessageForMenu && selectedMessageForMenu.id === message.id && messageMenuAnchorEl) {
      setMessageMenuAnchorEl(null);
      setSelectedMessageForMenu(null);
      return;
    }
    
    // Use the current target for menu positioning
    if (event && event.currentTarget) {
      const currentTarget = event.currentTarget;
      
      // Make sure the element is valid before setting it as anchorEl
      if (currentTarget && document.body.contains(currentTarget)) {
        setMessageMenuAnchorEl(currentTarget);
        setSelectedMessageForMenu(message);
      } else {
        console.error('Invalid anchor element for message menu');
      }
    }
  };

  const handleMessageMenuClose = () => {
    setMessageMenuAnchorEl(null);
    setSelectedMessageForMenu(null);
  };

  // Add missing handleReplyMessage function
  const handleReplyMessage = (message) => {
    setReplyTo(message);
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  // Add missing handleDeleteMessage function
  const handleDeleteMessage = async (messageId) => {
    try {
      await API.delete(`/messages/${messageId}/`);
      
      // Remove the message from the local state
      setMessages(prevMessages => 
        prevMessages.filter(message => message.id !== messageId)
      );
      
      toast.success('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
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

  // Function to scroll to the bottom of chat (defined as useCallback)
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []); // Empty dependency array since messagesEndRef is a ref object

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

  const fetchMessages = async (chatId, options = {}) => {
    const { reset = true, before_id = null } = options;
    
    if (!chatId) return;
    
    try {
      setMessagesLoading(true);
      
      // Build the request URL with pagination parameters
      let url = `/chats/${chatId}/messages/`;
      const params = new URLSearchParams();
      params.append('limit', 20); // Load 20 messages at a time
      
      if (before_id) {
        params.append('before_id', before_id);
      }
      
      url = `${url}?${params.toString()}`;
      
      const response = await API.get(url);
      const newMessages = response.data;
      
      if (reset) {
        setMessages(newMessages);
        setHasMoreMessages(newMessages.length === 20); // If we got fewer than requested, there are no more
        
        // Only scroll to bottom on initial load
        setTimeout(() => scrollToBottom(), 100);
        
        // Mark messages as read when loading a chat
        if (selectedChat) {
          markChatAsRead(selectedChat.id);
        }
      } else {
        // Prepend older messages to the existing messages
        setMessages(prevMessages => [...newMessages, ...prevMessages]);
        setHasMoreMessages(newMessages.length === 20);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      toast.error('Failed to load messages');
    } finally {
      setMessagesLoading(false);
      setOlderMessagesLoading(false);
    }
  };
  
  // Function to load more (older) messages
  const loadMoreMessages = () => {
    if (!selectedChat || olderMessagesLoading || !hasMoreMessages) return;
    
    setOlderMessagesLoading(true);
    
    // Get the oldest message ID we currently have
    const oldestMessage = messages.length > 0 ? messages[0] : null;
    const before_id = oldestMessage ? oldestMessage.id : null;
    
    if (before_id) {
      fetchMessages(selectedChat.id, { reset: false, before_id });
    } else {
      setOlderMessagesLoading(false);
    }
  };
  
  // Add a function to check if user is at bottom of chat
  const isUserAtBottom = () => {
    if (!messagesContainerRef.current) return true;
    
    const container = messagesContainerRef.current;
    const scrollOffset = 30; // Allow some small offset from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight <= scrollOffset;
  };
  
  // Function to check for new messages - optimized with useCallback
  const checkForNewMessages = useCallback(async () => {
    if (!selectedChat) return;
    
    try {
      // Improved check for user typing - don't run the check if user is typing
      const activeElement = document.activeElement;
      const isTypingMessage = activeElement && 
        (activeElement.classList.contains('message-input') || 
         activeElement.tagName === 'TEXTAREA');
        
      if (isTypingMessage) {
        return;
      }
      
      // First, check for new messages
      let url = `/chats/${selectedChat.id}/messages/?limit=30`;
      
      // If we have messages, only get newer ones based on the latest message timestamp
      if (messages.length > 0) {
        const latestMessage = messages[messages.length - 1];
        // Add timestamp filter instead of fetching all messages
        url += `&after_timestamp=${encodeURIComponent(latestMessage.created_at)}`;
      }
      
      const response = await API.get(url);
      const newMessages = response.data;
      
      // Skip state updates if no messages
      if (newMessages.length === 0) {
        return;
      }
      
      // Create a map of existing message IDs for faster lookup
      const existingMessageIds = new Set(messages.map(msg => msg.id));
      
      // Only add messages we don't already have (more efficient filtering)
      const uniqueNewMessages = newMessages.filter(newMsg => !existingMessageIds.has(newMsg.id));
      
      // Also update read status of existing messages
      const updatedMessages = [...messages];
      let hasUpdates = false;
      
      for (const newMsg of newMessages) {
        if (existingMessageIds.has(newMsg.id)) {
          const index = updatedMessages.findIndex(msg => msg.id === newMsg.id);
          if (index !== -1) {
            // Check if read status changed
            if (updatedMessages[index].is_read !== newMsg.is_read) {
              updatedMessages[index] = { ...updatedMessages[index], is_read: newMsg.is_read };
              hasUpdates = true;
            }
          }
        }
      }
      
      // Update existing messages if read status changed
      if (hasUpdates) {
        setMessages(updatedMessages);
      }
      
      // Add new messages if any
      if (uniqueNewMessages.length > 0) {
        console.log(`Adding ${uniqueNewMessages.length} new messages`);
        
        // Add the new messages
        setMessages(prevMessages => {
          // Do one more duplicate check before updating state
          const currentIds = new Set(prevMessages.map(msg => msg.id));
          const finalUniqueMessages = uniqueNewMessages.filter(msg => !currentIds.has(msg.id));
          
          return [...prevMessages, ...finalUniqueMessages];
        });
        
        // Only scroll to bottom for new messages if user was already at bottom
        if (isUserAtBottom()) {
          setTimeout(() => scrollToBottom(), 100);
        }
      }
    } catch (error) {
      console.error('Error checking for new messages:', error);
    }
  }, [selectedChat, messages, scrollToBottom]);

  // Function to check for new messages in all chats (for notification)
  const checkAllChatsForNewMessages = async () => {
    try {
      // Get updated list of chats with unread counts
      const response = await API.get('/chats/');
      const updatedChats = response.data;
      
      // Update chat list without changing selected chat
      setChats(updatedChats);
      
      // Create a map of chat IDs with unread messages
      const unreadMap = {};
      updatedChats.forEach(chat => {
        if (chat.unread_count > 0) {
          unreadMap[chat.id] = chat.unread_count;
        }
      });
      
      setUnreadChats(unreadMap);
    } catch (error) {
      console.error('Error checking all chats:', error);
    }
  };

  // Add function to mark messages as read
  const markChatAsRead = async (chatId) => {
    try {
      await API.post(`/chats/${chatId}/read/`);
      
      // Update unread chat count
      setUnreadChats(prev => {
        const updated = {...prev};
        delete updated[chatId];
        return updated;
      });
      
      // Update chats list to reflect read status
      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? {...chat, unread_count: 0}
          : chat
      ));
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  };

  const handleChatSelect = (chat) => {
    // Clear messages when changing chats
    setMessages([]);
    setHasMoreMessages(true);
    setSelectedChat(chat);
    
    if (chat) {
      fetchMessages(chat.id);
      
      // Mark chat as read
      markChatAsRead(chat.id);
    }
    
    if (isMobile) {
      setShowChatList(false);
    }
  };

  // Add dedicated useEffect for message polling
  useEffect(() => {
    // Only set up polling when a chat is selected
    if (selectedChat) {
      // Clear any existing polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      // Check for new messages immediately when chat is selected
      checkForNewMessages();
      
      // Set up polling for new messages every 5 seconds
      pollingIntervalRef.current = setInterval(() => {
        // Skip polling if user is actively typing in the message input
        const activeElement = document.activeElement;
        const isTypingMessage = activeElement && 
          (activeElement.classList.contains('message-input') || 
           activeElement.tagName === 'TEXTAREA');
        
        if (!isTypingMessage) {
          checkForNewMessages();
        }
      }, 5000); // Less frequent polling to reduce input interference
    }
    
    // Clean up when chat changes or component unmounts
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [selectedChat, checkForNewMessages]); // Include checkForNewMessages in dependencies

  // Also add less frequent polling for all chats
  useEffect(() => {
    // Initial polling setup when component mounts
    const allChatsPollingInterval = setInterval(() => {
      if (isLoggedIn) {
        // Skip polling if user is actively typing in the message input
        const activeElement = document.activeElement;
        const isTypingMessage = activeElement && 
          (activeElement.classList.contains('message-input') || 
           activeElement.tagName === 'TEXTAREA');
        
        if (!isTypingMessage) {
          checkAllChatsForNewMessages();
        }
      }
    }, 10000); // Check all chats every 10 seconds
    
    // Clean up on unmount
    return () => {
      clearInterval(allChatsPollingInterval);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isLoggedIn]);

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
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Clean up any open menus or pickers when chat changes
  useEffect(() => {
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
    <Box 
      sx={{ 
        flexGrow: 1,
        overflow: 'auto',
        width: '350px', // Increase width from 300px to 350px
      }}
    >
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
                onClick={() => handleChatSelect(chat)}
                sx={{ 
                  py: 1.5,
                  borderLeft: unreadChats[chat.id] ? '3px solid var(--color-primary)' : 'none',
                  backgroundColor: unreadChats[chat.id] ? 'rgba(0, 255, 170, 0.05)' : 'inherit',
                }}
              >
                <ListItemAvatar>
                  <Badge color="primary" variant="dot" invisible={!unreadChats[chat.id]}>
                    <Avatar 
                      src={formatImageUrl(otherUser?.avatar_url)}
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
                    <Typography variant="caption" color="text.secondary">
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
  );

  const renderChatMessages = () => (
    <Box
      sx={{
        flexGrow: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        boxSizing: 'border-box'
      }}
      className="messages-container"
      ref={messagesContainerRef}
    >
      {/* Load More Messages Button */}
      {hasMoreMessages && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Button 
            variant="outlined" 
            size="small"
            onClick={loadMoreMessages}
            disabled={olderMessagesLoading}
            startIcon={olderMessagesLoading ? <CircularProgress size={16} /> : null}
          >
            {olderMessagesLoading ? 'Loading...' : 'Load Older Messages'}
          </Button>
          </Box>
      )}
      
      <div ref={messagesStartRef} />
      
      {messages.map((message, index) => (
        <Message 
          key={`${message.id}-${index}`} 
          message={message} 
          highlightedId={highlightedMessageId} 
          onMenuOpen={handleMessageMenuOpen} 
        />
      ))}
      <div ref={messagesEndRef} />
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

  // First add a searchUsers function
  const searchUsers = async (query) => {
    try {
      setSearching(true);
      setSearchResults([]);
      
      // Search all users
      const response = await API.get(`/search/?q=${encodeURIComponent(query)}&type=user`);
      
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  // Add this component to handle the user info panel content
  const UserInfoContent = ({ otherUser, onClose }) => {
    const navigate = useNavigate();
    const [blockDialogOpen, setBlockDialogOpen] = useState(false);

    // Helper function to format active hours for display
    const formatActiveHours = (activeHours, timezoneOffset = 0) => {
      if (!activeHours || !Array.isArray(activeHours) || activeHours.length === 0) {
        return [];
      }
      
      // Convert hours from UTC to user's local timezone
      const convertedHours = activeHours.map(hour => {
        const [hourStr, minuteStr] = hour.split(':');
        let hourNum = parseInt(hourStr, 10);
        
        // Apply timezone offset
        hourNum = (hourNum + (timezoneOffset || 0) + 24) % 24;
        
        // Format back to string with leading zeros
        return `${hourNum.toString().padStart(2, '0')}:${minuteStr || '00'}`;
      });
      
      // Check which periods the user is active in
      const activePeriods = [];
      for (const period of TIME_PERIODS) {
        // If all hours in the period are active, add the full period
        if (period.hours.every(hour => convertedHours.includes(hour))) {
          activePeriods.push(period.name.split(' ')[0]); // Just use the first word
        }
        // If some hours in the period are active, add the period with a * to indicate partial
        else if (period.hours.some(hour => convertedHours.includes(hour))) {
          activePeriods.push(`${period.name.split(' ')[0]}*`); // Just use the first word with *
        }
      }
      
      return activePeriods;
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
      <Box 
        className="user-info-content" 
        sx={{ 
          p: 2,
          height: '100%',
          overflowY: 'auto',
        }}
      >
        {/* Profile header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar
            src={formatImageUrl(otherUser?.avatar || otherUser?.avatar_url)} 
            sx={{ width: 60, height: 60, mr: 2 }}
          >
            {otherUser?.username?.[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6">{otherUser?.display_name || otherUser?.username}</Typography>
            <Typography variant="body2" color="text.secondary">@{otherUser?.username}</Typography>
          </Box>
        </Box>

        {/* Bio section */}
        {otherUser?.bio && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Bio</Typography>
            <Typography variant="body2">{otherUser?.bio}</Typography>
          </Box>
        )}
        
        {/* Active hours */}
        {otherUser?.active_hours && otherUser.active_hours.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Active Hours</Typography>
            <Box 
              sx={{ 
                p: 1.5, 
                bgcolor: 'background.paper', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider' 
              }}
            >
              <Typography variant="body2">
                {formatActiveHours(otherUser.active_hours, otherUser.timezone_offset).join(', ')}
          </Typography>
              {formatActiveHours(otherUser.active_hours, otherUser.timezone_offset).some(p => p.includes('*')) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                  * Partially active during this time
                </Typography>
              )}
        </Box>
          </Box>
        )}
          
          {/* Platforms */}
          {otherUser?.platforms && otherUser.platforms.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Platforms</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
              {otherUser.platforms.map((platform, index) => (
                  <Chip 
                  key={index} 
                    label={platform}
                    size="small"
                  sx={{ m: 0.5, bgcolor: 'rgba(0, 255, 170, 0.1)' }}
                  />
                ))}
              </Box>
            </Box>
          )}
          
        {/* Mic availability */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Mic Available</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {otherUser?.mic_available ? (
              <>
                <MicIcon sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="body2">Yes</Typography>
              </>
            ) : (
              <>
                <MicOffIcon sx={{ color: 'error.main', mr: 1 }} />
                <Typography variant="body2">No</Typography>
              </>
            )}
              </Box>
            </Box>
        
        {/* Languages */}
        {otherUser?.language_preference && otherUser.language_preference.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Languages</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
              {otherUser.language_preference.map((language, index) => (
            <Chip 
                  key={index} 
                  label={language} 
              size="small"
                  sx={{ m: 0.5, bgcolor: 'rgba(0, 255, 170, 0.1)' }}
                  />
                ))}
              </Box>
            </Box>
          )}
        
        {/* View profile button */}
        <Button
          variant="contained"
          fullWidth
          onClick={() => navigate(`/profile/${otherUser?.username}`)}
          sx={{ mb: 2 }}
        >
          View Full Profile
        </Button>
        
        {/* Block user button */}
          <Button 
            variant="outlined" 
            color="error"
            startIcon={<BlockIcon />}
          onClick={handleBlockUser}
            fullWidth
          >
            Block User
          </Button>
      </Box>
    );
  };

  // Add the renderChatHeader function back if it was accidentally removed
  const renderChatHeader = () => {
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
              {otherUser?.status || 'Online'}
            </Typography>
          </Box>
        </Box>
        
        <Box>
          <IconButton 
            onClick={(e) => {
              e.stopPropagation();
              setShowMessageSearch(!showMessageSearch);
            }}
            color={showMessageSearch ? "primary" : "default"}
          >
            <SearchIcon />
          </IconButton>
        </Box>
      </Box>
    );
  };

  // Update the main content section to use the renderChatHeader function correctly
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'row',
        height: '100vh',
        width: '100%',
        bgcolor: 'background.paper'
      }}
    >
      {/* Left panel - Chat list */}
      <Box
        sx={{
          width: isMobile ? '100%' : 350, // Increased width to 350px
          height: '100%',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: isMobile && selectedChat ? 'none' : 'flex',
          flexDirection: 'column',
          overflow: 'hidden' // Prevent overflow
        }}
        className="chat-sidebar"
      >
        {renderChatListHeader()}
        {renderChatList()}
      </Box>
        
      {/* Middle panel - Chat messages */}
      <Box
        sx={{
          flexGrow: 1,
          flexDirection: 'column',
          height: '100%',
          width: isMobile ? '100%' : `calc(100% - ${showUserInfo ? 650 : 350}px)`, // Adjust based on user info panel
          display: (!isMobile || selectedChat) ? 'flex' : 'none'
        }}
      >
        {selectedChat ? (
          <>
            {renderChatHeader()}

            {showMessageSearch && (
              <MessageSearchComponent />
            )}

            {renderChatMessages()}
            
            {editingMessage ? (
              <EditMessageForm 
                message={editingMessage} 
                onSave={handleEditMessage} 
                onCancel={() => setEditingMessage(null)} 
              />
            ) : (
              <MessageInput />
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
            }}
          >
            <Typography variant="h6" color="text.secondary">
              Select a chat to start messaging
            </Typography>
          </Box>
        )}
      </Box>

      {/* Right panel - User info */}
      {showUserInfo && selectedChat && (
        <Box 
          sx={{
            width: isMobile ? '100%' : 300,
            height: '100%',
            borderLeft: '1px solid',
            borderColor: 'divider',
            display: (showUserInfo && !isMobile) ? 'block' : 'none'
          }}
        >
          <UserInfoContent 
            otherUser={selectedChat?.participants.find(p => p.username !== username)}
            onClose={() => setShowUserInfo(false)}
          />
        </Box>
      )}

      {/* Context Menu */}
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
        <MenuItem onClick={() => {
          if (selectedMessage) {
            setReplyTo(selectedMessage);
            messageInputRef.current?.focus();
          }
          handleContextMenuClose();
        }}>
          <ListItemIcon>
            <ReplyIcon fontSize="small" />
          </ListItemIcon>
          Reply
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Chat; 