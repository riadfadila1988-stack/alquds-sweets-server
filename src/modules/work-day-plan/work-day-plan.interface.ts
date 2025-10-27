import { Document } from 'mongoose';

export interface IUsedMaterial {
  material: any; // ObjectId or populated material
  quantity: number;
}

export interface ITaskSimple {
  name: string;
  duration?: number;
  description?: string;
  usedMaterials?: IUsedMaterial[];
  producedMaterials?: IUsedMaterial[]; // newly added: materials produced by this task
  startTime?: Date;
  endTime?: Date;
}

export interface IAssignment {
  user: any; // ObjectId ref to User
  tasks: ITaskSimple[];
}

export interface IWorkDayPlan extends Document {
  date: Date;
  assignments: IAssignment[];
}
