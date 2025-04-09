/**
 * Card component for displaying content in a structured box layout
 * 
 * This component creates a styled card with a title, description,
 * and a button that can be used throughout the application.
 * 
 * @module Card
 */
// src/components/Card.jsx - Компонент за карта

import React from "react";
import "../../styles/components/common/Card.css";

/**
 * Renders a card with title, description and button
 * 
 * @function Card
 * @param {Object} props - Component props
 * @param {string} props.title - Card title
 * @param {string} props.description - Card description text
 * @param {string} props.buttonLabel - Text for the card's button
 * @returns {JSX.Element} Styled card component
 */
const Card = ({ title, description, buttonLabel }) => {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{description}</p>
      <button>{buttonLabel}</button>
    </div>
  );
};

export default Card;
