const { pool } = require('../../database');
const syncSheetUsersToMySQL = require('../utils/syncUsersFromSheet');

exports.getUser = async (req, res) => {
  try {
    const idOrEmail = decodeURIComponent(req.params.idOrEmail);
    
    // Try to find by id or email
    const query = 'SELECT * FROM users WHERE id = ? OR email = ?';
    const [users] = await pool.execute(query, [idOrEmail, idOrEmail]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(users[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

exports.syncUsers = async (req, res) => {
  try {
    await syncSheetUsersToMySQL();
    res.json({ success: true, message: 'Users synced successfully' });
  } catch (err) {
    console.error('Error syncing users:', err);
    res.status(500).json({ error: 'Failed to sync users' });
  }
}; 