import { Schema, model } from 'mongoose';
import { IMaterialUsage } from './material-usage.interface';

const MaterialUsageSchema = new Schema<IMaterialUsage>({
  materialId: { type: String, required: true, index: true },
  materialName: { type: String, required: true },
  previousQuantity: { type: Number, required: true },
  newQuantity: { type: Number, required: true },
  quantityChange: { type: Number, required: true },
  userId: { type: String },
  userName: { type: String },
  timestamp: { type: Date, required: true, default: Date.now, index: true },
}, { timestamps: true });

// Compound index for efficient querying by material and time range
MaterialUsageSchema.index({ materialId: 1, timestamp: -1 });
MaterialUsageSchema.index({ timestamp: -1 });

const MaterialUsage = model<IMaterialUsage>('MaterialUsage', MaterialUsageSchema);
export default MaterialUsage;

