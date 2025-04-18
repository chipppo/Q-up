/**
 * Message component for displaying individual chat messages
 * 
 * This component displays a chat message bubble with text content, attachments,
 * time indicators, and actions. Different styling is applied based on whether
 * the message was sent by the current user or someone else.
 * 
 * @module Message
 * @requires React
 * @requires material-ui
 * @requires AuthContext
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Reply as ReplyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
  Error as ErrorIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import API, { formatAvatarUrl } from '../../api/axios';
import '../../styles/components/chat/Message.css';

/**
 * Component that renders a single chat message with various interactions
 * 
 * @function Message
 * @param {Object} props - Component props
 * @param {Object} props.message - The message data to display
 * @param {string|number} props.highlightedId - ID of currently highlighted message
 * @param {Function} props.onMenuOpen - Callback when message menu is opened
 * @param {Object} props.deletingMessages - Object containing IDs of messages being deleted
 * @returns {JSX.Element} The message component
 */
const Message = ({ message, highlightedId, onMenuOpen, deletingMessages = {} }) => {
  // Get authentication context correctly
  const { username } = useAuth();
  
  // More robust check for own messages - compare with the logged in username
  const isOwnMessage = Boolean(
    username && message && (
      (message.sender && typeof message.sender === 'object' && message.sender.username === username) ||
      (message.sender && typeof message.sender === 'string' && message.sender === username) ||
      (message.sender_username && message.sender_username === username)
    )
  );
  
  // Get sender name from various possible properties
  const senderName = 
    (typeof message.sender === 'object' ? message.sender?.display_name || message.sender?.username : null) || 
    message.sender_display_name || 
    message.sender_username || 
    (typeof message.sender === 'string' ? message.sender : 'Unknown');
  
  const isHighlighted = highlightedId === message.id;
  
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const isDeleting = deletingMessages[message.id];
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const messageTime = message.timestamp || message.created_at || new Date();
  
  /**
   * Determines if an attachment URL is an image or a different file type
   * 
   * @function isImageAttachment
   * @param {string} url - The attachment URL to check
   * @returns {boolean} True if the attachment appears to be an image
   */
  const isImageAttachment = (url) => {
    // First check if we have file info from the server - this is the most reliable method
    if (message.file_info && message.file_info.is_image !== undefined) {
      // Don't treat SVGs as images - display them as downloadable files instead
      if (message.file_info.type && (
        message.file_info.type.includes('svg') || 
        message.file_info.name?.toLowerCase().endsWith('.svg')
      )) {
        return false;
      }
      return message.file_info.is_image;
    }
    
    if (!url) return false;
    
    // Don't treat SVGs as images anymore
    if (url.toLowerCase().includes('.svg')) {
      return false;
    }
    
    // Check for image content types, excluding SVG
    if (message.file_info && message.file_info.type) {
      if (message.file_info.type.includes('svg')) {
        return false;
      }
      
      if (message.file_info.type.startsWith('image/') || 
          message.file_info.type.includes('webp')) {
        return true;
      }
    }
    
    // Check for common image extensions in URL, excluding SVG
    const imageExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
      '.tiff', '.tif', '.avif', '.heic', '.heif', '.jfif', '.pjpeg', '.pjp'
    ];
    
    const hasImageExtension = imageExtensions.some(ext => {
      const urlLower = url.toLowerCase();
      return urlLower.endsWith(ext) || urlLower.includes(`${ext}?`);
    });
    
    if (hasImageExtension) return true;
    
    // Also check for image content types in URL (from backend API responses), excluding SVG
    const imageContentTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
      'image/tiff', 'image/avif', 'image/heic', 'image/heif'
    ];
    const containsImageContentType = imageContentTypes.some(type => url.toLowerCase().includes(type));
    
    return containsImageContentType;
  };
  
  /**
   * Extracts a filename from a URL or message metadata
   * 
   * @function getFileName
   * @param {string} url - The URL to extract filename from
   * @returns {string} The extracted filename or 'File' if not found
   */
  const getFileName = (url) => {
    // First check if we have file metadata from the server
    if (message.file_info && message.file_info.name) {
      return message.file_info.name;
    }
    
    if (!url) return 'File';
    const parts = url.split('/');
    return parts[parts.length - 1];
  };
  
  /**
   * Handles downloading a file attachment
   * 
   * @function handleFileDownload
   * @param {string} url - The file URL to download
   * @param {string} fileName - The filename to save as
   */
  const handleFileDownload = (url, fileName) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  /**
   * Handles opening the message action menu
   * 
   * @function handleMenuClick
   * @param {React.MouseEvent} event - The click event
   */
  const handleMenuClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  /**
   * Handles closing the message action menu
   * 
   * @function handleMenuClose
   */
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  /**
   * Handles message menu actions (reply, edit, delete)
   * 
   * @function handleMenuAction
   * @param {string} action - The action to perform
   */
  const handleMenuAction = (action) => {
    if (onMenuOpen) {
      onMenuOpen(anchorEl, message, action);
    }
    handleMenuClose();
  };

  /**
   * Formats message time in a human-readable format
   * 
   * @function formatMessageTime
   * @param {Date|string} time - The timestamp to format
   * @returns {string} Formatted time string
   */
  const formatMessageTime = (time) => {
    const date = typeof time === 'string' ? new Date(time) : time;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // Check if valid date
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    
    // Just now: less than a minute ago
    if (diffMins < 1) {
      return "just now";
    }
    
    // Minutes: 1m, 2m, ..., 59m
    if (diffMins < 60) {
      return `${diffMins}m`;
    }
    
    // Hours: 1h, 2h, ..., 23h
    if (diffHours < 24) {
      return `${diffHours}h`;
    }
    
    // Days: 1d, 2d, ... 6d
    if (diffDays < 7) {
      return `${diffDays}d`;
    }
    
    // Different year: Jan 1, 2022
    if (date.getFullYear() !== now.getFullYear()) {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    // Same year, different month/day: Jan 1
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Handle image loading
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
    
    // Ensure image is visible by directly setting style
    const messageId = `message-${message.id}`;
    const container = document.getElementById(messageId);
    if (container) {
      const img = container.querySelector('.message-image');
      if (img) {
        img.style.display = 'block';
      }
    }
  };

  const handleImageError = (e) => {
    setImageLoading(false);
    setImageError(true);
    // Don't remove the image element, just mark as error
    e.target.style.display = 'none';
  };

  // Set loading state when dealing with images
  useEffect(() => {
    if (message.image || message.has_image) {
      setImageLoading(true);
    } else {
      setImageLoading(false);
    }
    
    // Reset loading state after a short timeout if it gets stuck
    const timer = setTimeout(() => {
      setImageLoading(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [message.image, message.has_image]);

  const isImage = (filename) => {
    if (!filename) return false;
    
    // Special checks for known image types that might be missed
    const urlLower = filename.toLowerCase();
    if (urlLower.includes('.webp') || urlLower.includes('image/webp')) {
      return true;
    }
    if (urlLower.includes('.svg') || urlLower.includes('image/svg')) {
      return true;
    }
    
    // Extract file extension from the path
    const extension = filename.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 
            'tiff', 'tif', 'avif', 'heic', 'heif'].includes(extension);
  };

  return (
    <Box 
      className={`
        message-wrapper 
        ${isOwnMessage ? 'sent' : 'received'} 
        ${message.parent ? 'with-reply' : ''}
      `}
      data-testid={`message-${message.id}`}
      sx={{ opacity: isDeleting ? 0.5 : 1 }}
    >
      
      {/* Sender name for received messages */}
      {!isOwnMessage && (
        <Typography variant="caption" className="message-sender-name">
          {senderName}
        </Typography>
      )}
      
      {/* Message bubble with content */}
      <Box sx={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          maxWidth: '100%',
          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
          width: '100%'
        }}
      >
        {/* Menu button for received messages (on left) */}
        {!isOwnMessage && (
          <IconButton 
            size="small" 
            onClick={handleMenuClick}
            className="message-menu-button"
            sx={{ mr: 0.5 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )}
        
        {/* Message bubble with content */}
        <div 
          className={`message-bubble ${isOwnMessage ? 'sent' : 'received'} ${isHighlighted ? 'highlighted-message' : ''}`}
          id={`message-${message.id}`}
        >
          {/* Reply reference */}
          {message.parent && (
            <Box className="reply-bubble" sx={{ 
              width: '100%',
              maxWidth: 'none',
              position: 'relative',
              left: 0,
              right: 0,
            }}>
              <Typography variant="caption" fontWeight="medium" 
                sx={{ 
                  display: 'block', 
                  mb: 0.5,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%'
                }}
              >
                {typeof message.parent_sender === 'object' 
                  ? message.parent_sender?.display_name || message.parent_sender?.username || 'User'
                  : message.parent_sender || (message.parent?.sender?.username 
                    ? message.parent.sender.username 
                    : 'User')}
              </Typography>
              <Typography variant="body2" 
                sx={{ 
                  opacity: 0.9,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {(() => {
                  // Debug the parent message structure
                  if (process.env.NODE_ENV !== 'production') {
                    console.log("Parent message in reply:", message.parent);
                  }
                  
                  // Try to extract content from various properties
                  const content = 
                    message.parent_content || 
                    message.parent?.parent_content || 
                    message.parent_message?.content || 
                    message.parent?.content || 
                    null;
                  
                  if (content) {
                    return content;
                  } else if (message.parent?.has_image || message.parent?.image) {
                    return 'Image';
                  } else if (message.parent?.file) {
                    return 'File';
                  } else {
                    return 'Message';
                  }
                })()}
              </Typography>
            </Box>
          )}
        
          {/* Message text content */}
          {message.content && (
            <div className="message-content">
              {message.content}
            </div>
          )}
        
          {/* Image attachments */}
          {(message.image || message.has_image) && (
            <Box mt={message.content ? 1 : 0} mb={1} sx={{ width: '100%', boxSizing: 'border-box' }}>
              {isImageAttachment(formatAvatarUrl(message.image)) ? (
                <>
                  {imageLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', m: 2 }}>
                      <CircularProgress size={24} color="inherit" />
                    </Box>
                  )}
                  <img 
                    src={formatAvatarUrl(message.image)}
                    alt="Message attachment" 
                    className="message-image"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    style={{ 
                      display: imageLoading || imageError ? 'none' : 'block'
                    }}
                  />
                  {imageError && (
                    <Box className="image-error-message">
                      <ErrorIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Image could not be loaded
                    </Box>
                  )}
                </>
              ) : (
                <Box 
                  className="file-attachment"
                  onClick={() => handleFileDownload(formatAvatarUrl(message.image), getFileName(message.image))}
                >
                  <AttachFileIcon color="primary" />
                  <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', ml: 2, flex: 1 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 'medium' }}>
                      {getFileName(message.image)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {message.file_info?.type || 'File'} • Click to download
                    </Typography>
                  </Box>
                  <DownloadIcon sx={{ ml: 'auto' }} color="action" />
                </Box>
              )}
            </Box>
          )}
        
          {/* File attachments */}
          {message.file && (
            <div className="message-file">
              {isImage(message.file) ? (
                <img 
                  src={`${API.defaults.baseURL}${message.file}`} 
                  alt="Shared file" 
                  onClick={() => window.open(`${API.defaults.baseURL}${message.file}`, "_blank")}
                />
              ) : (
                <a 
                  href={`${API.defaults.baseURL}${message.file}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="file-download"
                >
                  <FileIcon /> {message.file.split('/').pop()}
                </a>
              )}
            </div>
          )}
        </div>
        
        {/* Menu button for sent messages (on right) */}
        {isOwnMessage && (
          <IconButton 
            size="small" 
            onClick={handleMenuClick}
            className="message-menu-button"
            sx={{ ml: 0.5 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      
      {/* Message timestamp (OUTSIDE bubble) */}
      <Box className="message-timestamp-container">
        {isOwnMessage && message.is_read !== undefined && (
          <span className="message-status">
            {message.is_read ? 
              <DoneAllIcon fontSize="inherit" style={{ fontSize: '0.8rem' }} /> : 
              <CheckIcon fontSize="inherit" style={{ fontSize: '0.8rem' }} />
            }
          </span>
        )}
        <Typography variant="caption" className="message-timestamp-inline">
          {formatMessageTime(messageTime)}
        </Typography>
      </Box>
      
      {/* Action menu */}
      <Menu
        anchorEl={anchorEl}
        id={`message-menu-${message.id}`}
        open={open}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
        transformOrigin={{ horizontal: isOwnMessage ? 'right' : 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: isOwnMessage ? 'right' : 'left', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleMenuAction('reply')}>
          <ListItemIcon>
            <ReplyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Reply</ListItemText>
        </MenuItem>
        
        {isOwnMessage && (
          <>
            <MenuItem onClick={() => handleMenuAction('edit')}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            
            <MenuItem onClick={() => handleMenuAction('delete')}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" sx={{ color: 'error.light' }} />
              </ListItemIcon>
              <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};

export default React.memo(Message); 