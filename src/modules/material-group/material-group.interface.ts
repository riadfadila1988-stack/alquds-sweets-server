// ...existing code...
import { Document } from 'mongoose';

export interface IMaterialGroup extends Document {
  name: string;
  heName?: string;
  // list of material ids belonging to this group
  materials?: string[];
  // timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

