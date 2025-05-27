import React, { useState } from "react";

// Google Sheet details (replace with your actual IDs if needed)
const sheetID = "1tvMgMHsRwQxsR6lMNlSnztmwpK7fhZeNEyqjTqmRFRc";
const pinSheetName = "BCAPL SIGNUP";

// Fetches data from the Google Sheet
async function fetchSheetData(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url);
  const text = await response.text();
  const json = JSON.parse(text.substr(47).slice(0, -2));
  return json.table.rows;
}

export default function PinLogin({ onSuccess }) {
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

const verifyPin = async () => {
  if (!pin) {
    setMessage("Please enter a PIN.");
    return;
  }
  setMessage("");
  setLoading(true);
  try {
    const rows = await fetchSheetData(pinSheetName);
    // Find the row where the PIN matches
    const match = rows.find(row => {
      const pinCol = row.c[11];
      return pinCol?.v?.toString() === pin;
    });
    setLoading(false);
    if (match) {
      // Corrected indices: first name (0), last name (1)
      const firstName = match.c[0]?.v ? match.c[0].v.toString() : "";
      const lastName = match.c[1]?.v ? match.c[1].v.toString() : "";
      const userName = `${firstName} ${lastName}`.trim();
      setMessage("");
      onSuccess(userName); // Pass "First Last" to App.jsx
    } else {
      setMessage("Invalid PIN. Please try again. Your PIN is in your welcome email. Email: frbcapl@gmail.com for PIN reset.");
    }
  } catch (error) {
    setLoading(false);
    setMessage("Error verifying PIN. Please try again later.");
    console.error("PIN verification error:", error);
  }
};


  return (
    <div className="pin-login-card">
      <h2>Welcome to</h2>
      <h1>Front Range Pool League</h1>
      <h3>🔒 Please Enter Your PIN</h3>
      <input
        type="password"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="Enter PIN"
        maxLength={12}
        inputMode="numeric"
        autoFocus
      />
      <br />
      <button onClick={verifyPin} disabled={loading}>
        {loading ? "Verifying..." : "Submit"}
      </button>
      {message && (
        <p style={{ color: "#ff5252", marginTop: "0.5rem", fontWeight: 500 }}>
          {message}
        </p>
      )}
    </div>
  );
}
