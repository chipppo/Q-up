/**
 * Message input component for composing and sending messages
 * 
 * This component provides a text input field with attachment capabilities
 * for sending messages in a chat. It handles both text messages and file uploads.
 * 
 * @module MessageInput
 * @requires React
 * @requires material-ui
 */
import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  Box,
  TextField,
  IconButton,
  CircularProgress,
  Typography,
  Tooltip,
  Badge,
  Button,
  Collapse,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import API from '../../api/axios';
import '../../styles/components/chat/MessageInput.css';

/**
 * Input component for writing and sending chat messages
 * 
 * @function MessageInput
 * @param {Object} props - Component props
 * @param {Function} props.addMessage - Callback to add a new message
 * @param {Object} props.replyTo - Message being replied to, if any
 * @param {Function} props.clearReplyTo - Function to clear reply state
 * @param {number} props.chatId - ID of current chat
 * @param {boolean} props.disabled - Whether input is disabled
 * @returns {JSX.Element} Message input component
 */
const MessageInput = forwardRef(({ 
  addMessage, 
  replyTo, 
  clearReplyTo, 
  chatId, 
  disabled = false 
}, ref) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    },
    resetAttachments: () => {
      setAttachment(null);
      setAttachmentPreview('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }));
  
  // Focus on input when component mounts
  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, []);
  
  // Focus on input when reply is set
  useEffect(() => {
    if (replyTo && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [replyTo]);
  
  /**
   * Handles text message changes
   * 
   * @function handleMessageChange
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
   */
  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    if (error) setError('');
  };
  
  /**
   * Handles key press to send message on Enter
   * 
   * @function handleKeyPress
   * @param {React.KeyboardEvent} e - Keyboard event
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  /**
   * Opens file selection dialog
   * 
   * @function handleAttachClick
   */
  const handleAttachClick = () => {
    fileInputRef.current.click();
  };
  
  /**
   * Handles file selection for attachments
   * 
   * @function handleFileChange
   * @param {React.ChangeEvent<HTMLInputElement>} e - File input change event
   */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }
    
    setAttachment(file);
    
    // Create preview for images - exclude SVGs which will be treated as downloadable files
    const isImage = 
      file.type.startsWith('image/') && !file.type.includes('svg') ||
      file.type.includes('webp') ||
      file.name.toLowerCase().endsWith('.webp');

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachmentPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      // For non-image files and SVGs, just display the file name
      setAttachmentPreview(`File: ${file.name}`);
    }
    
    // Clear any existing errors
    setError('');
  };
  
  /**
   * Removes the current attachment
   * 
   * @function handleRemoveAttachment
   */
  const handleRemoveAttachment = () => {
    setAttachment(null);
    setAttachmentPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  /**
   * Sends the message to the server
   * 
   * @async
   * @function handleSendMessage
   */
  const handleSendMessage = async () => {
    // Skip if already sending
    if (sending) return;
    
    // Skip if disabled
    if (disabled) return;
    
    // Validate message - either text or attachment required
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !attachment) {
      setError('Message cannot be empty');
      return;
    }
    
    // Clear error if any
    setError('');
    
    // Set sending state
    setSending(true);
    
    try {
      const formData = new FormData();
      
      // Add message content if not empty
      if (trimmedMessage) {
        formData.append('content', trimmedMessage);
      }
      
      // Add attachment if exists
      if (attachment) {
        formData.append('image', attachment);
        console.log('Attaching file:', attachment.name, attachment.type, attachment.size);
      }
      
      // Add parent message ID if replying
      if (replyTo) {
        formData.append('parent', replyTo.id);
        
        // Also store the parent content in a custom field
        // This won't be used by the server but will help with debugging
        if (replyTo.content) {
          formData.append('parent_content', replyTo.content);
        }
        
        // Log the message being replied to
        console.log('Replying to message:', replyTo.id, 'with content:', replyTo.content);
      }
      
      // Log FormData keys for debugging
      const formDataKeys = [];
      for (let key of formData.keys()) {
        formDataKeys.push(key);
      }
      console.log('FormData keys:', formDataKeys);
      
      // Send message to backend
      const response = await API.post(`/chats/${chatId}/messages/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Log the response for debugging
      console.log('Message sent successfully, response:', response.data);
      
      // If this is a reply, ensure the parent message content is preserved
      if (response.data && replyTo && replyTo.content) {
        response.data.parent_content = replyTo.content;
        console.log('Added parent_content to response:', response.data);
      }
      
      // Add message to UI
      if (response.data && addMessage) {
        addMessage(response.data);
      }
      
      // Reset input state
      setMessage('');
      setAttachment(null);
      setAttachmentPreview('');
      if (clearReplyTo) clearReplyTo();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error sending message:', err);
      
      // Extract error message
      let errorMessage = 'Failed to send message. Please try again.';
      if (err.response && err.response.data) {
        if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.content) {
          errorMessage = err.response.data.content[0];
        } else if (err.response.data.image) {
          errorMessage = err.response.data.image[0];
        } else if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        }
      }
      
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };
  
  // Handle removing a file before sending
  const handleRemoveFile = () => {
    setAttachment(null);
    setAttachmentPreview('');
    
    // Clear the file input so the same file can be reselected if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <Box className="message-input-container">
      {/* Reply preview */}
      {replyTo && (
        <Box className="reply-preview-container">
          {console.log("Reply preview data:", replyTo)}
          <Box className="reply-preview">
            <Typography variant="caption" fontWeight="medium" sx={{ display: 'block', mb: 0.5 }}>
              Replying to {replyTo.sender_username || replyTo.sender?.username || 'User'}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                opacity: 0.8, 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                maxWidth: '80%'
              }}
            >
              {replyTo.content || 
                (replyTo.has_image 
                  ? 'Image' 
                  : replyTo.image 
                    ? 'Image' 
                    : replyTo.file 
                      ? 'File' 
                      : 'Message')}
            </Typography>
          </Box>
          <IconButton size="small" onClick={clearReplyTo} className="reply-close-button">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      
      {/* Attachment preview */}
      <Collapse in={!!attachmentPreview}>
        <Box className="attachment-preview-container">
          {attachment && attachment.type.startsWith('image/') ? (
            <Box className="image-preview-container">
              <img src={attachmentPreview} alt="Preview" className="image-preview" />
              <Typography variant="caption" className="file-name">
                {attachment.name} ({Math.round(attachment.size / 1024)} KB)
              </Typography>
            </Box>
          ) : (
            attachmentPreview && (
              <Box className="file-preview-container">
                <AttachFileIcon color="primary" />
                <Typography variant="body2" className="file-name" sx={{ ml: 1 }}>
                  {attachment ? `${attachment.name} (${Math.round(attachment.size / 1024)} KB)` : ''}
                </Typography>
              </Box>
            )
          )}
          <IconButton 
            size="small" 
            onClick={handleRemoveFile} 
            className="attachment-remove-button"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Collapse>
      
      {/* Error message */}
      {error && (
        <Typography className="error-message" variant="caption" color="error">
          {error}
        </Typography>
      )}
      
      {/* Input field and buttons */}
      <Box className="message-input-wrapper">
        <Tooltip title="Attach file">
          <IconButton 
            className="attach-button" 
            onClick={handleAttachClick}
            disabled={disabled || sending}
          >
            <Badge color="primary" variant="dot" invisible={!attachment}>
              <AttachFileIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        
        <TextField
          inputRef={messageInputRef}
          className="message-input"
          placeholder="Type a message..."
          multiline
          maxRows={4}
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyPress}
          disabled={disabled || sending}
          fullWidth
          variant="outlined"
          size="small"
          InputProps={{
            className: "message-input-field",
          }}
        />
        
        <IconButton 
          className="send-button" 
          onClick={handleSendMessage}
          color="primary"
          disabled={disabled || sending || (!message.trim() && !attachment)}
        >
          {sending ? <CircularProgress size={24} /> : <SendIcon />}
        </IconButton>
      </Box>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </Box>
  );
});

export default MessageInput; 