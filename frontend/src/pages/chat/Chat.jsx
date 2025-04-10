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
  const pollingIntervalRef = useRef(null);
  const messageRefs = useRef({});

  // Add a state to track which messages are being deleted
  const [deletingMessages, setDeletingMessages] = useState({});

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
   * Checks if user has scrolled to the bottom of the chat
   * Used to determine whether to auto-scroll on new messages
   * 
   * @function isUserAtBottom
   * @returns {boolean} True if at bottom of chat
   */
  const isUserAtBottom = () => {
    if (!messagesContainerRef.current) return true;
    
    const container = messagesContainerRef.current;
    const scrollOffset = 30; // Allow small offset from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight <= scrollOffset;
  };

  /**
   * Fetches all user's chats from the API
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
        
        // Use a longer timeout to ensure DOM is updated before scrolling
        // This is crucial for proper positioning
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
   * Marks all messages in a chat as read
   * 
   * @async
   * @function markChatAsRead
   * @param {string|number} chatId - ID of the chat to mark as read
   */
  const markChatAsRead = async (chatId) => {
    try {
      await API.post(`/chats/${chatId}/read/`);
      
      // Update unread chat counts
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

  /**
   * Checks for new messages in the currently selected chat
   * 
   * @async
   * @function checkForNewMessages
   */
  const checkForNewMessages = useCallback(async () => {
    if (!selectedChat) return;
    
    try {
      // Get the latest message we have
      const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      const params = new URLSearchParams();
      
      if (latestMessage) {
        // Use timestamp-based fetching
        params.append('after_timestamp', latestMessage.created_at);
      }
      
      const url = `/chats/${selectedChat.id}/messages/?${params.toString()}`;
      
      const response = await API.get(url);
      const newMessages = response.data;
      
      if (newMessages.length > 0) {
        // Add the new messages to the existing ones
        setMessages(prevMessages => {
          // Combine with existing messages
          const combined = [...prevMessages, ...newMessages];
          
          // Sort messages by timestamp
          return combined.sort((a, b) => {
            return new Date(a.created_at) - new Date(b.created_at);
          });
        });
        
        // Mark messages as read if user is at the bottom
        if (isUserAtBottom()) {
          markChatAsRead(selectedChat.id);
          // Scroll to bottom to show new messages
          scrollToBottom({ smooth: true });
        }
      }
    } catch (error) {
      console.error('Error checking for new messages:', error);
      // Don't show error toast for background polling to avoid spamming the user
    }
  }, [selectedChat, messages, isUserAtBottom, markChatAsRead, scrollToBottom]);

  /**
   * Handles selecting a chat from the chat list
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
   * Opens the message action menu
   * 
   * @function handleMessageMenuOpen
   * @param {Event} event - The triggering event
   * @param {Object} message - The message being operated on
   * @param {string} action - The action type (reply, edit, delete)
   */
  const handleMessageMenuOpen = (event, message, action) => {
    // If we received a specific action directly from the Message component's menu
    if (action) {
      if (action === 'reply') {
        handleReplyMessage(message);
      } else if (action === 'edit') {
        setEditingMessage(message);
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

  /**
   * Closes the message action menu
   * 
   * @function handleMessageMenuClose
   */
  const handleMessageMenuClose = () => {
    setMessageMenuAnchorEl(null);
    setSelectedMessageForMenu(null);
  };

  /**
   * Sets up a reply to a message
   * 
   * @function handleReplyMessage
   * @param {Object} message - The message being replied to
   */
  const handleReplyMessage = (message) => {
    setReplyTo(message);
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
   * Handles deleting a message
   * 
   * @async
   * @function handleDeleteMessage
   * @param {string|number} messageId - ID of the message to delete
   */
  const handleDeleteMessage = async (messageId) => {
    // If already deleting this message, prevent duplicate requests
    if (deletingMessages[messageId]) return;
    
    // Store the message being deleted in case we need to restore it
    const messageToDelete = messages.find(msg => msg.id === messageId);
    if (!messageToDelete) return; // Message not found
    
    // Optimistically remove the message from the UI
    setMessages(prevMessages => 
      prevMessages.filter(message => message.id !== messageId)
    );
    
    // Mark this message as being deleted (for potential UI feedback, though it's removed now)
    setDeletingMessages(prev => ({ ...prev, [messageId]: true }));
    
    // Close menu immediately
    setMessageMenuAnchorEl(null);
    
    try {
      // Make the API call to delete the message
      await API.delete(`/messages/${messageId}/`);
      
      // If successful, no need to update state further, just maybe a success toast
      // toast.success('Message deleted successfully'); // Optional: Re-enable if desired
      
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message. Restoring...');
      
      // If deletion failed, add the message back to the state in its original position
      setMessages(prevMessages => {
        // Find the index where the message should be reinserted
        const originalIndex = messages.findIndex(msg => msg.id === messageId);
        // Create a new array with the message reinserted
        const restoredMessages = [
          ...prevMessages.slice(0, originalIndex),
          messageToDelete, // Reinsert the original message data
          ...prevMessages.slice(originalIndex)
        ];
        // Ensure correct sorting after reinsertion
        return restoredMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      });
      
    } finally {
      // Remove the deleting flag regardless of success or failure
      setDeletingMessages(prev => {
        const updated = { ...prev };
        delete updated[messageId];
        return updated;
      });
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
    setMessages(prevMessages => {
      // Ensure the message isn't already in the list
      const exists = prevMessages.some(msg => msg.id === newMessage.id);
      if (exists) return prevMessages;
      
      // Add new message and sort by timestamp
      const updatedMessages = [...prevMessages, newMessage];
      return updatedMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    });
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

  // Set up polling for new messages when chat is selected
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
        // Skip polling if user is actively typing in the message field
        const activeElement = document.activeElement;
        const isTypingMessage = activeElement && 
          (activeElement.classList.contains('message-input') || 
           activeElement.tagName === 'TEXTAREA');
        
        if (!isTypingMessage) {
          checkForNewMessages();
        }
      }, 5000); // Less frequent polling to reduce typing disruption
    }
    
    // Clean up on chat change or component unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [selectedChat, checkForNewMessages]);

  // Set up polling for all chats
  useEffect(() => {
    // Initial setup of polling when component mounts
    const allChatsPollingInterval = setInterval(() => {
      if (isLoggedIn) {
        // Skip polling if user is actively typing in the message field
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
                selectedChat={selectedChat}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                addMessage={addMessage}
                scrollToBottom={scrollToBottom}
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