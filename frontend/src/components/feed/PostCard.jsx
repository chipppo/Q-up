/**
 * PostCard component for displaying individual social media posts
 * 
 * This component renders a social media post with support for:
 * - Likes and like counts
 * - Comments and comment threads
 * - Image attachments
 * - Post deletion for owners
 * - Nested comment replies
 * 
 * @module PostCard
 * @requires React
 * @requires react-router-dom
 * @requires material-ui
 * @requires react-toastify
 * @requires AuthContext
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card,  CardHeader,  CardMedia,  CardContent,  CardActions,  Avatar,
  IconButton,  Typography,  TextField,  Button,  Box,  Divider,  List,  ListItem,
  ListItemAvatar,  ListItemText,  Collapse,  Menu,  MenuItem,
} from '@mui/material';
import {
  ArrowUpward as LikeIcon,
  ChatBubbleOutline as CommentIcon,
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import { toast } from 'react-toastify';

/**
 * Generates a consistent color from a string (for avatar backgrounds)
 * 
 * @function stringToColor
 * @param {string} string - String to generate color from (usually username)
 * @returns {string} Hex color code
 */
const stringToColor = (string) => {
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

/**
 * Component that displays a social media post with interactive elements
 * 
 * @function PostCard
 * @param {Object} props - Component props
 * @param {Object} props.post - Post data object to display
 * @param {Function} props.onPostUpdate - Callback when post is updated
 * @param {Function} props.onPostDelete - Callback when post is deleted
 * @returns {JSX.Element} The post card component
 */
const PostCard = ({ post, onPostUpdate, onPostDelete }) => {
  const { isLoggedIn, username } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReplies, setShowReplies] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [likesAnchorEl, setLikesAnchorEl] = useState(null);
  const [likes, setLikes] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [liked, setLiked] = useState(post.liked_by_current_user);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const isOwner = post.user.username === username;
  const menuOpen = Boolean(anchorEl);
  const likesMenuOpen = Boolean(likesAnchorEl);

  /**
   * Toggles comment section expansion and loads comments when expanded
   * 
   * @async
   * @function handleExpandClick
   */
  const handleExpandClick = async () => {
    if (!expanded && !loadingComments) {
      setLoadingComments(true);
      
      try {
        const response = await API.get(`/posts/${post.id}/`);
          setComments(response.data.comments || []);
          setLoadingComments(false);
      } catch (error) {
          console.error('Error fetching comments:', error);
          setLoadingComments(false);
        
        if (error.response) {
          if (error.response.status === 404) {
            toast.error('Post not found');
          } else {
            toast.error(error.response.data?.detail || 'Failed to load comments');
          }
        } else if (error.request) {
          toast.error('No response from server. Please check your connection.');
        } else {
          toast.error('Failed to load comments');
        }
      }
    }
    
    setExpanded(!expanded);
  };

  /**
   * Handles liking or unliking a post
   * 
   * @async
   * @function handleLikeClick
   */
  const handleLikeClick = async () => {
    if (!isLoggedIn) {
      toast.error('You must be logged in to like posts');
      return;
    }

    try {
      if (liked) {
        await API.delete(`/posts/${post.id}/like/`);
      } else {
        await API.post(`/posts/${post.id}/like/`);
      }
      // Update the local state
        setLiked(!liked);
      setLikesCount(liked ? likesCount - 1 : likesCount + 1);
      
      // Update the post in the parent component
      if (onPostUpdate) {
        onPostUpdate({
          ...post,
          likes_count: liked ? likesCount - 1 : likesCount + 1,
          liked_by_current_user: !liked
        });
      }
    } catch (error) {
      console.error('Error updating like:', error);
      
      if (error.response) {
        if (error.response.status === 401) {
          toast.error('You must be logged in to like posts');
        } else if (error.response.status === 404) {
          toast.error('Post not found');
        } else {
          toast.error(error.response.data?.detail || 'Failed to update like');
        }
      } else if (error.request) {
        toast.error('No response from server. Please check your connection.');
      } else {
        toast.error('Failed to update like');
      }
    }
  };

  /**
   * Shows a menu with users who liked the post
   * 
   * @async
   * @function handleLikesClick
   * @param {React.MouseEvent} event - Click event
   */
  const handleLikesClick = async (event) => {
    if (likesCount === 0) return;
    
    setLikesAnchorEl(event.currentTarget);
    
    if (!loadingLikes) {
      setLoadingLikes(true);
      
      try {
        const response = await API.get(`/posts/${post.id}/likes/`);
          setLikes(response.data);
          setLoadingLikes(false);
      } catch (error) {
          console.error('Error fetching likes:', error);
          setLoadingLikes(false);
        
        if (error.response) {
          if (error.response.status === 404) {
            toast.error('Post not found');
          } else {
            toast.error(error.response.data?.detail || 'Failed to load likes');
          }
        } else if (error.request) {
          toast.error('No response from server. Please check your connection.');
        } else {
          toast.error('Failed to load likes');
        }
      }
    }
  };

  /**
   * Opens the post options menu
   * 
   * @function handleMenuClick
   * @param {React.MouseEvent} event - Click event
   */
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  /**
   * Closes the post options menu
   * 
   * @function handleMenuClose
   */
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  /**
   * Handles post deletion with confirmation
   * 
   * @async
   * @function handleDeletePost
   */
  const handleDeletePost = async () => {
    // Show confirmation before deleting
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }
    
    try {
      await API.delete(`/posts/${post.id}/`);
        handleMenuClose();
      
      // Call the parent's onPostDelete handler
      if (onPostDelete) {
        onPostDelete(post.id);
        toast.success('Post deleted successfully');
      }
    } catch (error) {
        console.error('Error deleting post:', error);
      
      if (error.response) {
        if (error.response.status === 401) {
          toast.error('You must be logged in to delete posts');
        } else if (error.response.status === 403) {
          toast.error('You do not have permission to delete this post');
        } else if (error.response.status === 404) {
          toast.error('Post not found');
          // If the post is not found, we should still remove it from the UI
          if (onPostDelete) {
            onPostDelete(post.id);
          }
        } else {
          toast.error(error.response.data?.detail || 'Failed to delete post. Please try again.');
        }
      } else if (error.request) {
        toast.error('No response from server. Please check your connection and try again.');
      } else {
        toast.error('Failed to delete post. Please try again.');
      }
    }
  };

  /**
   * Handles adding a new comment to the post
   * 
   * @async
   * @function handleAddComment
   */
  const handleAddComment = async () => {
    if (!commentText.trim() || !isLoggedIn) return;
    
    try {
      const response = await API.post(`/posts/${post.id}/comments/`, {
        text: commentText
      });
      
      // Update the comments state with the new comment
      setComments([...comments, response.data]);
      setCommentText('');
      
      // Update comment count in parent component
      if (onPostUpdate) {
        onPostUpdate({ 
          ...post, 
          comments_count: post.comments_count + 1 
        });
      }
      
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      
      // Handle different error scenarios
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status === 401) {
          toast.error('You must be logged in to comment');
        } else if (error.response.status === 404) {
          toast.error('The post could not be found');
        } else {
          toast.error(error.response.data?.detail || 'Failed to add comment. Please try again.');
        }
      } else if (error.request) {
        // The request was made but no response was received
        toast.error('No response from server. Please check your connection and try again.');
      } else {
        // Something happened in setting up the request that triggered an Error
        toast.error('Failed to add comment. Please try again.');
      }
    }
  };

  /**
   * Handles adding a reply to an existing comment
   * 
   * @async
   * @function handleAddReply
   * @param {number|string} commentId - ID of the comment being replied to
   */
  const handleAddReply = async (commentId) => {
    if (!replyText.trim() || !isLoggedIn) return;
    
    try {
      const response = await API.post(`/comments/${commentId}/replies/`, {
        text: replyText.trim()
      });
      
      // Update the UI to show the new reply immediately
      setShowReplies(prev => {
        // Get current replies or initialize empty array if none exist
        const currentReplies = prev[commentId] || [];
        // Ensure currentReplies is an array before spreading
        const repliesArray = Array.isArray(currentReplies) ? currentReplies : [];
        return {
          ...prev,
          [commentId]: [...repliesArray, response.data]
        };
      });
      
      // Update the comment's reply count
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, reply_count: (comment.reply_count || 0) + 1 } 
            : comment
        )
      );
      
      // Clear the reply input and close the reply form
      setReplyText('');
      setReplyingTo(null);
      
      toast.success('Reply added successfully');
    } catch (error) {
      console.error('Error adding reply:', error);
      
      if (error.response) {
        if (error.response.status === 401) {
          toast.error('You must be logged in to reply to comments');
        } else if (error.response.status === 404) {
          toast.error('The comment could not be found');
        } else {
          toast.error(error.response.data?.error || error.response.data?.detail || 'Failed to add reply. Please try again.');
        }
      } else if (error.request) {
        toast.error('No response from server. Please check your connection and try again.');
      } else {
        toast.error('Failed to add reply. Please try again.');
      }
    }
  };

  /**
   * Handles deleting a comment or reply
   * 
   * @async
   * @function handleDeleteComment
   * @param {number|string} commentId - ID of the comment to delete
   */
  const handleDeleteComment = async (commentId) => {
    // Show confirmation before deleting
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    
    try {
      await API.delete(`/comments/${commentId}/`);
      
      // If it's a reply, update the parent comment's reply count
      const parentComment = comments.find(comment => 
        showReplies[comment.id] && 
        Array.isArray(showReplies[comment.id]) && 
        showReplies[comment.id].some(reply => reply.id === commentId)
      );
      
      if (parentComment) {
        // It's a reply, update the parent's reply count and remove from replies
        setComments(prev => 
          prev.map(comment => 
            comment.id === parentComment.id 
              ? { ...comment, reply_count: Math.max(0, comment.reply_count - 1) } 
              : comment
          )
        );
        
        // Remove the reply from showReplies
        setShowReplies(prev => ({
          ...prev,
          [parentComment.id]: prev[parentComment.id].filter(reply => reply.id !== commentId)
        }));
      } else {
        // It's a top-level comment, remove it from comments
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        
        // Update comment count in parent component
        if (onPostUpdate) {
          onPostUpdate({ 
            ...post, 
            comments_count: Math.max(0, post.comments_count - 1) 
          });
        }
      }
      
        toast.success('Comment deleted successfully');
    } catch (error) {
        console.error('Error deleting comment:', error);
      
      // Handle different error scenarios
      if (error.response) {
        if (error.response.status === 401) {
          toast.error('You must be logged in to delete comments');
        } else if (error.response.status === 403) {
          toast.error('You do not have permission to delete this comment');
        } else if (error.response.status === 404) {
          toast.error('The comment could not be found');
          
          // If the comment is not found, we should still remove it from the UI
          setComments(prev => prev.filter(comment => comment.id !== commentId));
        } else {
          toast.error(error.response.data?.detail || 'Failed to delete comment. Please try again.');
        }
      } else if (error.request) {
        toast.error('No response from server. Please check your connection and try again.');
      } else {
        toast.error('Failed to delete comment. Please try again.');
      }
    }
  };

  /**
   * Toggles showing/hiding replies for a comment
   * 
   * @async
   * @function toggleReplies
   * @param {number|string} commentId - ID of the comment to toggle replies for
   */
  const toggleReplies = async (commentId) => {
    if (showReplies[commentId]) {
      setShowReplies(prev => ({ ...prev, [commentId]: false }));
    } else {
      try {
        const response = await API.get(`/comments/${commentId}/replies/`);
          const replies = response.data;
          setShowReplies(prev => ({ ...prev, [commentId]: replies }));
      } catch (error) {
          console.error('Error fetching replies:', error);
        
        if (error.response) {
          if (error.response.status === 404) {
            toast.error('Comment not found');
          } else {
            toast.error(error.response.data?.detail || 'Failed to load replies');
          }
        } else if (error.request) {
          toast.error('No response from server. Please check your connection.');
        } else {
          toast.error('Failed to load replies');
        }
      }
    }
  };

  /**
   * Gets avatar props with correct colors and sources
   * 
   * @function getAvatarProps
   * @param {Object} user - User data for the avatar
   * @returns {Object} Props for the Avatar component
   */
  const getAvatarProps = (user) => ({
    sx: {
      bgcolor: user.avatar ? 'transparent' : stringToColor(user.username),
    },
    children: user.avatar ? null : user.username[0].toUpperCase(),
    src: user.avatar || null,
  });

  return (
    <Card sx={{ maxWidth: 600, mb: 3, mx: 'auto' }}>
      {/* Post Header */}
      <CardHeader
        avatar={
          <Avatar 
            {...getAvatarProps(post.user)}
            alt={post.user.username}
          />
        }
        action={
          isOwner && (
            <>
              <IconButton onClick={handleMenuClick}>
                <MoreIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={handleDeletePost}>
                  <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                  Delete Post
                </MenuItem>
              </Menu>
            </>
          )
        }
        title={
          <Typography 
            component={Link} 
            to={`/profile/${post.user.username}`}
            sx={{ textDecoration: 'none', color: 'inherit', fontWeight: 'bold' }}
          >
            {post.user.display_name || post.user.username}
          </Typography>
        }
        subheader={new Date(post.created_at).toLocaleString()}
      />

      {/* Post Image */}
      {post.image && (
        <CardMedia
          component="img"
          image={post.image}
          alt="Post content"
          sx={{ 
            maxHeight: 500,
            objectFit: 'contain'
          }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      )}

      {/* Post Content */}
      <CardContent>
        <Typography variant="body1">{post.caption}</Typography>
        
        {post.game && (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Game: 
            </Typography>
            <Typography 
              variant="body2" 
              component={Link} 
              to={`/games/${post.game.id}`}
              sx={{ ml: 1, textDecoration: 'none', color: 'primary.main' }}
            >
              {post.game.name}
            </Typography>
          </Box>
        )}
      </CardContent>

      {/* Post Actions */}
      <CardActions disableSpacing>
        <IconButton 
          onClick={handleLikeClick}
          color={liked ? "primary" : "default"}
        >
          <LikeIcon />
        </IconButton>
        
        <Button 
          size="small" 
          onClick={handleLikesClick}
          disabled={likesCount === 0}
        >
          {likesCount} {likesCount === 1 ? 'like' : 'likes'}
        </Button>
        
        <Menu
          anchorEl={likesAnchorEl}
          open={likesMenuOpen}
          onClose={() => setLikesAnchorEl(null)}
        >
          {loadingLikes ? (
            <MenuItem disabled>Loading...</MenuItem>
          ) : (
            likes.map(like => (
              <MenuItem 
                key={like.id}
                component={Link}
                to={`/profile/${like.user.username}`}
                onClick={() => setLikesAnchorEl(null)}
              >
                <ListItemAvatar>
                  <Avatar
                    {...getAvatarProps(like.user)}
                    alt={like.user.username}
                  />
                </ListItemAvatar>
                <ListItemText primary={like.user.display_name || like.user.username} />
              </MenuItem>
            ))
          )}
        </Menu>
        
        <IconButton 
          onClick={handleExpandClick}
          sx={{ ml: 'auto' }}
        >
          <CommentIcon />
        </IconButton>
        <Typography variant="body2">
          {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
        </Typography>
      </CardActions>

      {/* Comments Section */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Divider />
        <CardContent>
          {/* Comment List */}
          {loadingComments ? (
            <Typography variant="body2" color="text.secondary" align="center">
              Loading comments...
            </Typography>
          ) : comments.length > 0 ? (
            <List sx={{ width: '100%', p: 0 }}>
              {comments.map(comment => (
                <React.Fragment key={comment.id}>
                  <ListItem 
                    alignItems="flex-start"
                    secondaryAction={
                      (comment.user.username === username) && (
                        <IconButton 
                          edge="end" 
                          size="small"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemAvatar>
                      <Avatar 
                        {...getAvatarProps(comment.user)}
                        alt={comment.user.username}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1">
                          {comment.user.username}
                        </Typography>
                      }
                      secondary={
                        <Box component="span">
                          <Typography
                            component="span"
                            variant="body2"
                            color="textPrimary"
                          >
                            {comment.text}
                          </Typography>
                          <Box component="span" sx={{ display: 'block', mt: 1 }}>
                            <Typography
                              component="span"
                              variant="caption"
                              color="textSecondary"
                              sx={{ mr: 2 }}
                            >
                              {new Date(comment.created_at).toLocaleString()}
                            </Typography>
                            {comment.reply_count > 0 && (
                              <Button 
                                size="small" 
                                onClick={() => toggleReplies(comment.id)}
                                sx={{ mr: 1 }}
                              >
                                {showReplies[comment.id] ? 'Hide Replies' : `Show ${comment.reply_count} Replies`}
                              </Button>
                            )}
                            <Button
                              size="small"
                              onClick={() => setReplyingTo(comment.id)}
                              sx={{ mr: 1 }}
                            >
                              Reply
                            </Button>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  
                  {/* Reply Form */}
                  {replyingTo === comment.id && (
                    <Box sx={{ pl: 7, pr: 2, pb: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Write a reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        InputProps={{
                          endAdornment: (
                            <IconButton 
                              size="small" 
                              onClick={() => handleAddReply(comment.id)}
                              disabled={!replyText.trim()}
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                          ),
                        }}
                      />
                    </Box>
                  )}
                  
                  {/* Replies */}
                  {showReplies[comment.id] && Array.isArray(showReplies[comment.id]) && (
                    <Box sx={{ pl: 7 }}>
                      <List disablePadding>
                        {showReplies[comment.id].map(reply => (
                          <ListItem 
                            key={reply.id}
                            alignItems="flex-start"
                            sx={{ py: 0.5 }}
                            secondaryAction={
                              (reply.user.username === username) && (
                                <IconButton 
                                  edge="end" 
                                  size="small"
                                  onClick={() => handleDeleteComment(reply.id)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )
                            }
                          >
                            <ListItemAvatar sx={{ minWidth: 36 }}>
                              <Avatar 
                                {...getAvatarProps(reply.user)}
                                alt={reply.user.username}
                                sx={{ 
                                  width: 24, 
                                  height: 24,
                                  ...getAvatarProps(reply.user).sx 
                                }}
                              />
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography 
                                  component={Link} 
                                  to={`/profile/${reply.user.username}`}
                                  sx={{ textDecoration: 'none', color: 'inherit', fontWeight: 'bold' }}
                                  variant="body2"
                                >
                                  {reply.user.display_name || reply.user.username}
                                </Typography>
                              }
                              secondary={
                                <>
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    color="text.primary"
                                  >
                                    {reply.text}
                                  </Typography>
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {new Date(reply.created_at).toLocaleString()}
                                  </Typography>
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                  
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" align="center">
              No comments yet. Be the first to comment!
            </Typography>
          )}

          {/* Add Comment Form */}
          {isLoggedIn && (
            <Box sx={{ display: 'flex', mt: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <Button 
                variant="contained" 
                sx={{ ml: 1 }}
                disabled={!commentText.trim()}
                onClick={handleAddComment}
              >
                Post
              </Button>
            </Box>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default PostCard; 