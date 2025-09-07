import React from "react";
import "../designs/rates.css";

const RateHoverModal = ({ visible, position, title, schedule, rates }) => {
  if (!visible) return null;
  return (
    <div className="rate-hover-modal" style={{ top: position.y, left: position.x }}>
      <h3>{title}</h3>
      <div>
        <strong>Schedule:</strong>
        <pre>{schedule}</pre>
      </div>
      <div>
        <strong>Rates:</strong>
        <pre>{rates}</pre>
      </div>
    </div>
  );
};

export default RateHoverModal; 