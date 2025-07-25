import User from '../models/User.js';
import syncSheetUsersToMongo from '../utils/syncUsersFromSheet.js';

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).lean();
    res.json(users);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUser = async (req, res) => {
  try {
    const idOrEmail = decodeURIComponent(req.params.idOrEmail);
    // Try to find by id or email
    const user = await User.findOne({ $or: [ { id: idOrEmail }, { email: idOrEmail } ] });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const syncUsers = async (req, res) => {
  try {
    await syncSheetUsersToMongo();
    res.json({ success: true, message: 'Users synced successfully' });
  } catch (err) {
    console.error('Error syncing users:', err);
    res.status(500).json({ error: 'Failed to sync users' });
  }
}; 