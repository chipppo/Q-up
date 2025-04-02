/**
 * Footer component for the Q-up app
 * 
 * This is a simple footer that shows at the bottom of every page.
 * It includes our logo, copyright info, and links to Terms and Contact pages.
 * 
 * @returns {JSX.Element} The footer component
 */

// src/components/Footer.jsx - Компонент за долен колонтитул (футър)

import React from "react";
import { Link as RouterLink } from "react-router-dom";
import logo from "../../assets/qup-logo.svg";
import "../../styles/components/layout/Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-logo">
        <img src={logo} alt="Q-up Logo" height="24" />
      </div>
      
      <div className="footer-copyright">
        &copy; {new Date().getFullYear()} Q-up. All rights reserved.
      </div>
      
      <div className="footer-links">
        <RouterLink 
          to="/terms-of-service" 
          className="footer-link"
        >
          Terms
        </RouterLink>
        
        <RouterLink 
          to="/contacts" 
          className="footer-link"
        >
          Contact
        </RouterLink>
      </div>
    </footer>
  );
};

export default Footer;
