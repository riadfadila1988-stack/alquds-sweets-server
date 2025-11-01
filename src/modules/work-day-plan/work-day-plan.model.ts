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
  // Track scheduled and actual times for a task
  startAt: { type: Date },    // when the employee should start the task (scheduled)
  startAtString: { type: String }, // original scheduled time string (e.g., '20:30')
  startTime: { type: Date },  // when the employee actually started
  endTime: { type: Date },    // when the employee actually ended
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
