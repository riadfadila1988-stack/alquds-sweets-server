import { Document } from 'mongoose';
import { IMaterial } from '../material/material.interface';

export interface IUsedMaterial {
  material: IMaterial['_id'];
  quantity: number;
}

export interface ITask {
  name: string;
  duration: number; // in minutes
  description: string;
  startAt?: Date | string; // optional start date/time for the task (Date object or ISO string)
  usedMaterials: IUsedMaterial[];
  producedMaterials?: IUsedMaterial[]; // newly added: materials created/produced by task
}

export interface ITaskGroup extends Document {
  name: string;
  tasks: ITask[];
}
