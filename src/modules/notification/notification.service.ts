import Notification from './notification.model';

// Default projection to avoid loading large fields into memory by default.
const DEFAULT_PROJECTION = {
  message: 1,
  createdAt: 1,
  read: 1,
  recipient: 1,
  role: 1,
  materialId: 1,
};

class NotificationService {
  async createNotification(message: string, materialId?: string) {
    const n = new Notification({ message, materialId });
    return n.save();
  }

  async findUnreadForMaterial(materialId: string, includeData = false) {
    // use lean() to return plain objects (much lighter than full mongoose documents)
    const q = Notification.findOne({ materialId, read: false }).lean();
    if (includeData) return q.select('+data');
    return q.select(DEFAULT_PROJECTION);
  }

  async markAllReadForMaterial(materialId: string) {
    return Notification.updateMany({ materialId }, { read: true });
  }

  // New helpers
  // Paginated find for admin listing to avoid loading the full collection into memory.
  // options: page (1-based), limit, onlyUnread, includeData
  async findPaged(options?: { page?: number; limit?: number; onlyUnread?: boolean; includeData?: boolean; excludeRoles?: string[]; excludeRecipient?: boolean }) {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Math.min(1000, Number(options?.limit) || 50));
    const q: any = {};
    // onlyUnread filter
    if (options?.onlyUnread) q.read = false;

    // Optionally exclude notifications that are targeted to specific roles (e.g. 'employee')
    if (options?.excludeRoles && Array.isArray(options.excludeRoles) && options.excludeRoles.length > 0) {
      // role may be undefined for general admin notifications; $nin allows undefined to pass
      q.role = { $nin: options.excludeRoles };
    }

    // Optionally exclude recipient-targeted notifications (those with a recipient field)
    if (options?.excludeRecipient) {
      q.recipient = { $exists: false };
    }

    const skip = (page - 1) * limit;

    const query = Notification.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    if (options?.includeData) return query.select('+data');
    return query.select(DEFAULT_PROJECTION).then((docs: any) => docs);
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
  // Add a small default limit to avoid loading huge arrays into memory; callers can pass a limit if needed
  async findUnreadForUser(userId: string, limit = 200, includeData = false) {
    const capped = Math.max(1, Math.min(1000, Number(limit)));
    const query = Notification.find({ recipient: userId, read: false }).sort({ createdAt: -1 }).limit(capped).lean();
    if (includeData) return query.select('+data');
    return query.select(DEFAULT_PROJECTION);
  }

  // New: find unread for role
  async findUnreadForRole(role: string, limit = 200, includeData = false) {
    const capped = Math.max(1, Math.min(1000, Number(limit)));
    const query = Notification.find({ role, read: false }).sort({ createdAt: -1 }).limit(capped).lean();
    if (includeData) return query.select('+data');
    return query.select(DEFAULT_PROJECTION);
  }

  // New: find notifications for a user including role-based ones (optionally all or only unread)
  // Added optional pagination/limit to avoid returning huge result sets. Backwards compatible: callers can omit options.
  async findForUser(userId: string, role?: string, onlyUnread = false, options?: { page?: number; limit?: number; includeData?: boolean }) {
    const q: any = { $or: [{ recipient: userId }] };
    if (role) q.$or.push({ role });
    if (onlyUnread) q.read = false;

    // If pagination/limit provided, apply it. Otherwise default to a conservative limit.
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Math.min(1000, Number(options?.limit) || 100));
    const skip = (page - 1) * limit;

    const query = Notification.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    if (options?.includeData) return query.select('+data');
    return query.select(DEFAULT_PROJECTION);
  }

  // New: find a notification by id (direct DB lookup, avoids loading many docs)
  async findById(id: string, includeData = false) {
    const query = Notification.findById(id).lean();
    if (includeData) return query.select('+data');
    return query.select(DEFAULT_PROJECTION);
  }

  // New: mark all unread notifications for a specific user as read (by recipient)
  async markAllReadForUser(userId: string) {
    return Notification.updateMany({ recipient: userId, read: false }, { read: true });
  }

  // New: mark all unread notifications for a specific role as read
  async markAllReadForRole(role: string) {
    return Notification.updateMany({ role, read: false }, { read: true });
  }
}

export default new NotificationService();
