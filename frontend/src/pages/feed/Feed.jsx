/**
 * Feed page that displays a personalized stream of posts
 * 
 * This page shows posts from users the current user follows, with features for:
 * - Infinite scrolling with pagination
 * - Post interactions (like, comment)
 * - Empty state when no posts are available
 * - Authentication checking and redirection
 * 
 * @module Feed
 * @requires React
 * @requires react-router-dom
 * @requires material-ui
 * @requires react-toastify
 * @requires AuthContext
 */
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Button, 
  Alert,
  Divider,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PostCard from '../../components/feed/PostCard';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import '../../styles/pages/feed/Feed.css';
import CreatePostForm from '../../components/feed/CreatePostForm';

/**
 * Feed page component that displays posts from followed users
 * 
 * @function Feed
 * @param {Object} props - Component props
 * @param {boolean} props.createPostMode - Whether to focus on creating a post
 * @returns {JSX.Element} The feed page
 */
const Feed = ({ createPostMode = false }) => {
  const { isLoggedIn, username } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const postsPerPage = 20;

  /**
   * Redirects unauthenticated users to the login page
   */
  useEffect(() => {
    if (!isLoggedIn) {
      toast.info('Please log in to view your feed');
      navigate('/login', { state: { from: '/feed' } });
    }
  }, [isLoggedIn, navigate]);

  /**
   * Fetches initial posts when component mounts
   */
  useEffect(() => {
    if (isLoggedIn) {
      fetchPosts();
    }
  }, [isLoggedIn]);

  /**
   * Fetches posts with pagination support
   * 
   * @async
   * @function fetchPosts
   * @param {boolean} [loadMore=false] - Whether to append to existing posts or replace them
   */
  const fetchPosts = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // Adding pagination parameters to the request
      const response = await API.get(`/posts/?page=${page}&limit=${postsPerPage}`);
      
      // Checking if there are more posts to load
      const fetchedPosts = response.data;
      
      if (fetchedPosts.length < postsPerPage) {
        setHasMore(false);
      }

      if (loadMore) {
        // Adding new posts to existing ones
        setPosts(prevPosts => [...prevPosts, ...fetchedPosts]);
        setPage(prevPage => prevPage + 1);
      } else {
        // Replacing existing posts
        setPosts(fetchedPosts);
        setPage(2); // Next page will be 2
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      
      // Handling authentication errors
      if (error.response && error.response.status === 401) {
        toast.error('Your session has expired. Please log in again.');
        navigate('/login', { state: { from: '/feed' } });
      } else {
        setError('Failed to load posts. Please try again later.');
        toast.error('Failed to load posts');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  /**
   * Updates a post in the feed after user interaction
   * 
   * @function handlePostUpdate
   * @param {Object} updatedPost - The updated post data
   */
  const handlePostUpdate = (updatedPost) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === updatedPost.id ? updatedPost : post
      )
    );
  };

  /**
   * Removes a post from the feed after deletion
   * 
   * @function handlePostDelete
   * @param {string|number} postId - ID of the post to remove
   */
  const handlePostDelete = (postId) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    toast.success('Post deleted successfully');
  };

  /**
   * Loads more posts when user reaches the end of the feed
   * 
   * @function handleLoadMore
   */
  const handleLoadMore = () => {
    fetchPosts(true);
  };

  // Focus on create post form when in createPostMode
  useEffect(() => {
    if (createPostMode) {
      // Scroll to create post form
      const createPostElement = document.getElementById('create-post-form');
      if (createPostElement) {
        createPostElement.scrollIntoView({ behavior: 'smooth' });
        // Find the first input or textarea and focus it
        const firstInput = createPostElement.querySelector('input, textarea');
        if (firstInput) {
          firstInput.focus();
        }
      }
    }
  }, [createPostMode]);

  if (loading) {
    return (
      <Container className="feed-container" sx={{ textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="feed-container">
        <Alert severity="error">{error}</Alert>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="contained" onClick={() => fetchPosts()}>
            Try Again
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container className="feed-container">
      {/* Create Post Form */}
      <div id="create-post-form">
        <CreatePostForm onPostCreated={handlePostCreated} />
      </div>
      
      {/* Posts list with loading and empty states */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2 }} className="feed-header">
        <Typography variant="h4" component="h1" gutterBottom>
          Your Feed
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          See the latest posts from people you follow
        </Typography>
      </Paper>

      {posts.length === 0 ? (
        <Box className="empty-feed">
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No posts to display
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Follow more users to see their posts in your feed
          </Typography>
        </Box>
      ) : (
        <>
          {posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              onPostUpdate={handlePostUpdate}
              onPostDelete={handlePostDelete}
            />
          ))}
          
          <Box className="load-more-container">
            {loadingMore ? (
              <CircularProgress size={30} />
            ) : hasMore ? (
              <Button 
                variant="outlined" 
                onClick={handleLoadMore}
                size="large"
                className="load-more-button"
              >
                Load More
              </Button>
            ) : (
              <Typography variant="body2" color="text.secondary" className="end-message">
                You've reached the end of your feed
              </Typography>
            )}
          </Box>
        </>
      )}
    </Container>
  );
};

export default Feed; 