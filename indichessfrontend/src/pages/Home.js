import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SideNav from "../components/SideNav";
import Header from "../components/Header";
import GameInfo from "../components/game-page-components/GameInfo";

function HomePage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Use a protected endpoint to verify authentication via JWT cookie
        const response = await fetch("http://localhost:8080/user/username", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          // Not authenticated -> send back to login/landing page
          navigate("/", { replace: true });
          return;
        }

        // Backend currently returns plain text "User"; adapt once it returns real username
        const text = await response.text();
        setUsername(text);
      } catch (error) {
        console.error("Error checking authentication on /home:", error);
        navigate("/", { replace: true });
      }
    };

    checkAuth();
  }, [navigate]);

  return (
    <div className="app-container">
      <SideNav /> {/* Render the SideNav */}
      <div className="main-container">
        <Header username={username} />
        <div className="game-info-container">
          <GameInfo />
        </div>
      </div>
    </div>
  );
}

export default HomePage;
