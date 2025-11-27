import { Schema, model } from 'mongoose';
import { IMaterialGroup } from './material-group.interface';

const MaterialGroupSchema = new Schema<IMaterialGroup>({
  name: { type: String, required: true, unique: true },
  heName: { type: String, required: false },
  materials: [{ type: Schema.Types.ObjectId, ref: 'Material' }],
}, { timestamps: true });

export const MaterialGroup = model<IMaterialGroup>('MaterialGroup', MaterialGroupSchema);
export default MaterialGroup;
