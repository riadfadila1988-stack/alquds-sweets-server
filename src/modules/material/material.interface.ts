import { Document } from 'mongoose';

export interface IMaterial extends Document {
  name: string;
  heName: string;
  quantity: number;
  cost: number;
  notificationThreshold: number;
  // timestamps
  createdAt?: Date;
  updatedAt?: Date;
}
