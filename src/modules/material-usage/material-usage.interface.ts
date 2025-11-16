import { Document } from 'mongoose';

export interface IMaterialUsage extends Document {
  materialId: string;
  materialName: string;
  previousQuantity: number;
  newQuantity: number;
  quantityChange: number; // negative for usage, positive for addition
  userId?: string;
  userName?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

