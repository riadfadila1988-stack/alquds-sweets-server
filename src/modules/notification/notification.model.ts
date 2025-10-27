import { Schema, model } from 'mongoose';
import { INotification } from './notification.interface';

const NotificationSchema = new Schema<INotification>({
  message: { type: String, required: true },
  materialId: { type: Schema.Types.ObjectId, ref: 'Material', required: false },
  read: { type: Boolean, default: false },
}, { timestamps: true });

const Notification = model<INotification>('Notification', NotificationSchema);
export default Notification;

