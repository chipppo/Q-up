// src/components/Footer.jsx

import React from "react";
import { Box, Typography, Container, Link } from "@mui/material";
import logo from "../assets/qup-logo.svg";

const Footer = () => {
  return (
    <Box 
      component="footer" 
      sx={{ 
        py: 3, 
        position: 'relative',
        backgroundColor: 'background.paper',
        borderTop: '1px solid #444',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.2)'
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <img src={logo} alt="Q-up Logo" height="24" />
        </Box>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          align="center"
        >
          &copy; {new Date().getFullYear()} Q-up. All rights reserved.
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          align="center" 
          sx={{ mt: 1 }}
        >
          <Link 
            color="primary" 
            href="#" 
            sx={{ mx: 1 }}
          >
            Terms
          </Link>
          <Link 
            color="primary" 
            href="#" 
            sx={{ mx: 1 }}
          >
            Privacy
          </Link>
          <Link 
            color="primary" 
            href="#" 
            sx={{ mx: 1 }}
          >
            Contact
          </Link>
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
