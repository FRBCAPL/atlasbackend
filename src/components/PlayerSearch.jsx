import React, { useState, useEffect } from "react";
import MatchProposalModal from "./MatchProposalModal";
import Highlight from "./Highlight";
import { sendProposalEmail } from "../utils/emailHelpers";

// --- Google Sheet details ---
const sheetID = "1tvMgMHsRwQxsR6lMNlSnztmwpK7fhZeNEyqjTqmRFRc";
const pinSheetName = "BCAPL SIGNUP";

// --- Parse the availability string into a grid-friendly object ---
function normalizeTime(str) {
  // Handles "7pm", "730pm", "7:30pm", "7:30 pm", "07:30pm", "10am", "10:00am", etc.
  if (!str) return "";
  str = str.trim().toLowerCase().replace(/\s+/g, "");
  let match = str.match(/^(\d{1,2})(:?(\d{2}))?(am|pm)$/);
  if (!match) return str.toUpperCase(); // fallback: just uppercase AM/PM if present
  let [, h, , m, ap] = match;
  if (!m) m = "00";
  return `${parseInt(h, 10)}:${m} ${ap.toUpperCase()}`;
}



function parseAvailability(str) {
  const dayMap = {
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
  };
  const result = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [] };
  if (!str) return result;
  str.split(/\r?\n/).forEach(line => {
    const match = line.match(/Day:\s*(\w+),\s*Available From:\s*([\w:]+),\s*Available Until:\s*([\w: ]+)/i);
    if (match) {
      const [_, dayFull, from, until] = match;
      const dayShort = dayMap[dayFull];
      if (dayShort) {
        const fromNorm = normalizeTime(from);
        const untilNorm = normalizeTime(until);
        result[dayShort].push(`${fromNorm} - ${untilNorm}`);
      }
    }
  });
  return result;
}




