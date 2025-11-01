import Notification from './notification.model';

class NotificationService {
  async createNotification(message: string, materialId?: string) {
    const n = new Notification({ message, materialId });
    return n.save();
  }

  async findUnreadForMaterial(materialId: string) {
    return Notification.findOne({ materialId, read: false });
  }

  async markAllReadForMaterial(materialId: string) {
    return Notification.updateMany({ materialId }, { read: true });
  }

  // New helpers
  async findAll() {
    return Notification.find().sort({ createdAt: -1 });
  }

  async markRead(id: string) {
    return Notification.findByIdAndUpdate(id, { read: true }, { new: true });
  }

  async markAllRead() {
    return Notification.updateMany({}, { read: true });
  }

  // New: create targeted notification
  async createForUser(message: string, recipientId: string, data?: any) {
    const n = new Notification({ message, recipient: recipientId, data });
    return n.save();
  }

  async createForRole(message: string, role: string, data?: any) {
    const n = new Notification({ message, role, data });
    return n.save();
  }

  // New: find unread for user
  async findUnreadForUser(userId: string) {
    return Notification.find({ recipient: userId, read: false }).sort({ createdAt: -1 });
  }

  // New: find unread for role
  async findUnreadForRole(role: string) {
    return Notification.find({ role, read: false }).sort({ createdAt: -1 });
  }

  // New: find notifications for a user including role-based ones (optionally all or only unread)
  async findForUser(userId: string, role?: string, onlyUnread = false) {
    const q: any = { $or: [{ recipient: userId }] };
    if (role) q.$or.push({ role });
    if (onlyUnread) q.read = false;
    return Notification.find(q).sort({ createdAt: -1 });
  }
}

export default new NotificationService();
