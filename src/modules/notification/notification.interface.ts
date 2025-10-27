import { Document } from 'mongoose';

export interface INotification extends Document {
  message: string;
  materialId?: string;
  read: boolean;
  createdAt?: Date;
}

