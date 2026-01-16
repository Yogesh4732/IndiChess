import Header from "../components/Header";
import SideNav from "../components/SideNav";
import GameContainer from "../components/game-page-components/GameContainer";
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const Game = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const [stompClient, setStompClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [playerColor, setPlayerColor] = useState('white');
  const [username, setUsername] = useState('');

  // Auth guard: ensure user is logged in before trying to load game
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        const authResponse = await fetch("http://localhost:8080/user/username", {
          method: "GET",
          credentials: "include",
        });

        if (!authResponse.ok) {
          // Not logged in; send back to landing/login
          navigate("/", { replace: true });
          return;
        }

        // Backend currently returns plain text "User"; adapt once it returns real username
        const usernameText = await authResponse.text();
        setUsername(usernameText);

        // Now load game details
        const response = await fetch(`http://localhost:8080/game/${matchId}`, {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch game data');
        }

        const data = await response.json();
        console.log("Game details response:", data);
        setPlayerColor(data.playerColor);
        setGameData(data);
      } catch (err) {
        console.error('Error fetching game details:', err);
        setError("Failed to load game details");
      }
    };

    if (matchId) {
      checkAuthAndLoad();
    }
  }, [matchId, navigate]);

  useEffect(() => {
    if (!matchId) {
      setError("No match ID provided");
      return;
    }

    // To this:
  fetch(`http://localhost:8080/game/${matchId}`, {
      method: 'GET',
      credentials: 'include'  // Important for cookies
  })
    .then(response => {
      if (!response.ok) throw new Error('Failed to fetch game data');
      return response.json();
    })
    .then(data => {
      setPlayerColor(data.playerColor); // 'white' or 'black'
      setGameData(data);
      console.log("Game data loaded:", data);
    })
    .catch(error => {
      console.error('Error fetching game details:', error);
      setError("Failed to load game details");
    });

    // WebSocket connection
    const socket = new SockJS('http://localhost:8080/ws');
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => console.log('STOMP: ' + str),
      
      onConnect: (frame) => {
        console.log("Connected to WebSocket:", frame);
        setIsConnected(true);
        setError(null);
        
        // Subscribe to game updates
        client.subscribe(`/topic/game/${matchId}`, (message) => {
          console.log("Game update received:", message.body);
          const update = JSON.parse(message.body);
          setGameData(prev => ({ ...prev, ...update }));
        });
        
        // Subscribe to move updates
        client.subscribe(`/topic/moves/${matchId}`, (message) => {
          console.log("Move received:", message.body);
          const moveData = JSON.parse(message.body);
          // This will be handled in GameContainer
        });
        
        // Subscribe to chat messages
        client.subscribe(`/topic/chat/${matchId}`, (message) => {
          console.log("Chat message:", message.body);
        });

        // Notify server that player has joined
        client.publish({
          destination: `/app/game/${matchId}/join`,
          body: JSON.stringify({ 
            type: 'PLAYER_JOINED',
            playerColor: playerColor,
            timestamp: new Date().toISOString()
          })
        });
      },
      
      onStompError: (frame) => {
        console.error("STOMP error:", frame);
        setError(`Connection error: ${frame.headers?.message || 'Unknown error'}`);
        setIsConnected(false);
      },
      
      onWebSocketError: (error) => {
        console.error("WebSocket error:", error);
        setError("Failed to connect to game server");
        setIsConnected(false);
      },
      
      onDisconnect: () => {
        console.log("Disconnected from WebSocket");
        setIsConnected(false);
      }
    });
    
    client.activate();
    setStompClient(client);

    return () => {
      if (client) {
        client.deactivate();
      }
    };
  }, [matchId]);

  if (error) {
    return (
      <div className="app-container">
        <SideNav />
        <div className="main-container">
          <Header username={username} />
          <div className="error-container">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => window.location.href = '/'}>Return to Home</button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameData || !isConnected) {
    return (
      <div className="app-container">
        <SideNav />
        <div className="main-container">
          <Header username={username} />
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading game...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <SideNav />
      <div className="main-container">
        <Header username={username} />
        <GameContainer 
          matchId={matchId}
          stompClient={stompClient}
          isConnected={isConnected}
          playerColor={playerColor}
          initialGameData={gameData}
        />
      </div>
    </div>
  );
};

export default Game;