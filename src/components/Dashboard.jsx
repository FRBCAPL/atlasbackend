import React, { useState } from "react";
import PlayerSearch from "./PlayerSearch";

export default function Dashboard({ playerName, onOpenChat }) {
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);

  // Called when a player is selected in the PlayerSearch modal
  const handlePlayerSelected = (player) => {
    setShowPlayerSearch(false);
    // You can add scheduling logic here if needed
    console.log("Selected player:", player);
  };

  return (
    <div className="dashboard-card">
      <h1>Welcome{playerName ? `, ${playerName}` : ""}!</h1>
      <section>
        <h2>Upcoming Matches</h2>
        <ul>
          <li>No matches scheduled yet.</li>
        </ul>
      </section>
      <div className="dashboard-actions">
        <button onClick={() => setShowPlayerSearch(true)}>Schedule a Match</button>
        <button onClick={onOpenChat}>Open Chat</button>
      </div>
      <section>
        <h2>League News</h2>
        <ul>
          <li>Stay tuned for updates!</li>
        </ul>
      </section>

      {/* PlayerSearch Modal */}
      {showPlayerSearch && (
        <PlayerSearch
          excludeName={playerName}
          senderName={playerName} // Pass sender's name!
          onSelect={handlePlayerSelected}
          onClose={() => setShowPlayerSearch(false)}
          
        />
      )}
    </div>
  );
}
