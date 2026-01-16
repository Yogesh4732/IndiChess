import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const NewGame = () => {
  const navigate = useNavigate();

  // Standard matchmaking state (same queue as Home "New Game")
  const [isSearchingStandard, setIsSearchingStandard] = useState(false);
  const [searchTimeStandard, setSearchTimeStandard] = useState(0);
  const searchStandardTimerRef = useRef(null);
  const searchStandardIntervalRef = useRef(null);

  // RAPID matchmaking state
  const [isSearchingRapid, setIsSearchingRapid] = useState(false);
  const [searchTimeRapid, setSearchTimeRapid] = useState(0);
  const searchRapidTimerRef = useRef(null);
  const searchRapidIntervalRef = useRef(null);

  const cancelStandardSearch = async () => {
    if (searchStandardIntervalRef.current) {
      clearInterval(searchStandardIntervalRef.current);
      searchStandardIntervalRef.current = null;
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
    } catch (e) {
      console.error("Error cancelling STANDARD search:", e);
    }

    setIsSearchingStandard(false);
    setSearchTimeStandard(0);
  };

  const cancelRapidSearch = async () => {
    if (searchRapidTimerRef.current) {
      clearTimeout(searchRapidTimerRef.current);
    }
    if (searchRapidIntervalRef.current) {
      clearInterval(searchRapidIntervalRef.current);
    }

    try {
      await fetch("http://localhost:8080/game/cancel-rapid-waiting", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("Error cancelling RAPID search:", e);
    }

    setIsSearchingRapid(false);
    setSearchTimeRapid(0);
  };

  const pollStandardMatch = () => {
    let attempts = 0;
    const maxAttempts = 90; // seconds

    searchStandardIntervalRef.current = setInterval(async () => {
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
            // Match found
            clearInterval(searchStandardIntervalRef.current);
            searchStandardIntervalRef.current = null;
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
    searchRapidIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch("http://localhost:8080/game/check-rapid-match", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Check RAPID match response:", result);

          if (result.matchId && result.matchId > 0) {
            // Match found
            setIsSearchingRapid(false);
            if (searchRapidTimerRef.current) clearTimeout(searchRapidTimerRef.current);
            if (searchRapidIntervalRef.current) clearInterval(searchRapidIntervalRef.current);
            navigate(`/game/${result.matchId}`);
          }
        }
      } catch (error) {
        console.error("Error checking RAPID match:", error);
      }
    }, 3000); // poll every 3 seconds
  };

  const createStandardGame = async () => {
    if (isSearchingStandard) {
      await cancelStandardSearch();
      return;
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
        setIsSearchingStandard(false);
        alert("Failed to create match. Please try again.");
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
        const result = await response.json();
        console.log("Create RAPID game response:", result);

        if (result.matchId === -1) {
          // Player1: waiting for opponent in RAPID queue
          pollRapidMatch();

          // Optional timeout (e.g., 90s)
          searchRapidTimerRef.current = setTimeout(() => {
            if (isSearchingRapid) {
              cancelRapidSearch();
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
        setIsSearchingRapid(false);
        alert("Failed to create RAPID match. Please try again.");
      }
    } catch (error) {
      console.error("Error creating RAPID game:", error);
      setIsSearchingRapid(false);
    }
  };

  useEffect(() => {
    if (!isSearchingRapid) return;

    const interval = setInterval(() => {
      setSearchTimeRapid((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isSearchingRapid]);

  return (
    <div>
      <h2>New Game</h2>
      <button onClick={createStandardGame}>
        {isSearchingStandard
          ? `Cancel (searching ${searchTimeStandard}s...)`
          : "Start New Game"}
      </button>
      <button disabled>Play a Friend</button>
      <button onClick={createRapidGame}>
        {isSearchingRapid
          ? `Cancel Rapid (searching ${searchTimeRapid}s...)`
          : "Custom: Rapid (10 min)"}
      </button>
      <button disabled>Tournaments</button>
    </div>
  );
};

export default NewGame;
