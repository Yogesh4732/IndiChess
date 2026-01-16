import React, { useState, useEffect, useRef } from "react";
import BoardLayout from "./BoardLayout";
import GamePlayControlContainer from "./GamePlayControlContainer";

const GameContainer = ({ matchId, stompClient, isConnected, playerColor, initialGameData, username }) => {
  const [moves, setMoves] = useState([]);
  const [isMyTurn, setIsMyTurn] = useState(initialGameData?.isMyTurn || (playerColor === 'white'));
  const [gameStatus, setGameStatus] = useState(initialGameData?.status || "Game started");
  const [opponentMove, setOpponentMove] = useState(null); // To trigger board updates
  const moveSubscriptionRef = useRef(null);
  const gameStateSubscriptionRef = useRef(null);
  const drawOfferSubscriptionRef = useRef(null);

  // Time control: 10 minutes per side for RAPID games
  const isRapid = initialGameData?.gameType === 'RAPID';
  const [whiteTime, setWhiteTime] = useState(isRapid ? 600 : null); // seconds
  const [blackTime, setBlackTime] = useState(isRapid ? 600 : null); // seconds
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const timerRef = useRef(null);

  // Listen for WebSocket messages
  useEffect(() => {
    // Only subscribe when the STOMP client is actually connected
    if (!stompClient || !isConnected || !stompClient.connected) return;

    try {
      // Subscribe to move updates
      moveSubscriptionRef.current = stompClient.subscribe(`/topic/moves/${matchId}`, (message) => {
        try {
          const moveData = JSON.parse(message.body);
          console.log("Received opponent move:", moveData);

          // Set opponent move to trigger board update
          setOpponentMove(moveData);

          // Update turn based on backend's isWhiteTurn and local player color
          if (
            (moveData.isWhiteTurn && playerColor === "white") ||
            (!moveData.isWhiteTurn && playerColor === "black")
          ) {
            setIsMyTurn(true);
            setGameStatus("Your turn!");
          } else {
            setIsMyTurn(false);
            setGameStatus("Waiting for opponent...");
          }

          // Add move to history if provided
          if (moveData.move) {
            addMove(moveData.move);
          }

          // First real move seen -> start clocks
          if (!hasGameStarted) {
            setHasGameStarted(true);
          }

        } catch (error) {
          console.error("Error parsing move data:", error);
        }
      });

      // Subscribe to game state updates (resign, draw, etc.)
      gameStateSubscriptionRef.current = stompClient.subscribe(`/topic/game-state/${matchId}`, (message) => {
        try {
          const state = JSON.parse(message.body);
          console.log("Game state update:", state);
          
          if (state.isMyTurn !== undefined) {
            setIsMyTurn(state.isMyTurn);
          }
          if (state.status) {
            setGameStatus(state.status);
          }
          
          if (state.result) {
            // Game ended
            setGameStatus(`Game Over: ${state.result}`);
            alert(`Game Over: ${state.result}`);
          }

        } catch (error) {
          console.error("Error parsing game state:", error);
        }
      });

      // Subscribe to per-user draw offer queue
      drawOfferSubscriptionRef.current = stompClient.subscribe(`/user/queue/draw-offers`, (message) => {
        try {
          const payload = JSON.parse(message.body);
          console.log("Draw offer message:", payload);

          if (payload.type === "DRAW_OFFER_SENT") {
            // Confirmation for the player who offered the draw
            alert("Draw offer sent to your opponent.");
          } else if (payload.type === "DRAW_OFFER") {
            // Incoming draw offer from opponent
            const from = payload.from || "Your opponent";
            const accept = window.confirm(`${from} offers a draw. Do you accept?`);
            if (accept) {
              // Send draw acceptance directly
              stompClient.publish({
                destination: `/app/game/${matchId}/draw/accept`,
                body: JSON.stringify({
                  playerColor: playerColor,
                  timestamp: new Date().toISOString(),
                  matchId: matchId
                })
              });
            }
          }
        } catch (err) {
          console.error("Error handling draw-offer message:", err);
        }
      });
    } catch (e) {
      console.error("Failed to subscribe to STOMP topics:", e);
    }

    return () => {
      if (moveSubscriptionRef.current) {
        moveSubscriptionRef.current.unsubscribe();
      }
      if (gameStateSubscriptionRef.current) {
        gameStateSubscriptionRef.current.unsubscribe();
      }
      if (drawOfferSubscriptionRef.current) {
        drawOfferSubscriptionRef.current.unsubscribe();
      }
    };
  }, [stompClient, isConnected, matchId, playerColor]);

  // Timer effect: decrement clocks based on whose turn it is (per client view)
  useEffect(() => {
    if (!isRapid) return;
    if (!isConnected) return;
    if (!hasGameStarted) return; // do not start countdown until the first move has been made

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      // From this client's perspective: when it's my turn, my clock runs;
      // when it's opponent's turn, their clock runs.
      if (playerColor === 'white') {
        setWhiteTime((prev) => {
          if (prev == null || prev <= 0) return prev;
          const shouldTick = isMyTurn;
          if (!shouldTick) return prev;
          const next = prev - 1;
          return next < 0 ? 0 : next;
        });
        setBlackTime((prev) => {
          if (prev == null || prev <= 0) return prev;
          const shouldTick = !isMyTurn;
          if (!shouldTick) return prev;
          const next = prev - 1;
          return next < 0 ? 0 : next;
        });
      } else { // player is black
        setBlackTime((prev) => {
          if (prev == null || prev <= 0) return prev;
          const shouldTick = isMyTurn;
          if (!shouldTick) return prev;
          const next = prev - 1;
          return next < 0 ? 0 : next;
        });
        setWhiteTime((prev) => {
          if (prev == null || prev <= 0) return prev;
          const shouldTick = !isMyTurn;
          if (!shouldTick) return prev;
          const next = prev - 1;
          return next < 0 ? 0 : next;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRapid, isConnected, isMyTurn, playerColor, hasGameStarted]);

  const addMove = (move) => {
    // Your existing move adding logic
    if(move.piece !== move.piece.toLowerCase()) {
      // White's move
      const newMove = {
        move: move,
        moveToWhite: move.moveTo,
        fen: move.fen,
        tc: `White's Turn: ${move.tc || ''}`,
        tr: move.tr || ''
      };
      setMoves((moves) => [...moves, newMove]);
    } else {
      // Black's move - update last move
      setMoves((prevMoves) => {
        if (prevMoves.length === 0) return prevMoves;
        
        const newMoves = [...prevMoves];
        const lastMove = { 
          ...newMoves[newMoves.length - 1], 
          moveToBlack: move.moveTo,
          tc: `Black's Turn: ${move.tc || ''}`,
          tr: move.tr || '',
          fen: move.fen
        };
        newMoves[newMoves.length - 1] = lastMove;
        return newMoves;
      });
    }
  };

  // Function to send move to server
  const sendMove = (moveData) => {
    if (!stompClient || !isConnected) {
      alert("Not connected to server!");
      return false;
    }

    if (!isMyTurn) {
      alert("It's not your turn!");
      return false;
    }

    console.log("Sending move to server:", moveData);
    
    // Send move via WebSocket
    stompClient.publish({
      destination: `/app/game/${matchId}/move`,
      body: JSON.stringify({
        ...moveData,
        playerColor: playerColor,
        timestamp: new Date().toISOString(),
        matchId: matchId
      })
    });

    setIsMyTurn(false);
    setGameStatus("Waiting for opponent...");
    return true;
  };

  // Function to handle game actions
  const handleGameAction = (action, data = {}) => {
    if (!stompClient || !isConnected) {
      alert("Not connected to server!");
      return;
    }

    console.log(`Sending ${action} action:`, data);
    
    stompClient.publish({
      destination: `/app/game/${matchId}/${action}`,
      body: JSON.stringify({
        ...data,
        playerColor: playerColor,
        timestamp: new Date().toISOString(),
        matchId: matchId
      })
    });
  };

  return (
    <div className="game-container">
      {/* Game status bar */}
      <div className="game-status-bar">
        <div className="status-info">
          <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          <span className="player-info">Playing as: <strong>{playerColor}</strong></span>
          <span className="turn-info">{gameStatus}</span>
          <span className="turn-indicator">{isMyTurn ? '✓ Your turn' : '⏳ Opponent\'s turn'}</span>
        </div>
        <div className="game-actions">
          <button 
            className="btn-action btn-resign"
            onClick={() => {
              if (window.confirm("Are you sure you want to resign?")) {
                handleGameAction('resign');
              }
            }}
          >
            Resign
          </button>
          <button 
            className="btn-action btn-draw"
            onClick={() => handleGameAction('draw')}
          >
            Offer Draw
          </button>
        </div>
      </div>
      
      <BoardLayout 
        addMove={addMove}
        sendMove={sendMove}
        opponentMove={opponentMove} // Pass opponent's move down
        playerColor={playerColor}
        isMyTurn={isMyTurn}
        matchId={matchId}
        isConnected={isConnected}
        whiteTime={whiteTime}
        blackTime={blackTime}
        player1={initialGameData?.player1}
        player2={initialGameData?.player2}
        gameType={initialGameData?.gameType}
      />
      <GamePlayControlContainer 
        moves={moves}
        matchId={matchId}
        stompClient={stompClient}
        isConnected={isConnected}
        playerColor={playerColor}
        username={username}
      />
    </div>
  );
};

export default GameContainer;