import React from "react";
import { Container, Typography, Box, Paper, Divider } from "@mui/material";
import Footer from "../components/Footer";

const Contacts = () => {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Container maxWidth="lg" sx={{ flexGrow: 1, py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Contact Us
          </Typography>
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ mb: 6 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
              Get in Touch
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
                Office Hours
              </Typography>
              <Typography paragraph>
                <strong>Hours:</strong> Monday – Friday, 9am – 5pm EST
              </Typography>
              <Typography paragraph>
                <strong>Location:</strong> 123 Gaming Avenue, E-sports City
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
                You can reset your password by clicking on the "Forgot Password" link on the login page, or by emailing our support team at qupbot@gmail.com.
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                Is my personal information secure?
              </Typography>
              <Typography paragraph>
                Yes, we take privacy and security very seriously. Your personal information is encrypted and stored securely according to industry standards.
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                How can I report a bug or technical issue?
              </Typography>
              <Typography paragraph>
                Please email qupbot@gmail.com with details about the issue you're experiencing. Include screenshots if possible to help us diagnose the problem faster.
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
      <Footer />
    </Box>
  );
};

export default Contacts; 