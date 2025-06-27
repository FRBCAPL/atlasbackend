const { pool } = require('../../database');

exports.getAll = async (req, res) => {
  try {
    const [notes] = await pool.execute('SELECT * FROM notes ORDER BY createdAt DESC');
    res.json(notes);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

exports.create = async (req, res) => {
  try {
    if (!req.body.text || !req.body.text.trim()) {
      return res.status(400).json({ error: 'Note text required' });
    }
    
    const query = 'INSERT INTO notes (content) VALUES (?)';
    const [result] = await pool.execute(query, [req.body.text.trim()]);
    
    // Get the created note
    const [notes] = await pool.execute('SELECT * FROM notes WHERE id = ?', [result.insertId]);
    res.status(201).json(notes[0]);
  } catch (err) {
    console.error('Error saving note:', err);
    res.status(500).json({ error: 'Failed to save note' });
  }
};

exports.delete = async (req, res) => {
  try {
    await pool.execute('DELETE FROM notes WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
}; 