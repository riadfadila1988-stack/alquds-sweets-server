export interface UpdateTaskStatusDto {
  date: string;
  userId: string;
  taskId?: string; // optional: if provided, find by _id
  taskIndex?: number; // optional: if taskId not found, use index
  updates: {
    startTime?: Date | string;
    endTime?: Date | string;
    overrunReason?: string;
  };
}

