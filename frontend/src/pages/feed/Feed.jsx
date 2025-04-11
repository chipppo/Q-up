/**
 * Feed page that displays a personalized stream of posts
 * 
 * This page shows posts from users the current user follows, with features for:
 * - Infinite scrolling with pagination
 * - Post interactions (like, comment)
 * - Empty state when no posts are available
 * - Authentication checking and redirection
 * - Post creation functionality
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
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import PostCard from '../../components/feed/PostCard';
import CreatePostForm from '../../components/feed/CreatePostForm';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import '../../styles/pages/feed/Feed.css';

/**
 * Feed page component that displays posts from followed users
 * 
 * @function Feed
 * @returns {JSX.Element} The feed page
 */
const Feed = () => {
  const { isLoggedIn, username } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [feedType, setFeedType] = useState('following'); // 'following' or 'all'
  const [showCreateForm, setShowCreateForm] = useState(false);
  const postsPerPage = 20;

  // Check if user was redirected from the dashboard "Create First Post" button
  useEffect(() => {
    // Check if we came from dashboard
    const fromDashboard = location.state?.from === '/dashboard' || 
                          document.referrer.includes('/dashboard');
    if (fromDashboard) {
      setShowCreateForm(true);
    }
  }, [location]);

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
  }, [isLoggedIn, feedType]);

  /**
   * Handles tab change between Following and All feeds
   */
  const handleTabChange = (event, newValue) => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    setFeedType(newValue);
  };

  /**
   * Handles successfully created posts by adding them to the feed
   * 
   * @function handlePostCreated
   * @param {Object} newPost - The newly created post data
   */
  const handlePostCreated = (newPost) => {
    setPosts(prevPosts => [newPost, ...prevPosts]);
    setShowCreateForm(false);
  };

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

      // Choose the appropriate endpoint based on feed type
      const endpoint = feedType === 'following' ? '/posts/' : '/all-posts/';
      
      // Adding pagination parameters to the request
      const response = await API.get(`${endpoint}?page=${loadMore ? page : 1}&limit=${postsPerPage}`);
      
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
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2 }} className="feed-header">
        <Typography variant="h4" component="h1" gutterBottom>
          {feedType === 'following' ? 'Your Feed' : 'All Posts'}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {feedType === 'following' 
            ? 'See the latest posts from people you follow' 
            : 'Discover posts from all users on the platform'}
        </Typography>
        
        {/* Feed Type Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
          <Tabs 
            value={feedType} 
            onChange={handleTabChange} 
            aria-label="feed type tabs"
            sx={{ '& .MuiTab-root': { fontWeight: 'bold' } }}
          >
            <Tab value="following" label="Following" />
            <Tab value="all" label="Discover All" />
          </Tabs>
        </Box>
      </Paper>

      {/* Create Post Form */}
      {isLoggedIn && (
        <Box sx={{ mb: 4 }}>
          {showCreateForm ? (
            <CreatePostForm onPostCreated={handlePostCreated} />
          ) : (
            <Button 
              fullWidth 
              variant="outlined" 
              color="primary" 
              sx={{ p: 2, borderRadius: 2 }}
              onClick={() => setShowCreateForm(true)}
            >
              Create a new post...
            </Button>
          )}
        </Box>
      )}

      {posts.length === 0 ? (
        <Box className="empty-feed">
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No posts to display
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {feedType === 'following' 
              ? 'Follow more users to see their posts in your feed' 
              : 'Be the first to create a post!'}
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