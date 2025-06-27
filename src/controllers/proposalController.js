const { pool } = require('../../database');

exports.getByReceiver = async (req, res) => {
  try {
    const { receiverName, division } = req.query;
    let query = 'SELECT * FROM proposals WHERE receiverName = ?';
    let params = [receiverName];
    
    if (division) {
      query += ' AND JSON_CONTAINS(divisions, ?)';
      params.push(JSON.stringify(division));
    }
    
    const [proposals] = await pool.execute(query, params);
    res.json(proposals);
  } catch (err) {
    console.error('Error fetching proposals by receiver:', err);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
};

exports.getBySender = async (req, res) => {
  try {
    const { senderName, division } = req.query;
    let query = 'SELECT * FROM proposals WHERE senderName = ?';
    let params = [senderName];
    
    if (division) {
      query += ' AND JSON_CONTAINS(divisions, ?)';
      params.push(JSON.stringify(division));
    }
    
    const [proposals] = await pool.execute(query, params);
    res.json(proposals);
  } catch (err) {
    console.error('Error fetching proposals by sender:', err);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
};

exports.create = async (req, res) => {
  try {
    const data = { ...req.body };
    const counterProposal = data.counterProposal || {};
    counterProposal.completed = false;
    
    const query = `
      INSERT INTO proposals (
        sender, receiver, senderName, receiverName, date, time, location, 
        message, gameType, raceLength, phase, divisions, counterProposal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.sender,
      data.receiver,
      data.senderName,
      data.receiverName,
      data.date,
      data.time,
      data.location,
      data.message,
      data.gameType,
      data.raceLength,
      data.phase || 'scheduled',
      JSON.stringify(data.divisions || []),
      JSON.stringify(counterProposal)
    ];
    
    const [result] = await pool.execute(query, params);
    res.status(201).json({ success: true, proposalId: result.insertId });
  } catch (err) {
    console.error('Error creating proposal:', err);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    
    const query = 'UPDATE proposals SET status = ?, note = ? WHERE id = ?';
    await pool.execute(query, [status, note, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating proposal status:', err);
    res.status(500).json({ error: 'Failed to update proposal' });
  }
};

exports.counter = async (req, res) => {
  try {
    const { id } = req.params;
    const counterData = req.body;
    
    const query = 'UPDATE proposals SET counterProposal = ?, status = ? WHERE id = ?';
    await pool.execute(query, [JSON.stringify(counterData), 'countered', id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error countering proposal:', err);
    res.status(500).json({ error: 'Failed to counter proposal' });
  }
};

exports.debugList = async (req, res) => {
  try {
    const [proposals] = await pool.execute('SELECT id, senderName, receiverName FROM proposals');
    res.json(proposals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
}; 