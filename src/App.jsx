import React, { useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import PinLogin from "./components/PinLogin";
import Dashboard from "./components/Dashboard";
import PlayerSearch from "./components/PlayerSearch";
import ConfirmMatch from "./components/ConfirmMatch";
// import CounterPropose from "./components/CounterPropose"; // for later

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);

  // Called when user logs in
  const handleLoginSuccess = (name) => {
    setUserName(name);
    setIsAuthenticated(true);
  };

  // Called when "Schedule a Match" is clicked
  const handleScheduleMatch = () => {
    setShowPlayerSearch(true);
  };

  // Called when a player is selected from the search
  const handlePlayerSelected = (player) => {
    setShowPlayerSearch(false);
    alert(`You selected: ${player.firstName} ${player.lastName}`);
  };

  // Called when player search is closed/canceled
  const handleClosePlayerSearch = () => {
    setShowPlayerSearch(false);
  };

  // Main app content (login/dashboard/player search)
  function MainApp() {
    return (
      <div>
        {!isAuthenticated ? (
          <PinLogin onSuccess={handleLoginSuccess} />
        ) : (
          <>
            <Dashboard
              playerName={userName}
              onScheduleMatch={handleScheduleMatch}
              onOpenChat={() => alert("Chat coming soon!")}
            />
            {showPlayerSearch && (
              <PlayerSearch
                onSelect={handlePlayerSelected}
                onClose={handleClosePlayerSearch}
                excludeName={userName}
              />
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/confirm-match" element={<ConfirmMatch />} />
        {/* <Route path="/counter-propose" element={<CounterPropose />} /> */}
      </Routes>
    </HashRouter>
  );
}

export default App;
