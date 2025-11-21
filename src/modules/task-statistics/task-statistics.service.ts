// filepath: c:\Users\user8\Desktop\alquds\alquds-sweets-server\src\modules\task-statistics\task-statistics.service.ts
import {WorkDayPlan} from '../work-day-plan/work-day-plan.model';
import {ITaskStatistics} from './task-statistics.interface';

class TaskStatisticsService {
    /**
     * Get monthly statistics for all tasks
     * Returns aggregated data: how many times each task was assigned, completed, and average duration
     * Note: Groups by task _id (not name) since multiple tasks can have the same name
     * @param year - Full year (e.g., 2025)
     * @param month - Month number (1-12)
     */
    async getMonthlyStatistics(year: number, month: number): Promise<ITaskStatistics[]> {
        const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const end = new Date(Date.UTC(year, month, 1, 0, 0, 0)); // exclusive

        console.log(`[TaskStatistics] Fetching statistics for ${year}-${month}`, {start, end});

        const result = await WorkDayPlan.aggregate([
            // Filter by date range
            {$match: {date: {$gte: start, $lt: end}}},

            // Unwind assignments array
            {$unwind: '$assignments'},

            // Unwind tasks array
            {$unwind: '$assignments.tasks'},

            // Project fields we need for grouping
            {
                $project: {
                    taskId: '$assignments.tasks._id',
                    taskName: '$assignments.tasks.name',
                    duration: '$assignments.tasks.duration',
                    startTime: '$assignments.tasks.startTime',
                    endTime: '$assignments.tasks.endTime',
                    description: '$assignments.tasks.description',
                    // Calculate actual duration in minutes if task is completed
                    actualMinutes: {
                        $cond: [
                            {
                                $and: [
                                    {$ne: ['$assignments.tasks.startTime', null]},
                                    {$ne: ['$assignments.tasks.endTime', null]},
                                ],
                            },
                            {
                                $divide: [
                                    {$subtract: ['$assignments.tasks.endTime', '$assignments.tasks.startTime']},
                                    60000, // convert ms to minutes
                                ],
                            },
                            null,
                        ],
                    },
                    hasEndTime: {
                        $cond: [
                            // Check if endTime exists and is not null
                            {$ne: [{$ifNull: ['$assignments.tasks.endTime', null]}, null]},
                            1,
                            0,
                        ],
                    },
                    // Check if task was late: (endTime - startTime) > duration
                    isLate: {
                        $cond: [
                            {
                                $and: [
                                    {$ne: ['$assignments.tasks.startTime', null]},
                                    {$ne: ['$assignments.tasks.endTime', null]},
                                    {$gt: ['$assignments.tasks.duration', 0]}, // has a duration set
                                    {
                                        $gt: [
                                            {$divide: [{$subtract: ['$assignments.tasks.endTime', '$assignments.tasks.startTime']}, 60000]},
                                            '$assignments.tasks.duration'
                                        ]
                                    }
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
            },

            // Group by task ID (not name, since multiple tasks can have the same name)
            {
                $group: {
                    _id: '$taskId',
                    description: {$first: '$description'},
                    duration: {$first: '$duration'},
                    taskName: {$first: '$taskName'},
                    timesAssigned: {$sum: 1}, // Count ALL instances (completed or not)
                    timesCompleted: {$sum: '$hasEndTime'}, // Count only tasks with endTime
                    lateTasks: {$sum: '$isLate'}, // Count tasks completed late (took longer than duration)
                    totalActualMinutes: {
                        $sum: {
                            $cond: [
                                {$ne: ['$actualMinutes', null]},
                                '$actualMinutes',
                                0,
                            ],
                        },
                    },
                    completedCount: {
                        $sum: {
                            $cond: [
                                {$ne: ['$actualMinutes', null]},
                                1,
                                0,
                            ],
                        },
                    },
                },
            },

            // Calculate average duration
            {
                $project: {
                    _id: 1,
                    taskName: 1,
                    timesAssigned: 1,
                    timesCompleted: 1,
                    lateTasks: 1,
                    description: 1,
                    duration: 1,
                    averageDuration: {
                        $cond: [
                            {$gt: ['$completedCount', 0]},
                            {
                                $round: [
                                    {$divide: ['$totalActualMinutes', '$completedCount']}, // average in minutes
                                    2,
                                ],
                            },
                            0,
                        ],
                    },
                },
            },

            // Sort by times assigned (most popular tasks first)
            {$sort: {timesAssigned: -1}},
        ]);

        console.log(`[TaskStatistics] Found ${result.length} tasks with statistics`);

        // Debug: Check if any task has timesAssigned > timesCompleted
        const tasksWithIncomplete = result.filter(r => r.timesAssigned > r.timesCompleted);
        if (tasksWithIncomplete.length > 0) {
            console.log(`[TaskStatistics] Found ${tasksWithIncomplete.length} tasks with incomplete assignments:`);
            tasksWithIncomplete.forEach(t => {
                console.log(`  - ${t.taskName}: assigned=${t.timesAssigned}, completed=${t.timesCompleted}`);
            });
        } else {
            console.log('[TaskStatistics] All assigned tasks are marked as completed (this might indicate an issue)');
        }

        // Debug: Check for late tasks
        const tasksWithLate = result.filter(r => r.lateTasks > 0);
        if (tasksWithLate.length > 0) {
            console.log(`[TaskStatistics] Found ${tasksWithLate.length} tasks with late completions:`);
            tasksWithLate.forEach(t => {
                console.log(`  - ${t.taskName}: completed=${t.timesCompleted}, late=${t.lateTasks} (${((t.lateTasks / t.timesCompleted) * 100).toFixed(1)}%)`);
            });
        }

        return result as ITaskStatistics[];
    }
}

export default new TaskStatisticsService();

