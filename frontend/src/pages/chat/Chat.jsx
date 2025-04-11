/**
 * Chat page component for user messaging
 * 
 * This page provides the main chat interface with:
 * - Chat list sidebar for selecting conversations
 * - Message view with message bubbles and timestamps
 * - Message input area with attachment support
 * - Reply/edit/delete functionality for messages
 * - Real-time message updates
 * - Unread message indicators
 * 
 * @module Chat
 * @requires React
 * @requires react-router-dom
 * @requires material-ui
 * @requires react-toastify
 * @requires AuthContext
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Menu,
  MenuItem,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import axios from 'axios';
import { toast } from 'react-toastify';

// Import decomposed components
import ChatList from '../../components/chat/ChatList';
import Message from '../../components/chat/Message';
import MessageInput from '../../components/chat/MessageInput';
import EditMessageForm from '../../components/chat/EditMessageForm';
import ChatHeader from '../../components/chat/ChatHeader';

// Import CSS
import '../../styles/components/chat/ChatContainer.css';
import '../../styles/pages/chat/Chat.css';

/**
 * Main chat interface component that handles messages, chat selection,
 * and real-time updates
 * 
 * @function Chat
 * @returns {JSX.Element} The chat page
 */
const Chat = () => {
  const { isLoggedIn, username } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // State for chat data
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [unreadChats, setUnreadChats] = useState({});
  
  // UI state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showChatList, setShowChatList] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  
  // Loading state
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [olderMessagesLoading, setOlderMessagesLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageMenuAnchorEl, setMessageMenuAnchorEl] = useState(null);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState(null);
  
  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messagesStartRef = useRef(null);
  const isPolling = useRef(false);
  const pollingIntervalRef = useRef(null);
  const messageRefs = useRef({});

  // Add a state to track which messages are being deleted
  const [deletingMessages, setDeletingMessages] = useState({});

  // Refs for tracking scroll and polling state
  const lastScrollTop = useRef(0);
  const isLoadingMore = useRef(false);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState(null);
  const [userActive, setUserActive] = useState(true);
  const userActivityTimeoutRef = useRef(null);
  
  // Inside the Chat component render function where MessageInput is used
  const messageInputRef = useRef(null);
  
  /**
   * Checks if the user is at the bottom of the chat messages
   * Used to auto-scroll only when appropriate
   * 
   * @function isUserAtBottom
   * @returns {boolean} Whether user is at the bottom of messages
   */
  const isUserAtBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    
    // Consider user at bottom if within 100px of the bottom
    const threshold = 100;
    const position = container.scrollHeight - container.scrollTop - container.clientHeight;
    return position < threshold;
  };

  /**
   * Scrolls to the bottom of the chat messages
   * 
   * @function scrollToBottom
   * @param {Object} options - Scrolling options
   * @param {boolean} options.smooth - Whether to use smooth scrolling
   */
  const scrollToBottom = useCallback((options = { smooth: true }) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: options.smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  }, []);

  /**
   * Marks a chat as read by the current user
   * 
   * @async
   * @function markChatAsRead
   * @param {string|number} chatId - ID of the chat to mark as read
   */
  const markChatAsRead = async (chatId) => {
    if (!chatId) return;
    
    try {
      // Send request to mark messages as read
      await API.post(`/chats/${chatId}/read/`);
      
      // Update unread chats map
      setUnreadChats(prev => {
        const updated = { ...prev };
        delete updated[chatId];
        return updated;
      });
    } catch (error) {
      console.error('Error marking chat as read:', error);
      // Don't show error to user, just log it - this is a background operation
    }
  };

  /**
   * Fetches the list of chats for the current user
   * Uses a retry mechanism and fallback endpoints for reliability
   * 
   * @async
   * @function fetchChats
   */
  const fetchChats = async () => {
    let retryCount = 0;
    const maxRetries = 3;
    let useSimpleEndpoint = false;
    let useRawEndpoint = false;
    
    const attemptFetch = async () => {
      try {
        setLoading(true);
        
        // Choose endpoint based on previous failures
        let endpoint = '/chats/';
        if (useRawEndpoint) {
          endpoint = '/raw-chats/';
        } else if (useSimpleEndpoint) {
          endpoint = '/simple-chats/';
        }
        
        console.log(`Attempting to fetch chats from ${endpoint}, attempt: ${retryCount + 1}`);
        
        const response = await API.get(endpoint);
        setChats(response.data);
        
        // Create a map of chat IDs with unread messages
        const unreadMap = {};
        response.data.forEach(chat => {
          if (chat.unread_count > 0) {
            unreadMap[chat.id] = chat.unread_count;
          }
        });
        
        setUnreadChats(unreadMap);
        setError(null);
        return true;
      } catch (err) {
        console.error(`Error fetching chats from ${useRawEndpoint ? 'raw' : (useSimpleEndpoint ? 'simple' : 'standard')} endpoint (attempt ${retryCount + 1}):`, err);
        
        // Strategy for retries and endpoint selection
        if (retryCount < maxRetries) {
          retryCount++;
          
          // Progressive fallback strategy
          if (retryCount === 1 && !useSimpleEndpoint && !useRawEndpoint) {
            // First retry: try again with the same endpoint
            console.log('Retrying same endpoint');
          } else if (retryCount === 2 && !useSimpleEndpoint && !useRawEndpoint) {
            // Second retry: switch to simple endpoint
            useSimpleEndpoint = true;
            useRawEndpoint = false;
            console.log('Switching to simple-chats endpoint');
          } else if (retryCount === 3 || (useSimpleEndpoint && !useRawEndpoint)) {
            // Third retry or after simple endpoint failed: use raw endpoint
            useSimpleEndpoint = false;
            useRawEndpoint = true;
            console.log('Switching to raw-chats endpoint');
          }
          
          // Try to diagnose the issue by calling the debug endpoint
          try {
            console.log('Calling chat-debug endpoint to diagnose issues');
            const debugResponse = await API.get('/chat-debug/');
            console.log('Chat debug info:', debugResponse.data);
          } catch (debugError) {
            console.error('Error with debug endpoint:', debugError);
          }
          
          // Wait with exponential backoff before retrying
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return false; // Retry needed
        } else {
          // All retry attempts exhausted
          setError('Failed to load chats after multiple attempts.');
          
          // Show more helpful error message based on error type
          if (err.response) {
            // Server responded with an error
            if (err.response.status === 401) {
              toast.error('Your session has expired. Please log in again.');
              // Redirect to login page
              navigate('/login', { state: { from: '/chat' } });
            } else if (err.response.status === 404) {
              toast.error('Chat service not found. Please try again later.');
            } else if (err.response.status >= 500) {
              toast.error('Server error. Please try again later.');
            } else {
              toast.error(`Failed to load chats: ${err.response.data?.detail || 'Unknown error'}`);
            }
          } else if (err.request) {
            // Request was made but no response received
            toast.error('No response from server. Please check your connection.');
          } else {
            // Something else went wrong
            toast.error('Failed to load chats: ' + (err.message || 'Unknown error'));
          }
          return true; // Done with attempts
        }
      } finally {
        if (retryCount >= maxRetries) {
          setLoading(false);
        }
      }
    };
    
    // Start the retry loop
    let done = false;
    while (!done && retryCount <= maxRetries) {
      done = await attemptFetch();
    }
    
    setLoading(false);
  };

  /**
   * Fetches messages for a specific chat
   * Supports pagination and loading older messages
   * 
   * @async
   * @function fetchMessages
   * @param {string|number} chatId - ID of the chat to fetch messages for
   * @param {Object} options - Fetch options
   * @param {boolean} options.reset - Whether to reset current messages
   * @param {string|number|null} options.before_id - ID to paginate from
   * @returns {Promise<void>}
   */
  const fetchMessages = async (chatId, options = {}) => {
    const { reset = true, before_id = null, retryCount = 0 } = options;
    
    if (!chatId) return Promise.resolve();
    
    try {
      if (reset) {
        setMessagesLoading(true);
      } else {
        setOlderMessagesLoading(true);
      }
      
      // Build query URL with pagination parameters
      let url = `/chats/${chatId}/messages/`;
      const params = new URLSearchParams();
      params.append('limit', 20); // Load 20 messages at a time
      
      if (before_id) {
        params.append('before_id', before_id);
      }
      
      url = `${url}?${params.toString()}`;
      
      const response = await API.get(url);
      const newMessages = response.data;
      
      // Sort messages by timestamp (oldest first)
      const sortedMessages = [...newMessages].sort((a, b) => {
        return new Date(a.created_at) - new Date(b.created_at);
      });
      
      if (reset) {
        // First set of messages
        setMessages(sortedMessages);
        setHasMoreMessages(newMessages.length === 20); // If fewer than requested, no more messages
        
        // Update latest message timestamp
        if (sortedMessages.length > 0) {
          const latestMsg = sortedMessages[sortedMessages.length - 1];
          if (latestMsg && latestMsg.created_at) {
            setLastMessageTimestamp(latestMsg.created_at);
          }
        }
        
        // Use a longer timeout to ensure DOM is updated before scrolling
        setTimeout(() => {
          // First try to use scrollToBottom
          scrollToBottom({ smooth: false });
          
          // As a fallback, also directly set scroll position
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 50);
        
        // Mark messages as read when loading chat
        if (selectedChat) {
          markChatAsRead(selectedChat.id);
        }
      } else {
        // Preserve current scroll position and height before adding new messages
        const container = messagesContainerRef.current;
        const scrollHeight = container ? container.scrollHeight : 0;
        const scrollPosition = container ? container.scrollTop : 0;
        
        // Sort all messages to ensure proper chronological order
        setMessages(prevMessages => {
          // Combine old and new messages
          const combinedMessages = [...sortedMessages, ...prevMessages];
          
          // Sort all messages by timestamp
          return combinedMessages.sort((a, b) => {
            return new Date(a.created_at) - new Date(b.created_at);
          });
        });
        
        setHasMoreMessages(newMessages.length === 20);
        
        setTimeout(() => {
          if (container) {
            // Calculate how much new content was added
            const newScrollHeight = container.scrollHeight;
            const heightDifference = newScrollHeight - scrollHeight;
            
            // Adjust scroll position to keep same messages in view
            container.scrollTop = scrollPosition + heightDifference;
          }
        }, 50);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      
      // Retry logic for transient errors (max 3 retries)
      if (retryCount < 3) {
        console.log(`Retrying fetch messages (attempt ${retryCount + 1})...`);
        
        // Wait a bit between retries (exponential backoff)
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Try again with incremented retry counter
        return fetchMessages(chatId, { ...options, retryCount: retryCount + 1 });
      }
      
      toast.error('Failed to load messages. Please try again later.');
      
      // Set empty messages array rather than leaving it in loading state
      if (reset) {
        setMessages([]);
      }
    } finally {
      setMessagesLoading(false);
      setOlderMessagesLoading(false);
    }
    
    // Return resolved promise to allow chain calling in loadMoreMessages
    return Promise.resolve();
  };
  
  /**
   * Loads older messages when user scrolls to top of chat
   * 
   * @function loadMoreMessages
   */
  const loadMoreMessages = () => {
    if (!selectedChat || olderMessagesLoading || !hasMoreMessages) return;
    
    setOlderMessagesLoading(true);
    
    // Get ID of the oldest message we currently have
    const oldestMessage = messages.length > 0 ? messages[0] : null;
    const before_id = oldestMessage ? oldestMessage.id : null;
    
    if (before_id) {
      // Fetch older messages
      fetchMessages(selectedChat.id, { reset: false, before_id });
    } else {
      setOlderMessagesLoading(false);
    }
  };

  /**
   * Resets any file inputs in the message form to prevent issues
   * after message operations like deletion
   * 
   * @function resetFileInputs
   */
  const resetFileInputs = () => {
    // Find any file inputs in the message form and reset them
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
      input.value = '';
    });
    
    // Also reset attachment state in the MessageInput component
    if (messageInputRef.current && messageInputRef.current.resetAttachments) {
      messageInputRef.current.resetAttachments();
    }
  };

  /**
   * Deletes a message from the chat
   * 
   * @function handleDeleteMessage
   * @param {string} messageId - ID of the message to delete
   */
  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;
    
    // Store message ID safely
    const idToDelete = String(messageId);
    
    // Set deleting state by ID
    setDeletingMessages(prev => ({ ...prev, [idToDelete]: true }));
    
    try {
      // First capture the adjacent messages for reference
      const messageIndex = messages.findIndex(m => String(m.id) === idToDelete);
      const adjacentMessages = {
        before: messageIndex > 0 ? messages[messageIndex - 1] : null,
        after: messageIndex < messages.length - 1 ? messages[messageIndex + 1] : null
      };
      
      // Call the API to delete the message
      await API.delete(`/messages/${idToDelete}/`);
      
      // Remove message from local state with key-based updates to maintain stability
      setMessages(prevMessages => {
        // Create a new array without the deleted message
        const updatedMessages = prevMessages.filter(m => String(m.id) !== idToDelete);
        
        // Add keys to help React maintain stable identity
        return updatedMessages.map(msg => ({
          ...msg,
          // Ensure each message has a stable key that survived the deletion
          key: `msg-${msg.id}-${Date.now()}`
        }));
      });
      
      // Reset any file inputs to prevent issues
      resetFileInputs();
      
      // Restore scroll position based on adjacent messages
      setTimeout(() => {
        if (adjacentMessages.after) {
          const afterEl = document.getElementById(`message-${adjacentMessages.after.id}`);
          if (afterEl) afterEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        } else if (adjacentMessages.before) {
          const beforeEl = document.getElementById(`message-${adjacentMessages.before.id}`);
          if (beforeEl) beforeEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        }
      }, 100);
      
      toast.success('Message deleted successfully');
      
      // Close menu if open
      setMessageMenuAnchorEl(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    } finally {
      // Clean up deleting state
      setDeletingMessages(prev => {
        const updated = { ...prev };
        delete updated[idToDelete];
        return updated;
      });
    }
  };

  /**
   * Periodically checks for new messages in all chats
   * Updates unread counts and fetches new messages for active chat
   * 
   * @async
   * @function checkAllChatsForNewMessages
   */
  const checkAllChatsForNewMessages = async () => {
    let useSimpleEndpoint = false;
    let useRawEndpoint = false;
    let successfulFetch = false;
    
    try {
      // Try each endpoint in sequence until one works
      
      // 1. First try regular endpoint
      if (!successfulFetch) {
        try {
          console.log('Checking for new messages using regular chats endpoint');
          const response = await API.get('/chats/');
          const updatedChats = response.data;
          
          // Update chats list without changing the selected chat
          setChats(updatedChats);
          
          // Create a map of chat IDs with unread messages
          const unreadMap = {};
          updatedChats.forEach(chat => {
            if (chat.unread_count > 0) {
              unreadMap[chat.id] = chat.unread_count;
            }
          });
          
          setUnreadChats(unreadMap);
          successfulFetch = true;
        } catch (mainError) {
          console.error('Error with main chats endpoint in background check:', mainError);
          useSimpleEndpoint = true;
        }
      }
      
      // 2. Try simple endpoint as first fallback
      if (!successfulFetch && useSimpleEndpoint) {
        try {
          console.log('Falling back to simple-chats endpoint for background update');
          const response = await API.get('/simple-chats/');
          const updatedChats = response.data;
          
          // Update chats list without changing the selected chat
          setChats(updatedChats);
          
          // Create a map of chat IDs with unread messages
          const unreadMap = {};
          updatedChats.forEach(chat => {
            if (chat.unread_count > 0) {
              unreadMap[chat.id] = chat.unread_count;
            }
          });
          
          setUnreadChats(unreadMap);
          successfulFetch = true;
        } catch (simpleError) {
          console.error('Error with simple chats endpoint in background check:', simpleError);
          useRawEndpoint = true;
        }
      }
      
      // 3. Try raw endpoint as last resort
      if (!successfulFetch && useRawEndpoint) {
        try {
          console.log('Falling back to raw-chats endpoint for background update');
          const response = await API.get('/raw-chats/');
          const updatedChats = response.data;
          
          // Update chats list without changing the selected chat
          setChats(updatedChats);
          
          // Create a map of chat IDs with unread messages
          const unreadMap = {};
          updatedChats.forEach(chat => {
            if (chat.unread_count > 0) {
              unreadMap[chat.id] = chat.unread_count;
            }
          });
          
          setUnreadChats(unreadMap);
          successfulFetch = true;
        } catch (rawError) {
          console.error('Error with raw chats endpoint in background check:', rawError);
        }
      }
    } catch (error) {
      console.error('Error checking all chats:', error);
      
      // Try to diagnose the issue by calling the debug endpoint
      try {
        console.log('Calling chat-debug endpoint to diagnose issues');
        const debugResponse = await API.get('/chat-debug/');
        console.log('Chat debug info:', debugResponse.data);
      } catch (debugError) {
        console.error('Error with debug endpoint:', debugError);
      }
      
      // Don't show toast for background polling errors to avoid spamming the user
      
      // Only handle actual response errors
      if (error.response && error.response.status === 401) {
        // Token expired or invalid
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        // Don't redirect to login automatically for background polling,
        // but stop polling to prevent more errors
      }
    }
  };

  /**
   * Handles selecting a chat from the list
   * Loads messages and marks the chat as read
   * 
   * @function handleChatSelect
   * @param {Object} chat - The selected chat object
   */
  const handleChatSelect = (chat) => {
    // Reset state for new chat
    setMessages([]);
    setHasMoreMessages(true);
    setSelectedChat(chat);
    setOlderMessagesLoading(false);
    
    if (chat) {
      // Set loading state when fetching messages
      setMessagesLoading(true);
      
      // Fetch messages for selected chat
      fetchMessages(chat.id);
      
      // Mark chat as read
      markChatAsRead(chat.id);
    }
    
    if (isMobile) {
      setShowChatList(false);
    }
  };

  /**
   * Starts a new chat with a specific user
   * 
   * @async
   * @function handleStartChat
   * @param {string} username - Username to start chat with
   */
  const handleStartChat = async (username) => {
    try {
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
      if (isMobile) {
        setShowChatList(false);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    }
  };

  /**
   * Handles opening message action menu for various actions
   * 
   * @function handleMessageMenuOpen
   * @param {HTMLElement} anchorEl - Anchor element for the menu
   * @param {Object} message - Message object to act on
   * @param {string} action - Action to perform (reply, edit, delete)
   */
  const handleMessageMenuOpen = (anchorEl, message, action) => {
      if (action === 'reply') {
      // Handle reply action
        handleReplyMessage(message);
      } else if (action === 'edit') {
      // Handle edit action
        setEditingMessage(message);
      } else if (action === 'delete') {
      // Handle delete action
        handleDeleteMessage(message.id);
    }
  };

  /**
   * Handles selecting a message to reply to
   * 
   * @function handleReplyMessage
   * @param {Object} message - The message to reply to
   */
  const handleReplyMessage = (message) => {
    // Set the message to reply to (will be passed to MessageInput)
    setReplyTo(message);
    
    // Focus the message input
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
    
    // Close menu if open
    setMessageMenuAnchorEl(null);
  };

  /**
   * Handles editing a message
   * 
   * @async
   * @function handleEditMessage
   * @param {string|number} messageId - ID of the message to edit
   * @param {string} content - New message content
   */
  const handleEditMessage = async (messageId, content) => {
    if (!content.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('content', content.trim());
      
      // Send request using the correct API endpoint format
      const response = await API.patch(`/messages/${messageId}/`, formData);

      // Update the message in state
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

  /**
   * Adds a new message to the current chat
   * Handles scrolling and updating the UI
   * 
   * @function addMessage
   * @param {Object} newMessage - The new message to add
   */
  const addMessage = (newMessage) => {
    if (!newMessage) return;
    
    // Generate a consistent key for this message
    if (!newMessage.key) {
      newMessage.key = `msg-${newMessage.id}`;
    }
    
    // Add message to local state
    setMessages(prevMessages => [...prevMessages, newMessage]);
  };

  // Track user activity to optimize polling
  const resetUserActivityTimeout = useCallback(() => {
    if (userActivityTimeoutRef.current) {
      clearTimeout(userActivityTimeoutRef.current);
    }
    
    setUserActive(true);
    
    // Set user as inactive after 5 minutes of no activity
    userActivityTimeoutRef.current = setTimeout(() => {
      setUserActive(false);
    }, 5 * 60 * 1000);
  }, []);

  /**
   * Handles user activity events by resetting the inactivity timer
   * 
   * @function handleUserActivity
   */
  const handleUserActivity = () => {
    resetUserActivityTimeout();
  };

  // Set up user activity tracking
  useEffect(() => {
    // Add event listeners for user activity
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    
    // Initialize activity timeout
    resetUserActivityTimeout();
    
    // Clean up
    return () => {
      if (userActivityTimeoutRef.current) {
        clearTimeout(userActivityTimeoutRef.current);
      }
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, [resetUserActivityTimeout]);

  /**
   * Optimized function to check for new messages only
   * Uses a timestamp-based approach to only fetch new messages
   */
  const checkForNewMessages = useCallback(async () => {
    if (!selectedChat || isPolling.current) return;
    
    isPolling.current = true;
    
    try {
      // Build query URL with timestamp filter to only get new messages
      const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      const latestTimestamp = latestMessage ? latestMessage.created_at : null;
      
      if (latestTimestamp !== lastMessageTimestamp) {
        setLastMessageTimestamp(latestTimestamp);
      }
      
      // Only fetch if we have a timestamp to filter by
      if (latestTimestamp) {
        let url = `/chats/${selectedChat.id}/messages/`;
        const params = new URLSearchParams();
        params.append('limit', 10);
        params.append('after', latestTimestamp);
        url = `${url}?${params.toString()}`;
        
        const response = await API.get(url);
        const newMessages = response.data;
        
        if (newMessages && newMessages.length > 0) {
          // Check for duplicates and add only new messages
          const existingMessageIds = new Set(messages.map(m => m.id));
          const messagesToAdd = newMessages.filter(m => !existingMessageIds.has(m.id));
          
          if (messagesToAdd.length > 0) {
            // Sort messages by timestamp (oldest first)
            const sortedMessages = [...messagesToAdd].sort((a, b) => {
              return new Date(a.created_at) - new Date(b.created_at);
            });
            
            // Update the messages state
      setMessages(prevMessages => {
              const updatedMessages = [...prevMessages, ...sortedMessages];
              return updatedMessages.sort((a, b) => 
                new Date(a.created_at) - new Date(b.created_at)
              );
            });
            
            // Scroll to bottom if user was already at bottom
            if (isUserAtBottom()) {
              setTimeout(() => {
                scrollToBottom({ smooth: true });
              }, 50);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking for new messages:', error);
    } finally {
      isPolling.current = false;
    }
  }, [selectedChat, messages, isUserAtBottom, scrollToBottom, lastMessageTimestamp]);

  // Set up polling for new messages
  useEffect(() => {
    // Clear any existing polling interval when chat changes
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (selectedChat) {
      // Initial check for new messages
      checkForNewMessages();
      
      // Set up new polling interval with adaptive frequency based on user activity
      const setupPolling = () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        
        // Use shorter polling interval when user is active, longer when inactive
        const pollingInterval = userActive ? 8000 : 30000; // 8 seconds vs 30 seconds
        
        pollingIntervalRef.current = setInterval(() => {
          checkForNewMessages();
        }, pollingInterval);
      };
      
      // Set up initial polling
      setupPolling();
      
      // Update polling interval when user activity changes
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [selectedChat, checkForNewMessages, userActive]);

  /**
   * Updates isMobile state when window is resized
   * 
   * @function handleResize
   */
  const handleResize = () => setIsMobile(window.innerWidth <= 768);

  /**
   * Handles clicking the back button in mobile view
   * Returns to previous screen or shows chat list
   * 
   * @function handleBack
   */
  const handleBack = () => {
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
    } else {
      setSelectedChat(null);
      setShowChatList(true);
    }
  };

  // Initial load
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

  // Handle scrolling behavior for messages
  useEffect(() => {
    // Scroll to bottom only when messages change, if not loading older messages
    if (messages.length > 0 && !olderMessagesLoading) {
      // If this was triggered by loading older messages, don't scroll
      if (olderMessagesLoading) return;
      
      // Only auto-scroll if this is a message sent by the user, or we're already at the bottom
      const isUserSentMessage = messages.length > 0 && 
                               messages[messages.length - 1].sender === username;
      
      // Auto-scroll only if the user sent a message or is already at the bottom
      if (isUserSentMessage || isUserAtBottom()) {
        setTimeout(() => {
          scrollToBottom({ smooth: isUserSentMessage });
        }, 50);
      }
    }
  }, [messages, scrollToBottom, username, olderMessagesLoading, isUserAtBottom]);

  // Clear all open menus or selectors when chat changes
  useEffect(() => {
    setMessageMenuAnchorEl(null);
    setSelectedMessageForMenu(null);
    setEditingMessage(null);
    setReplyTo(null);
  }, [selectedChat]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clear all open menus or selectors
      setMessageMenuAnchorEl(null);
      setSelectedMessageForMenu(null);
      setEditingMessage(null);
      setReplyTo(null);
    };
  }, []);

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'row',
        height: { 
          xs: 'calc(100vh - 56px)', // Account for smaller header on mobile (56px)
          sm: 'calc(100vh - 64px)'  // Standard header height (64px) 
        },
        width: '100%',
        bgcolor: 'background.paper',
        overflow: 'hidden', // Prevent outer scrollbar
        position: 'relative', // Ensure proper positioning
        mt: '0px' // No top margin
      }}
      className="chat-page-container"
    >
      {/* Left panel - Chat list */}
      <Box
        sx={{
          width: isMobile ? '100%' : 350, // Increased width to 350px
          height: '100%', // Full height
          borderRight: '1px solid',
          borderColor: 'divider',
          display: isMobile && selectedChat ? 'none' : 'flex',
          flexDirection: 'column',
          overflow: 'hidden' // Prevent overflow
        }}
        className="chat-sidebar"
      >
        <ChatList
          chats={chats}
          selectedChat={selectedChat}
          onChatSelect={handleChatSelect}
          onStartChat={handleStartChat}
          onGoBack={handleBack}
          showBackButton={!!location.state?.returnTo}
          unreadChats={unreadChats}
        />
      </Box>
        
      {/* Middle panel - Chat messages */}
      <Box
        sx={{
          flexGrow: 1,
          flexDirection: 'column',
          height: '100%', // Full height
          width: isMobile ? '100%' : `calc(100% - 350px)`, // Adjust width without user info panel
          display: (!isMobile || selectedChat) ? 'flex' : 'none',
          overflow: 'hidden' // Prevent container overflow
        }}
      >
        {selectedChat ? (
          <>
            <ChatHeader 
              selectedChat={selectedChat} 
              username={username}
              isMobile={isMobile}
              onBackClick={() => {
                setSelectedChat(null);
                setShowChatList(true);
              }}
            />

            <Box
              sx={{
                flexGrow: 1,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                boxSizing: 'border-box',
                height: '0', // Use auto sizing based on parent container
                minHeight: '0', // Allow container to shrink as needed
                position: 'relative', // Add relative positioning
                padding: '8px 16px',
              }}
              className="messages-container"
              ref={messagesContainerRef}
              onClick={() => {
                resetUserActivityTimeout();
                // Force check for new messages when user interacts with chat
                if (selectedChat && !isPolling.current) {
                  checkForNewMessages();
                }
              }}
            >
              {/* Load more messages button */}
              {hasMoreMessages && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 2, flexShrink: 0 }}>
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
              
              {/* Messages container */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                flexGrow: 1,
                justifyContent: messages.length < 10 ? 'flex-end' : 'flex-start'
              }}>
                <div ref={messagesStartRef} />
                
                {messages.map((message, index) => (
                  <Message 
                    key={`${message.id}-${index}`} 
                    message={message} 
                    highlightedId={highlightedMessageId} 
                    onMenuOpen={handleMessageMenuOpen}
                    deletingMessages={deletingMessages}
                  />
                ))}
                
                <div ref={messagesEndRef} />
              </Box>
            </Box>
            
            {editingMessage ? (
              <EditMessageForm 
                message={editingMessage} 
                onSave={handleEditMessage} 
                onCancel={() => setEditingMessage(null)} 
              />
            ) : (
              <MessageInput
                addMessage={addMessage}
                replyTo={replyTo}
                clearReplyTo={() => setReplyTo(null)}
                chatId={selectedChat.id}
                disabled={messagesLoading}
              />
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

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
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
          }
          setContextMenu(null);
        }}>
          Reply
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Chat;