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
import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
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
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import '../../styles/components/chat/Message.css';

/**
 * Formats image URLs by adding the API base URL if needed
 * 
 * @function formatImageUrl
 * @param {string|null} url - The image URL to format
 * @returns {string|null} The properly formatted URL or null
 */
const formatImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API.defaults.baseURL}${url}`;
};

/**
 * Component that renders a single chat message with various interactions
 * 
 * @function Message
 * @param {Object} props - Component props
 * @param {Object} props.message - The message data to display
 * @param {string|number} props.highlightedId - ID of currently highlighted message
 * @param {Function} props.onMenuOpen - Callback when message menu is opened
 * @returns {JSX.Element} The message component
 */
const Message = ({ message, highlightedId, onMenuOpen }) => {
  const { username } = useAuth();
  const isOwnMessage = typeof message.sender === 'string' 
    ? message.sender === username 
    : message.sender?.username === username;
  
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  const senderName = typeof message.sender === 'string' 
    ? message.sender 
    : message.sender?.display_name || message.sender?.username || 'Unknown';
  
  const messageTime = message.timestamp || message.created_at || new Date();
  
  /**
   * Determines if an attachment URL is an image or a different file type
   * 
   * @function isImageAttachment
   * @param {string} url - The attachment URL to check
   * @returns {boolean} True if the attachment appears to be an image
   */
  const isImageAttachment = (url) => {
    if (!url) return false;
    
    // Check for common image extensions in URL
    const imageExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
      '.tiff', '.tif', '.avif', '.heic', '.heif', '.jfif', '.pjpeg', '.pjp'
    ];
    const hasImageExtension = imageExtensions.some(ext => {
      const urlLower = url.toLowerCase();
      return urlLower.endsWith(ext) || urlLower.includes(`${ext}?`);
    });
    
    if (hasImageExtension) return true;
    
    // Also check for image content types in URL (from backend API responses)
    const imageContentTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
      'image/tiff', 'image/avif', 'image/heic', 'image/heif'
    ];
    const containsImageContentType = imageContentTypes.some(type => url.toLowerCase().includes(type));
    
    return containsImageContentType;
  };
  
  /**
   * Extracts a filename from a URL
   * 
   * @function getFileName
   * @param {string} url - The URL to extract filename from
   * @returns {string} The extracted filename or 'File' if not found
   */
  const getFileName = (url) => {
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
  
  const isHighlighted = highlightedId === message.id;

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
   * Formats message timestamp into readable format
   * Shows only time for today's messages, date and time for older ones
   * 
   * @function formatMessageTime
   * @param {string|Date} timestamp - The timestamp to format
   * @returns {string} Formatted time string
   */
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
              className="reply-bubble"
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
        {formatMessageTime(messageTime)}
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
};

export default React.memo(Message); 