// --- Main component ---
export default function PlayerSearch({ onSelect, onClose, excludeName, senderName }) {

  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showContact, setShowContact] = useState(false);
  const [timer, setTimer] = useState(10);
  const [proposalData, setProposalData] = useState(null);

  useEffect(() => {
    async function fetchSheetData(sheetName) {
      const url = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
      const response = await fetch(url);
      const text = await response.text();
      const json = JSON.parse(text.substr(47).slice(0, -2));
      return json.table.rows;
    }

    fetchSheetData(pinSheetName).then(rows => {
      const headerCells = rows[0].c;
      const headerMap = {};
      headerCells.forEach((cell, idx) => {
        if (cell && cell.v !== undefined && cell.v !== null) {
          headerMap[String(cell.v).trim().toLowerCase()] = idx;
        }
      });
      const playerList = rows.map(row => {
        const c = row.c;
        return {
          firstName: c[0]?.v || "",
          lastName: c[1]?.v || "",
          email: c[2]?.v || "",
          phone: c[3]?.v || "",
          locations: c[8]?.v || "",
          availability: parseAvailability(c[7]?.v || ""),
          pin: c[11]?.v || "",
        };
      });
      setPlayers(playerList);
      setLoading(false);
    });
  }, []);

  const filteredPlayers =
    search.length >= 3
      ? players.filter(
          p =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) &&
            `${p.firstName} ${p.lastName}`.toLowerCase() !== excludeName?.toLowerCase()
        )
      : [];

  useEffect(() => {
    let interval;
    if (showContact) {
      setTimer(10);
      interval = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            clearInterval(interval);
            setShowContact(false);
            return 10;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showContact]);

  return (
    <div className="modal">
      <div className="modal-content" style={{ position: "relative" }}>
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "none",
            border: "none",
            color: "#ff0000",
            fontSize: "1.8rem",
            fontWeight: "bold",
            cursor: "pointer",
            lineHeight: 1,
            zIndex: 2,
            transition: "color 0.2s",
          }}
          onMouseOver={e => (e.currentTarget.style.color = "#fff")}
          onMouseOut={e => (e.currentTarget.style.color = "#ff0000")}
        >
          &times;
        </button>

        <h2>Player Search</h2>
        <input
          type="text"
          placeholder="Type at least 3 letters to search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "0.85rem 1.1rem",
            margin: "1.2rem 0",
            borderRadius: "12px",
            border: "2px solid #ff0000",
            background: "#000",
            color: "#fff",
            fontSize: "1.15rem",
            fontWeight: 500,
            outline: "none",
            textAlign: "center",
            letterSpacing: "0.03em",
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            transition: "border 0.2s, box-shadow 0.2s",
          }}
          autoFocus
        />

        {loading ? (
          <p>Loading players...</p>
        ) : (
          <>
            {search.length < 3 ? (
              <p style={{ color: "#aaa", fontStyle: "italic" }}>
                Please enter at least 3 letters to search for a player.
              </p>
            ) : (
              <ul
                className="player-search-list"
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  background: "#232323",
                  borderRadius: "6px",
                  boxShadow: filteredPlayers.length ? "0 2px 12px rgba(0,0,0,0.25)" : "none",
                  maxHeight: 250,
                  overflowY: "auto",
                  border: filteredPlayers.length ? "1px solid #333" : "none",
                  width: "100%",
                }}
              >
                {filteredPlayers.length === 0 && (
                  <li style={{ padding: "0.8rem", color: "#aaa", textAlign: "center" }}>
                    No players found.
                  </li>
                )}
                {filteredPlayers.map((p, i) => (
                  <li key={i}>
                    <button
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        color: "#fff",
                        padding: "0.7rem 1rem",
                        borderBottom: i !== filteredPlayers.length - 1 ? "1px solid #333" : "none",
                        cursor: "pointer",
                        fontSize: "1rem",
                        transition: "background 0.15s",
                      }}
                      onClick={() => {
                        setSelectedPlayer(p);
                        setShowContact(false);
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = "#2a2a2a")}
                      onMouseOut={e => (e.currentTarget.style.background = "none")}
                    >
                      <Highlight text={`${p.firstName} ${p.lastName}`} query={search} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {selectedPlayer && (
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#181818",
              color: "#fff",
              borderRadius: "1.2rem",
              boxShadow: "0 0 24px #000, 0 0 32px rgba(0,0,0,0.7)",
              padding: "2rem 2.5rem",
              minWidth: "340px",
              maxWidth: "440px",
              zIndex: 1100,
              textAlign: "center",
              border: "2px solid #ff0000",
            }}
          >
            <button
              onClick={() => setSelectedPlayer(null)}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                background: "none",
                border: "none",
                color: "#ff0000",
                fontSize: "1.6rem",
                fontWeight: "bold",
                cursor: "pointer",
                lineHeight: 1,
                zIndex: 2,
              }}
              aria-label="Close"
            >
              &times;
            </button>

            <h2 style={{ marginBottom: "1rem" }}>
              {selectedPlayer.firstName} {selectedPlayer.lastName}
            </h2>

            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Preferred Locations</h3>
              <div style={{ color: "#ddd", fontStyle: "italic" }}>
                {selectedPlayer.locations || "No locations specified"}
              </div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Availability</h3>
              <div
                className="player-modal-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "0.8rem",
                  textAlign: "left",
                }}
              >
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div
                    className="player-modal-day"
                    key={day}
                    style={{
                      background: "#222",
                      padding: "0.5rem 0.8rem",
                      borderRadius: "0.5rem",
                    }}
                  >
                    <div
                      className="player-modal-day-label"
                      style={{
                        fontWeight: "bold",
                        marginBottom: "0.3rem",
                        borderBottom: "1px solid #444",
                        paddingBottom: "0.2rem",
                      }}
                    >
                      {day}
                    </div>
                    {(selectedPlayer.availability[day] || []).length === 0 && (
                      <div style={{ color: "#888" }}>—</div>
                    )}
                    {(selectedPlayer.availability[day] || []).map((slot, i) => (
                      <div
                        className="player-modal-slot"
                        key={i}
                        onClick={() => setProposalData({ player: selectedPlayer, day, slot })}
                        style={{
                          background: "#a30000",
                          color: "#fff",
                          borderRadius: "0.3rem",
                          margin: "0.18rem 0",
                          padding: "0.18rem 0.5rem",
                          fontSize: "0.98rem",
                          fontWeight: 500,
                          display: "inline-block",
                          cursor: "pointer",
                          border: "2px solid #ff5252",
                          boxShadow: "0 1px 4px #000a",
                          transition: "background 0.15s",
                        }}
                        title="Propose a match"
                      >
                        {slot}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Contact Info</h3>
              {showContact ? (
                <div>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <b>Email:</b> {selectedPlayer.email}
                  </div>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <b>Phone:</b> {selectedPlayer.phone}
                  </div>
                  <div style={{ color: "#aaa", fontSize: "0.9rem", marginTop: "0.8rem" }}>
                    Contact info will hide in {timer} seconds
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowContact(true)}
                  style={{
                    background: "#444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.5rem 1rem",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                  }}
                >
                  Show Contact Info
                </button>
              )}
            </div>
          </div>
        )}

        {proposalData && (
          <MatchProposalModal
            player={proposalData.player}
            day={proposalData.day}
            slot={proposalData.slot}
            onClose={() => setProposalData(null)}
            onSend={details => {
              sendProposalEmail({
                to_email: proposalData.player.email,
                to_name: `${proposalData.player.firstName} ${proposalData.player.lastName}`,
                from_name: senderName, // Or your logged-in user
                day: proposalData.day,
                date: details.date,
                time: details.time,
                location: details.location,
                message: details.message
              });
              setProposalData(null);
              setSelectedPlayer(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
