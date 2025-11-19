// filepath: c:\Users\user8\Desktop\alquds\alquds-sweets-server\src\modules\task-statistics\task-statistics.interface.ts

export interface ITaskStatistics {
  _id: string; // task ID (grouped by)
  taskName: string;
  timesAssigned: number; // how many times this task was assigned to employees
  timesCompleted: number; // how many times this task was completed (has endTime)
  lateTasks: number; // how many times this task was completed late (actualTime > duration)
  averageDuration: number; // average actual duration in minutes
}

