import { Schema, model } from 'mongoose';
import { ITaskGroup } from './task-group.interface';

const UsedMaterialSchema = new Schema({
  material: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
  quantity: { type: Number, required: true },
});

const TaskSchema = new Schema({
  name: { type: String, required: true },
  duration: { type: Number, required: true },
  startAt: { type: String, required: false }, // optional: store startAt as string (accepts 'HH:mm' or ISO strings); interface allows Date|string
  description: { type: String, required: true },
  usedMaterials: [UsedMaterialSchema],
  producedMaterials: [UsedMaterialSchema], // newly added: materials produced by this task
});

const TaskGroupSchema = new Schema({
  name: { type: String, required: true },
  tasks: [TaskSchema],
}, { timestamps: true });

export const TaskGroup = model<ITaskGroup>('TaskGroup', TaskGroupSchema);
