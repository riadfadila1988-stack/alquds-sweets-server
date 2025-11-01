import { Schema, model } from 'mongoose';
import { INotification } from './notification.interface';

const NotificationSchema = new Schema<INotification>({
  message: { type: String, required: true },
  materialId: { type: Schema.Types.ObjectId, ref: 'Material', required: false },
  read: { type: Boolean, default: false },
  // Optional targeted recipient user
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  // Optional role-based recipient (string like 'admin' or 'employee')
  role: { type: String, required: false },
  // Optional arbitrary JSON payload
  data: { type: Schema.Types.Mixed, required: false },
}, { timestamps: true });

// Indexes to support common queries and avoid collection scans
NotificationSchema.index({ recipient: 1, read: 1 });
NotificationSchema.index({ role: 1, read: 1 });
NotificationSchema.index({ createdAt: -1 });

const Notification = model<INotification>('Notification', NotificationSchema);
export default Notification;
