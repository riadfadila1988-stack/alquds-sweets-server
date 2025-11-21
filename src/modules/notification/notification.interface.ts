import { Document } from 'mongoose';

export interface INotification extends Document {
  message: string;
  materialId?: string;
  read: boolean;
  createdAt?: Date;
  // Optional recipient user (ObjectId or populated user)
  recipient?: any;
  // Optional role-based recipient (e.g., 'admin')
  role?: string;
  // Optional arbitrary payload (taskId, etc.)
  data?: any;
}
