const { pool } = require('../../database');
const fs = require('fs');
const path = require('path');

exports.getAllMatches = async (req, res) => {
  const { player, division } = req.query;
  console.log('getAllMatches called with:', { player, division }); // Debug log
  if (!player) return res.status(400).json({ error: 'Missing player' });

  try {
    let query = `
      SELECT * FROM proposals 
      WHERE status = 'confirmed' 
      AND (JSON_EXTRACT(counterProposal, '$.completed') != true OR counterProposal IS NULL)
      AND (senderName = ? OR receiverName = ?)
    `;
    let params = [player.trim(), player.trim()];
    
    if (division) {
      query += ' AND JSON_CONTAINS(divisions, ?)';
      params.push(JSON.stringify(division));
    }
    
    const [proposals] = await pool.execute(query, params);
    console.log('Proposals found:', proposals); // Log the proposals found
    const merged = proposals.map(p => ({ ...p, type: 'proposal' }));
    res.json(merged);
  } catch (err) {
    console.error('Error fetching all matches:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
};

exports.getCompletedMatches = async (req, res) => {
  const { player, division } = req.query;
  console.log('getCompletedMatches called with:', { player, division }); // Debug log
  if (!player) return res.status(400).json({ error: 'Missing player' });

  try {
    let query = `
      SELECT * FROM proposals 
      WHERE status = 'confirmed' 
      AND JSON_EXTRACT(counterProposal, '$.completed') = true
      AND (senderName = ? OR receiverName = ?)
    `;
    let params = [player.trim(), player.trim()];
    
    if (division) {
      query += ' AND JSON_CONTAINS(divisions, ?)';
      params.push(JSON.stringify(division));
    }
    
    const [proposals] = await pool.execute(query, params);
    res.json(proposals);
  } catch (err) {
    console.error('Error fetching completed matches:', err);
    res.status(500).json({ error: 'Failed to fetch completed matches' });
  }
};

exports.create = async (req, res) => {
  try {
    const data = req.body;
    const query = `
      INSERT INTO matches (
        player1, player2, player1Name, player2Name, date, time, location,
        gameType, raceLength, phase, division, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.player1,
      data.player2,
      data.player1Name,
      data.player2Name,
      data.date,
      data.time,
      data.location,
      data.gameType,
      data.raceLength,
      data.phase || 'scheduled',
      data.division,
      data.status || 'scheduled'
    ];
    
    const [result] = await pool.execute(query, params);
    res.json({ success: true, matchId: result.insertId });
  } catch (err) {
    console.error('Error saving match:', err);
    res.status(500).json({ error: 'Failed to save match' });
  }
};

exports.markMatchCompleted = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Missing proposal ID' });
  
  try {
    console.log('Marking proposal as completed, id:', id);
    
    // Update the counterProposal to mark as completed
    const counterProposal = JSON.stringify({ completed: true });
    const query = 'UPDATE proposals SET counterProposal = ? WHERE id = ?';
    await pool.execute(query, [counterProposal, id]);
    
    console.log('Update completed for proposal id:', id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking match as completed:', err);
    res.status(500).json({ error: 'Failed to mark match as completed' });
  }
}; 