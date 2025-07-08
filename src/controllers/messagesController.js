import Message from '../models/Message.js';

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { senderEmail, receiverEmail, content, proposalId } = req.body;
    if (!senderEmail || !receiverEmail || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const message = new Message({ senderEmail, receiverEmail, content, proposalId });
    await message.save();
    res.status(201).json({ success: true, message });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Get conversation between two users (optionally filter by proposalId)
export const getConversation = async (req, res) => {
  try {
    const { user1, user2, proposalId } = req.query;
    if (!user1 || !user2) {
      return res.status(400).json({ error: 'Missing user1 or user2' });
    }
    const filter = {
      $or: [
        { senderEmail: user1, receiverEmail: user2 },
        { senderEmail: user2, receiverEmail: user1 }
      ]
    };
    if (proposalId) filter.proposalId = proposalId;
    const messages = await Message.find(filter).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Get unread messages for a user
export const getUnread = async (req, res) => {
  try {
    const { user } = req.query;
    if (!user) return res.status(400).json({ error: 'Missing user' });
    const messages = await Message.find({ receiverEmail: user, read: false }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unread messages' });
  }
};

// Mark a message as read
export const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findByIdAndUpdate(id, { read: true }, { new: true });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
};

// Get conversations for a user
export const getConversations = async (req, res) => {
  try {
    const { user } = req.query;
    if (!user) return res.status(400).json({ error: 'Missing user' });

    // Get all messages where the user is either sender or receiver
    const messages = await Message.find({
      $or: [
        { senderEmail: user },
        { receiverEmail: user }
      ]
    }).sort({ timestamp: -1 });

    // Get all users to map emails to names
    const { default: User } = await import('../models/User.js');
    const allUsers = await User.find({}).lean();
    const userMap = {};
    allUsers.forEach(u => {
      userMap[u.email] = u;
    });

    // Group messages by conversation partner
    const conversations = {};
    messages.forEach(message => {
      const otherUser = message.senderEmail === user ? message.receiverEmail : message.senderEmail;
      
      if (!conversations[otherUser]) {
        const userInfo = userMap[otherUser] || {};
        conversations[otherUser] = {
          email: otherUser,
          name: userInfo.firstName && userInfo.lastName ? 
            `${userInfo.firstName} ${userInfo.lastName}` : 
            otherUser,
          lastMessage: message.content,
          lastMessageTime: message.timestamp,
          unreadCount: 0
        };
      }

      // Count unread messages from other user
      if (message.receiverEmail === user && !message.read) {
        conversations[otherUser].unreadCount++;
      }
    });

    // Convert to array and sort by last message time
    const conversationsArray = Object.values(conversations).sort((a, b) => 
      new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
    );

    res.json(conversationsArray);
  } catch (err) {
    console.error('Error getting conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
}; 