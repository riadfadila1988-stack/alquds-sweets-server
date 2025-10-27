import { Schema, model } from 'mongoose';
import { IWorkDayPlan } from './work-day-plan.interface';

const UsedMaterialSchema = new Schema({
  material: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
  quantity: { type: Number, required: true },
});

const TaskSimpleSchema = new Schema({
  name: { type: String, required: true },
  duration: { type: Number },
  description: { type: String },
  usedMaterials: [UsedMaterialSchema],
  producedMaterials: [UsedMaterialSchema], // newly added: materials produced by this task
  // Track when a task was started and ended
  startTime: { type: Date },
  endTime: { type: Date },
});

const AssignmentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tasks: [TaskSimpleSchema],
});

const WorkDayPlanSchema = new Schema({
  date: { type: Date, required: true, unique: true },
  assignments: [AssignmentSchema],
}, { timestamps: true });

export const WorkDayPlan = model<IWorkDayPlan>('WorkDayPlan', WorkDayPlanSchema);
