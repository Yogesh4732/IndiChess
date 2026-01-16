import React from "react";

const Moves = ({ moves }) => {
  return (
    <div className="moves">
      <h2>Moves</h2>
      <ul>
        {moves.map((move, index) => (
          <li key={index}>
            {index + 1} {move.moveToWhite} {move.moveToBlack}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Moves;
