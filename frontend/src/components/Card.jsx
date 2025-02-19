// src/components/Card.jsx

import React from "react";

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
