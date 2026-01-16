import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaFire, FaRegHandshake, FaRobot, FaChessPawn, FaTimes } from "react-icons/fa";
import "../component-styles/GameInfo.css";

const GameInfo = ({ streak }) => {
  const navigate = useNavigate();

  // STANDARD matchmaking state
  const [isSearchingStandard, setIsSearchingStandard] = useState(false);
  const [searchTimeStandard, setSearchTimeStandard] = useState(0);
  const pollingStandardRef = useRef(null);
  const searchStandardTimerRef = useRef(null);

  // RAPID (10 min) matchmaking state
  const [isSearchingRapid, setIsSearchingRapid] = useState(false);
  const [searchTimeRapid, setSearchTimeRapid] = useState(0);
  const pollingRapidRef = useRef(null);
  const searchRapidTimerRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pollingStandardRef.current) clearInterval(pollingStandardRef.current);
      if (searchStandardTimerRef.current) clearTimeout(searchStandardTimerRef.current);
      if (pollingRapidRef.current) clearInterval(pollingRapidRef.current);
      if (searchRapidTimerRef.current) clearTimeout(searchRapidTimerRef.current);
    };
  }, []);

  const cancelStandardSearch = async () => {
    if (pollingStandardRef.current) {
      clearInterval(pollingStandardRef.current);
      pollingStandardRef.current = null;
    }
    if (searchStandardTimerRef.current) {
      clearTimeout(searchStandardTimerRef.current);
      searchStandardTimerRef.current = null;
    }

    try {
      await fetch("http://localhost:8080/game/cancel-waiting", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error cancelling STANDARD search:", error);
    }

    setIsSearchingStandard(false);
    setSearchTimeStandard(0);
  };

  const cancelRapidSearch = async () => {
    if (pollingRapidRef.current) {
      clearInterval(pollingRapidRef.current);
      pollingRapidRef.current = null;
    }
    if (searchRapidTimerRef.current) {
      clearTimeout(searchRapidTimerRef.current);
      searchRapidTimerRef.current = null;
    }

    try {
      await fetch("http://localhost:8080/game/cancel-rapid-waiting", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error cancelling RAPID search:", error);
    }

    setIsSearchingRapid(false);
    setSearchTimeRapid(0);
  };

  const pollStandardMatch = () => {
    let attempts = 0;
    const maxAttempts = 90; // 90 seconds

    pollingStandardRef.current = setInterval(async () => {
      attempts++;
      setSearchTimeStandard(attempts);

      if (attempts >= maxAttempts) {
        await cancelStandardSearch();
        alert("Could not find an opponent within 90 seconds. Please try again.");
        return;
      }

      try {
        const response = await fetch("http://localhost:8080/game/check-match", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Check STANDARD match response:", result);

          if (result.matchId && result.matchId > 0) {
            clearInterval(pollingStandardRef.current);
            pollingStandardRef.current = null;
            if (searchStandardTimerRef.current) {
              clearTimeout(searchStandardTimerRef.current);
              searchStandardTimerRef.current = null;
            }

            setIsSearchingStandard(false);
            setSearchTimeStandard(0);
            navigate(`/game/${result.matchId}`);
          } else if (result.matchId === -2) {
            await cancelStandardSearch();
            alert("Error checking for match. Please try again.");
          }
        }
      } catch (error) {
        console.error("Error checking STANDARD match:", error);
      }
    }, 1000);
  };

  const pollRapidMatch = () => {
    pollingRapidRef.current = setInterval(async () => {
      try {
        const response = await fetch("http://localhost:8080/game/check-rapid-match", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Check RAPID match response:", result);

          if (result.matchId && result.matchId > 0) {
            setIsSearchingRapid(false);
            if (searchRapidTimerRef.current) {
              clearTimeout(searchRapidTimerRef.current);
              searchRapidTimerRef.current = null;
            }
            if (pollingRapidRef.current) {
              clearInterval(pollingRapidRef.current);
              pollingRapidRef.current = null;
            }
            navigate(`/game/${result.matchId}`);
          }
        }
      } catch (error) {
        console.error("Error checking RAPID match:", error);
      }
    }, 3000); // poll every 3 seconds
  };

  const createStandardGame = async () => {
    // If already searching, this acts as cancel
    if (isSearchingStandard) {
      await cancelStandardSearch();
      return;
    }

    // Ensure we are not in RAPID queue at the same time
    if (isSearchingRapid) {
      await cancelRapidSearch();
    }

    setIsSearchingStandard(true);
    setSearchTimeStandard(0);

    try {
      const response = await fetch("http://localhost:8080/game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Unexpected response when creating STANDARD game:", text);
          setIsSearchingStandard(false);
          alert("Unexpected server response. Make sure you are logged in, then try again.");
          return;
        }

        const result = await response.json();
        console.log("Create STANDARD game response:", result);

        if (result.matchId === -1) {
          // Player1: waiting for opponent
          pollStandardMatch();

          // 90-second timeout
          searchStandardTimerRef.current = setTimeout(async () => {
            if (isSearchingStandard) {
              await cancelStandardSearch();
              alert("Could not find an opponent within 90 seconds. Please try again.");
            }
          }, 90000);
        } else if (result.matchId > 0) {
          // Player2: immediate match
          setIsSearchingStandard(false);
          navigate(`/game/${result.matchId}`);
        } else {
          setIsSearchingStandard(false);
          alert("Failed to create match. Please try again.");
        }
      } else {
        const text = await response.text().catch(() => "");
        console.error("Failed to create STANDARD match. Status:", response.status, "Body:", text);
        setIsSearchingStandard(false);
        if (response.status === 401) {
          alert("You must be logged in to start a new game.");
        } else {
          alert("Failed to create match. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error creating STANDARD game:", error);
      setIsSearchingStandard(false);
    }
  };

  const createRapidGame = async () => {
    if (isSearchingRapid) {
      await cancelRapidSearch();
      return;
    }

    // Ensure we are not in STANDARD queue at the same time
    if (isSearchingStandard) {
      await cancelStandardSearch();
    }

    setIsSearchingRapid(true);
    setSearchTimeRapid(0);

    try {
      const response = await fetch("http://localhost:8080/game/rapid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Unexpected response when creating RAPID game:", text);
          setIsSearchingRapid(false);
          alert("Unexpected server response. Make sure you are logged in, then try again.");
          return;
        }

        const result = await response.json();
        console.log("Create RAPID game response:", result);

        if (result.matchId === -1) {
          // Player1: waiting for opponent in RAPID queue
          pollRapidMatch();

          // 90-second timeout
          searchRapidTimerRef.current = setTimeout(async () => {
            if (isSearchingRapid) {
              await cancelRapidSearch();
              alert("Could not find a RAPID opponent in time. Please try again.");
            }
          }, 90000);
        } else if (result.matchId > 0) {
          // Player2: immediate RAPID match
          setIsSearchingRapid(false);
          navigate(`/game/${result.matchId}`);
        } else {
          setIsSearchingRapid(false);
          alert("Failed to create RAPID match. Please try again.");
        }
      } else {
        const text = await response.text().catch(() => "");
        console.error("Failed to create RAPID match. Status:", response.status, "Body:", text);
        setIsSearchingRapid(false);
        if (response.status === 401) {
          alert("You must be logged in to start a new game.");
        } else {
          alert("Failed to create RAPID match. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error creating RAPID game:", error);
      setIsSearchingRapid(false);
    }
  };

  return (
    <div className="game-info">
      {/* Streak Section */}
      <div className="streak">
        <FaFire size={30} />
        <div>
          <p>Streak</p>
          <h3>{streak} Days</h3>
        </div>
      </div>

      {/* Buttons Section */}
      <div className="buttons">
        <button 
          className={`button ${isSearchingStandard ? 'searching' : ''}`}
          onClick={createStandardGame}
        >
          {isSearchingStandard ? (
            <>
              <FaTimes size={20} />
              Cancel Standard ({searchTimeStandard}s)
            </>
          ) : (
            <>
              <FaChessPawn size={20} />
              Standard Game
            </>
          )}
        </button>
        <button 
          className={`button ${isSearchingRapid ? 'searching' : ''}`}
          onClick={createRapidGame}
        >
          {isSearchingRapid ? (
            <>
              <FaTimes size={20} />
              Cancel Rapid ({searchTimeRapid}s)
            </>
          ) : (
            <>
              <FaChessPawn size={20} />
              Rapid (10 min)
            </>
          )}
        </button>
        <button className="button">
          <FaRobot size={20} />
          Play Bots
        </button>
        <button className="button">
          <FaRegHandshake size={20} />
          Play a Friend
        </button>
      </div>
      
      {/* Searching indicators */}
      {isSearchingStandard && (
        <div className="searching-indicator">
          <div className="spinner"></div>
          <p>Searching for STANDARD opponent... {searchTimeStandard}s</p>
          <p className="searching-hint">(Wait for another player to click "Standard Game")</p>
        </div>
      )}
      {isSearchingRapid && (
        <div className="searching-indicator">
          <div className="spinner"></div>
          <p>Searching for RAPID (10 min) opponent... {searchTimeRapid}s</p>
          <p className="searching-hint">(Wait for another player to click "Rapid (10 min)")</p>
        </div>
      )}
    </div>
  );
};

export default GameInfo;