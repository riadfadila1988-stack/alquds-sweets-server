import { Document } from 'mongoose';

export interface IUsedMaterial {
  material: any; // ObjectId or populated material
  quantity: number;
}

export interface ITaskSimple {
  _id?: any;
  name: string;
  duration?: number;
  description?: string;
  usedMaterials?: IUsedMaterial[];
  producedMaterials?: IUsedMaterial[]; // newly added: materials produced by this task
  startAt?: Date; // scheduled time when the employee should start the task
  startAtString?: string; // original scheduled time string (e.g., '20:30')
  startTime?: Date; // actual start time when employee started
  endTime?: Date;   // actual end time when employee finished
  overrunReason?: string; // reason provided when task takes longer than planned duration
  // server helper flag to avoid duplicate late notifications
  lateNotified?: boolean;
}

export interface IAssignment {
  user: any; // ObjectId ref to User
  tasks: ITaskSimple[];
}

export interface IWorkDayPlan extends Document {
  date: Date;
  assignments: IAssignment[];
}
