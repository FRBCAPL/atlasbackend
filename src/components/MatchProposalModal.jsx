import React, { useState, useMemo, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { generateStartTimes, getNextDayOfWeek } from "../utils/timeHelpers";

export default function MatchProposalModal({ player, day, slot, onClose, onSend, senderName }) {
  const [time, setTime] = useState(slot);
  const [startTime, setStartTime] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");

  const locationOptions = player.locations
    ? player.locations.split(/\r?\n/).map(loc => loc.trim()).filter(Boolean)
    : [];

  const nextDate = getNextDayOfWeek(day);
  const [date, setDate] = useState(nextDate);

  const allSlots = player.availability[day] || [];

  const possibleStartTimes = useMemo(() => {
    if (!time || !time.includes("-")) return [];
    const [blockStart, blockEnd] = time.split(" - ").map(s => s.trim());
    if (!blockStart || !blockEnd) return [];
    return generateStartTimes(blockStart, blockEnd, 30);
  }, [time]);

  useEffect(() => {
    setStartTime("");
  }, [time]);

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "#181818",
        color: "#fff",
        borderRadius: "1.2rem",
        boxShadow: "0 0 24px #ff0000, 0 0 32px rgba(0,0,0,0.7)",
        padding: "2rem 2.5rem",
        minWidth: "340px",
        maxWidth: "440px",
        zIndex: 1200,
        textAlign: "center",
        border: "2px solid #ff0000",
      }}
    >
      <button
        onClick={onClose}
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
      <h2 style={{ marginBottom: "1rem" }}>Propose a Match</h2>
      <div style={{ marginBottom: "0.8rem" }}>
        <b>To:</b> {player.firstName} {player.lastName}
      </div>
      <div style={{ marginBottom: "0.8rem" }}>
        <b>Day:</b> {day}
      </div>
      <div style={{ marginBottom: "0.8rem" }}>
        <b>Date:</b>
        <span style={{ marginLeft: 8 }}>
          <DatePicker
            selected={date}
            onChange={setDate}
            minDate={new Date()}
            dateFormat="MMMM d, yyyy"
            popperPlacement="bottom"
            showPopperArrow={false}
            wrapperClassName="custom-datepicker"
          />
        </span>
      </div>
      <div style={{ marginBottom: "0.8rem" }}>
        <b>Time Block:</b>
        <select
          value={time}
          onChange={e => setTime(e.target.value)}
          style={{
            marginLeft: 8,
            padding: "0.2rem 0.5rem",
            borderRadius: 4,
            border: "1px solid #ff0000",
            background: "#222",
            color: "#fff",
            fontSize: "1rem",
          }}
        >
          {allSlots.map((s, i) => (
            <option key={i} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {possibleStartTimes.length > 0 && (
        <div style={{ marginBottom: "0.8rem" }}>
          <b>Start Time:</b>
          <select
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            style={{
              marginLeft: 8,
              padding: "0.2rem 0.5rem",
              borderRadius: 4,
              border: "1px solid #ff0000",
              background: "#222",
              color: "#fff",
              fontSize: "1rem",
            }}
          >
            <option value="">Select...</option>
            {possibleStartTimes.map((t, i) => (
              <option key={i} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}
      <div style={{ marginBottom: "0.8rem" }}>
        <b>Location:</b>
        <select
          value={location}
          onChange={e => setLocation(e.target.value)}
          style={{
            marginLeft: 8,
            padding: "0.2rem 0.5rem",
            borderRadius: 4,
            border: "1px solid #ff0000",
            background: "#222",
            color: "#fff",
            fontSize: "1rem",
            width: "60%",
          }}
        >
          <option value="">Select...</option>
          {locationOptions.map((loc, idx) => (
            <option key={idx} value={loc}>{loc}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <b>Message:</b>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Optional message"
          rows={3}
          style={{
            display: "block",
            width: "100%",
            marginTop: 8,
            borderRadius: 4,
            border: "1px solid #ff0000",
            background: "#222",
            color: "#fff",
            fontSize: "1rem",
            resize: "vertical",
          }}
        />
      </div>
      <button
        disabled={!startTime || !location}
        onClick={() =>
          onSend({
            time: startTime,
            timeBlock: time,
            location,
            message,
            date: date.toISOString().slice(0, 10),
            senderName, // <-- Include sender name!
          })
        }
        style={{
          background: startTime && location ? "#ff0000" : "#888",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "0.7rem 1.5rem",
          cursor: startTime && location ? "pointer" : "not-allowed",
          fontSize: "1.1rem",
          fontWeight: "bold",
        }}
      >
        Send Proposal
      </button>
    </div>
  );
}
