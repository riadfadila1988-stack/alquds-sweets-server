import { Schema, model } from 'mongoose';
import { IMaterial } from './material.interface';

const MaterialSchema = new Schema<IMaterial>({
  name: { type: String, required: true, unique: true },
  heName: { type: String, required: true, unique: true },
  quantity: { type: Number, required: true, default: 0 },
  cost: { type: Number, required: true },
  notificationThreshold: { type: Number, required: true },
});

const Material = model<IMaterial>('Material', MaterialSchema);
export default Material;

