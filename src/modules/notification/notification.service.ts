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
}

export default new NotificationService();
