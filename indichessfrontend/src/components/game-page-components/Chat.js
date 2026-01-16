import React, { useEffect, useRef, useState } from "react";
import "../component-styles/Chat.css";

const Chat = ({ matchId, stompClient, isConnected, username, playerColor }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const subscriptionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Load existing chat history when component mounts or match changes
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/games/${matchId}/chat`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          console.error("Failed to load chat history", response.status);
          return;
        }

        const history = await response.json();
        // Expecting an array of ChatMessageDTO: { id, matchId, from, message, timestamp, type }
        setMessages(history || []);
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    };

    if (matchId) {
      loadHistory();
    }
  }, [matchId]);

  // Subscribe to chat topic for this match
  useEffect(() => {
    if (!stompClient || !isConnected || !stompClient.connected) return;

    try {
      subscriptionRef.current = stompClient.subscribe(`/topic/chat/${matchId}`, (message) => {
        try {
          const payload = JSON.parse(message.body);
          setMessages((prev) => [...prev, payload]);
        } catch (e) {
          console.error("Error parsing chat message:", e);
        }
      });
    } catch (e) {
      console.error("Failed to subscribe to chat topic:", e);
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [stompClient, isConnected, matchId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;

    if (!stompClient || !isConnected || !stompClient.connected) {
      alert("Not connected to chat server.");
      return;
    }

    try {
      stompClient.publish({
        destination: `/app/game/${matchId}/chat`,
        body: JSON.stringify({ message: text }),
      });
      setInputValue("");
    } catch (error) {
      console.error("Error sending chat message:", error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <span>Game Chat</span>
        <span className="chat-status">
          {isConnected ? "Connected" : "Disconnected"} | You: {username || "Unknown"} ({playerColor})
        </span>
      </div>
      <div className="chat-messages">
        {messages.map((msg, index) => {
          const isSelf = username && msg.from === username;
          return (
            <div
              key={index}
              className={`chat-message ${isSelf ? "self" : "opponent"}`}
            >
              <div className="chat-message-meta">
                <span className="chat-author">{isSelf ? "You" : msg.from}</span>
                <span className="chat-time">{formatTime(msg.timestamp)}</span>
              </div>
              <div className="chat-text">{msg.message}</div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isConnected ? "Type a message..." : "Chat unavailable (disconnected)"}
          disabled={!isConnected}
        />
        <button type="submit" disabled={!isConnected || !inputValue.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
