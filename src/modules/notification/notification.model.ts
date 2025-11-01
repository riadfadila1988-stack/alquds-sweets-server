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

const Notification = model<INotification>('Notification', NotificationSchema);
export default Notification;
