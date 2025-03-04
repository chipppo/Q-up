import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardMedia,
  CardContent,
  CardActions,
  Avatar,
  IconButton,
  Typography,
  TextField,
  Button,
  Box,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Collapse,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  ArrowUpward as LikeIcon,
  ChatBubbleOutline as CommentIcon,
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { toast } from 'react-toastify';

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

  // Fetch post details when expanded
  const handleExpandClick = () => {
    if (!expanded && !loadingComments) {
      setLoadingComments(true);
      API.get(`/posts/${post.id}/`)
        .then(response => {
          setComments(response.data.comments || []);
          setLoadingComments(false);
        })
        .catch(error => {
          console.error('Error fetching comments:', error);
          setLoadingComments(false);
          toast.error('Failed to load comments');
        });
    }
    setExpanded(!expanded);
  };

  // Handle like/unlike
  const handleLikeClick = () => {
    if (!isLoggedIn) {
      toast.error('Please log in to like posts');
      return;
    }

    const method = liked ? 'delete' : 'post';
    API[method](`/posts/${post.id}/like/`)
      .then(() => {
        setLiked(!liked);
        setLikesCount(prev => (liked ? prev - 1 : prev + 1));
      })
      .catch(error => {
        console.error('Error toggling like:', error);
        toast.error('Failed to update like');
      });
  };

  // Show likes list
  const handleLikesClick = (event) => {
    if (likesCount === 0) return;
    
    setLikesAnchorEl(event.currentTarget);
    if (!loadingLikes) {
      setLoadingLikes(true);
      API.get(`/posts/${post.id}/likes/`)
        .then(response => {
          setLikes(response.data);
          setLoadingLikes(false);
        })
        .catch(error => {
          console.error('Error fetching likes:', error);
          setLoadingLikes(false);
          toast.error('Failed to load likes');
        });
    }
  };

  // Post menu
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Delete post
  const handleDeletePost = () => {
    if (!isOwner) return;
    
    API.delete(`/posts/${post.id}/`)
      .then(() => {
        handleMenuClose();
        if (onPostDelete) onPostDelete(post.id);
        toast.success('Post deleted successfully');
      })
      .catch(error => {
        console.error('Error deleting post:', error);
        toast.error('Failed to delete post');
      });
  };

  // Add comment
  const handleAddComment = () => {
    if (!commentText.trim() || !isLoggedIn) return;
    
    API.post(`/posts/${post.id}/comments/`, { text: commentText })
      .then(response => {
        setComments(prev => [...prev, response.data]);
        setCommentText('');
        // Update comment count in parent component
        if (onPostUpdate) onPostUpdate({ ...post, comments_count: post.comments_count + 1 });
      })
      .catch(error => {
        console.error('Error adding comment:', error);
        toast.error('Failed to add comment');
      });
  };

  // Add reply
  const handleAddReply = (commentId) => {
    if (!replyText.trim() || !isLoggedIn) return;
    
    API.post(`/posts/${post.id}/comments/`, { 
      text: replyText,
      parent: commentId
    })
      .then(() => {
        setReplyText('');
        setReplyingTo(null);
        // Refresh comments to show the new reply
        API.get(`/posts/${post.id}/`)
          .then(response => {
            setComments(response.data.comments || []);
          })
          .catch(error => {
            console.error('Error refreshing comments:', error);
          });
      })
      .catch(error => {
        console.error('Error adding reply:', error);
        toast.error('Failed to add reply');
      });
  };

  // Delete comment
  const handleDeleteComment = (commentId) => {
    API.delete(`/comments/${commentId}/`)
      .then(() => {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        // Update comment count in parent component
        if (onPostUpdate) onPostUpdate({ ...post, comments_count: post.comments_count - 1 });
        toast.success('Comment deleted successfully');
      })
      .catch(error => {
        console.error('Error deleting comment:', error);
        toast.error('Failed to delete comment');
      });
  };

  // Toggle replies visibility
  const toggleReplies = (commentId) => {
    if (showReplies[commentId]) {
      setShowReplies(prev => ({ ...prev, [commentId]: false }));
    } else {
      API.get(`/comments/${commentId}/replies/`)
        .then(response => {
          const replies = response.data;
          setShowReplies(prev => ({ ...prev, [commentId]: replies }));
        })
        .catch(error => {
          console.error('Error fetching replies:', error);
          toast.error('Failed to load replies');
        });
    }
  };

  return (
    <Card sx={{ maxWidth: 600, mb: 3, mx: 'auto' }}>
      {/* Post Header */}
      <CardHeader
        avatar={
          <Avatar 
            src={post.user.avatar} 
            alt={post.user.username}
            component={Link}
            to={`/profile/${post.user.username}`}
            sx={{ textDecoration: 'none' }}
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
          alt="Post"
          sx={{ 
            maxHeight: 500,
            objectFit: 'contain',
            bgcolor: '#f0f0f0'
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
                  <Avatar src={like.user.avatar} alt={like.user.username} />
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
                        src={comment.user.avatar} 
                        alt={comment.user.username}
                        component={Link}
                        to={`/profile/${comment.user.username}`}
                        sx={{ width: 32, height: 32 }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography 
                          component={Link} 
                          to={`/profile/${comment.user.username}`}
                          sx={{ textDecoration: 'none', color: 'inherit', fontWeight: 'bold' }}
                          variant="body2"
                        >
                          {comment.user.display_name || comment.user.username}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {comment.text}
                          </Typography>
                          <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center' }}>
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                            >
                              {new Date(comment.created_at).toLocaleString()}
                            </Typography>
                            {isLoggedIn && (
                              <Button 
                                size="small" 
                                sx={{ ml: 1, minWidth: 'auto', p: 0 }}
                                onClick={() => setReplyingTo(comment.id === replyingTo ? null : comment.id)}
                              >
                                Reply
                              </Button>
                            )}
                            {comment.reply_count > 0 && (
                              <Button 
                                size="small" 
                                sx={{ ml: 1, minWidth: 'auto', p: 0 }}
                                onClick={() => toggleReplies(comment.id)}
                              >
                                {showReplies[comment.id] ? 'Hide Replies' : `View ${comment.reply_count} Replies`}
                              </Button>
                            )}
                          </Box>
                        </>
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
                                src={reply.user.avatar} 
                                alt={reply.user.username}
                                sx={{ width: 24, height: 24 }}
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
                                    component="div"
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