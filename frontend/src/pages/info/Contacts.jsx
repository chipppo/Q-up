/**
 * Contacts Page Component
 * 
 * This component displays contact information, support details, business hours,
 * and frequently asked questions to help users get assistance or find answers
 * to common questions about the Q-up platform.
 * 
 * @module Contacts
 * @requires react
 * @requires @mui/material
 */
import React from "react";
import { Container, Typography, Box, Paper, Divider } from "@mui/material";
import Footer from "../../components/layout/Footer";

/**
 * Contacts component - Displays contact information and FAQs
 * 
 * @returns {JSX.Element} The rendered Contacts page component
 */
const Contacts = () => {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Container maxWidth="lg" sx={{ flexGrow: 1, py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Contacts
          </Typography>
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ mb: 6 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
              Get in Touch with Us
            </Typography>
            <Typography paragraph>
              We'd love to hear from you! Whether you have a question about our services, need help with your account, or have suggestions, our team is ready to assist you.
            </Typography>
            
            <Box sx={{ mt: 4, p: 4, bgcolor: "background.paper", borderRadius: 2, border: "1px solid rgba(0, 255, 170, 0.3)" }}>
              <Typography variant="h6" gutterBottom sx={{ color: "primary.main" }}>
                Customer Support
              </Typography>
              <Typography variant="h5" paragraph sx={{ fontWeight: 600 }}>
                qupbot@gmail.com
              </Typography>
              <Typography color="text.secondary">
                Our support team typically responds within 24 hours on business days.
              </Typography>
            </Box>
            
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Business Hours
              </Typography>
              <Typography paragraph>
                <strong>Hours:</strong> Monday – Friday, 9:00 AM – 5:00 PM Eastern Standard Time
              </Typography>
              <Typography paragraph>
                <strong>Location:</strong> 123 Gamer Street, E-sport City
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ mt: 6 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
              Frequently Asked Questions
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                How do I reset my password?
              </Typography>
              <Typography paragraph>
                You can reset your password by clicking the "Forgot Password" link on the login page or by sending an email to our support team at qupbot@gmail.com.
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                Is my personal information protected?
              </Typography>
              <Typography paragraph>
                Yes, we take privacy and security very seriously. Your personal information is encrypted and stored securely according to industry standards.
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                How can I report a bug or technical issue?
              </Typography>
              <Typography paragraph>
                Please send an email to qupbot@gmail.com with details of the issue you're experiencing. Include screenshots if possible to help us diagnose the problem more quickly.
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Contacts; 