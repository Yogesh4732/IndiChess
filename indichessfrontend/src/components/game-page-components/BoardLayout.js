import React from "react";
import Player from "./Player";
import Board from "./Board";
import "../component-styles/BoardLayout.css";

const BoardLayout = ({ 
  addMove, 
  sendMove, 
  opponentMove, // New prop
  playerColor, 
  isMyTurn, 
  matchId,
  isConnected,
  whiteTime,
  blackTime,
  player1,
  player2,
  gameType
}) => {

  const formatTime = (seconds) => {
    if (seconds == null) return "";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const myIsPlayer1 = playerColor === 'white'; // player1 is always white
  const myInfo = myIsPlayer1 ? player1 : player2;
  const oppInfo = myIsPlayer1 ? player2 : player1;
  const myColor = playerColor;
  const oppColor = myColor === 'white' ? 'black' : 'white';

  const myTime = gameType === 'RAPID' 
    ? formatTime(myColor === 'white' ? whiteTime : blackTime) 
    : "";
  const oppTime = gameType === 'RAPID' 
    ? formatTime(oppColor === 'white' ? whiteTime : blackTime) 
    : "";

  return (
    <div className="board-layout-main">
      <Player 
        username={oppInfo?.username || 'Opponent'}
        rating={""}
        country={""}
        time={oppTime}
      />
      <Board 
        addMove={addMove}
        sendMove={sendMove}
        opponentMove={opponentMove} // Pass to Board
        playerColor={playerColor}
        isMyTurn={isMyTurn}
        isConnected={isConnected}
      />
      <Player 
        username={myInfo?.username || 'You'}
        rating={""}
        country={""}
        time={myTime}
      />
    </div>
  );
};

export default BoardLayout;