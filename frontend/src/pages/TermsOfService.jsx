import React from "react";
import { Container, Typography, Box, Paper, Divider } from "@mui/material";
import Footer from "../components/Footer";

const TermsOfService = () => {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Container maxWidth="lg" sx={{ flexGrow: 1, py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Terms of Service
          </Typography>
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
            1. Acceptance of Terms
          </Typography>
          <Typography paragraph>
            By accessing and using Q-up, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this service.
          </Typography>
          
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
            2. User Accounts
          </Typography>
          <Typography paragraph>
            When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
          </Typography>
          <Typography paragraph>
            You are responsible for safeguarding the password and for all activities that occur under your account. You agree not to disclose your password to any third party.
          </Typography>
          
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
            3. User Content
          </Typography>
          <Typography paragraph>
            Our service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material. You are responsible for the content you post on Q-up.
          </Typography>
          <Typography paragraph>
            By posting content on Q-up, you represent and warrant that the content is yours or you have the right to use it and grant us the rights and license as provided in these Terms.
          </Typography>
          
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
            4. Prohibited Activities
          </Typography>
          <Typography paragraph>
            You may not engage in any activity that interferes with or disrupts the services (or the servers and networks which are connected to the services).
          </Typography>
          <Typography paragraph>
            You may not attempt to gain unauthorized access to any portion or feature of the service, or any other systems or networks connected to the service.
          </Typography>
          
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
            5. Privacy Policy
          </Typography>
          <Typography paragraph>
            Please review our Privacy Policy, which also governs your visit to our platform, to understand our practices regarding your personal data.
          </Typography>
          
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
            6. Changes to Terms
          </Typography>
          <Typography paragraph>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will provide at least 30 days' notice prior to any new terms taking effect.
          </Typography>
          
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
            7. Contact Us
          </Typography>
          <Typography paragraph>
            If you have any questions about these Terms, please contact us.
          </Typography>
          
          <Box sx={{ mt: 4, p: 3, bgcolor: "background.paper", borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              Last updated: {new Date().toLocaleDateString()}
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default TermsOfService; 