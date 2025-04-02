/**
 * Custom button component with different styles and sizes
 * 
 * This reusable button component can be rendered in different styles
 * (primary, secondary, etc.) and sizes based on the provided props.
 * 
 * @module Button
 */
// src/components/Button.jsx - Компонент за бутон
import "../../styles/components/common/Button.css";

/**
 * Button component with customizable appearance
 * 
 * @function Button
 * @param {Object} props - Component props
 * @param {string} props.text - Button text content
 * @param {Function} props.onClick - Click handler function
 * @param {string} [props.type="primary"] - Button style type (primary, secondary, etc.)
 * @param {string} [props.size] - Button size (small, large, etc.)
 * @returns {JSX.Element} Styled button element
 */
function Button({ text, onClick, type = "primary", size }) {
  const className = `btn ${type !== "primary" ? `btn-${type}` : ''} ${size ? `btn-${size}` : ''}`;
  
  return <button className={className} onClick={onClick}>{text}</button>;
}

export default Button;
  