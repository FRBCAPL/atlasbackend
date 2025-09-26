import Notification from '../models/Notification.js';

// Create a new notification
export const createNotification = async (notificationData) => {
  try {
    const notification = new Notification(notificationData);
    await notification.save();
    
    console.log(`📱 Notification created: ${notification.type} for ${notification.userEmail}`);
    return { success: true, notification };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }
};

// Get notifications for a user
export const getUserNotifications = async (userEmail, limit = 50) => {
  try {
    const notifications = await Notification.find({ userEmail })
      .sort({ createdAt: -1 })
      .limit(limit);
    
    return { success: true, notifications };
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return { success: false, error: error.message };
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId, userEmail) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userEmail },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return { success: false, error: 'Notification not found' };
    }
    
    return { success: true, notification };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userEmail) => {
  try {
    const result = await Notification.updateMany(
      { userEmail, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    return { success: true, updatedCount: result.modifiedCount };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }
};

// Get unread notification count for a user
export const getUnreadNotificationCount = async (userEmail) => {
  try {
    const count = await Notification.countDocuments({ userEmail, isRead: false });
    return { success: true, count };
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return { success: false, error: error.message };
  }
};

// Create match scheduling approval notification
export const createMatchSchedulingApprovalNotification = async (request) => {
  const notificationData = {
    userId: request.challengerEmail, // Using email as userId for now
    userEmail: request.challengerEmail,
    type: 'match_scheduling_approved',
    title: '🎉 Match Request Approved!',
    message: `Your match scheduling request against ${request.defenderName} has been approved. Match scheduled for ${request.preferredDate.toLocaleDateString()} at ${request.preferredTime}.`,
    data: {
      requestId: request._id,
      challengerName: request.challengerName,
      defenderName: request.defenderName,
      matchType: request.matchType,
      preferredDate: request.preferredDate,
      preferredTime: request.preferredTime,
      location: request.location,
      notes: request.notes
    }
  };
  
  return await createNotification(notificationData);
};

// Create match scheduling rejection notification
export const createMatchSchedulingRejectionNotification = async (request) => {
  const notificationData = {
    userId: request.challengerEmail, // Using email as userId for now
    userEmail: request.challengerEmail,
    type: 'match_scheduling_rejected',
    title: '📋 Match Request Update',
    message: `Your match scheduling request against ${request.defenderName} has been reviewed. ${request.adminNotes ? 'Admin notes: ' + request.adminNotes : 'You can submit a new request with different details.'}`,
    data: {
      requestId: request._id,
      challengerName: request.challengerName,
      defenderName: request.defenderName,
      matchType: request.matchType,
      preferredDate: request.preferredDate,
      preferredTime: request.preferredTime,
      location: request.location,
      adminNotes: request.adminNotes
    }
  };
  
  return await createNotification(notificationData);
};

// Create match scheduling defender notification
export const createMatchSchedulingDefenderNotification = async (request) => {
  const notificationData = {
    userId: request.defenderEmail, // Using email as userId for now
    userEmail: request.defenderEmail,
    type: 'match_scheduled',
    title: '🎱 Match Scheduled - You\'re Playing!',
    message: `${request.challengerName} has scheduled a match against you on ${request.preferredDate.toLocaleDateString()} at ${request.preferredTime}.`,
    data: {
      requestId: request._id,
      challengerName: request.challengerName,
      challengerEmail: request.challengerEmail,
      defenderName: request.defenderName,
      defenderEmail: request.defenderEmail,
      matchType: request.matchType,
      preferredDate: request.preferredDate,
      preferredTime: request.preferredTime,
      location: request.location,
      notes: request.notes
    }
  };
  
  return await createNotification(notificationData);
};
