import connectDB from '../config/mongoose';
import { WorkDayPlan } from '../modules/work-day-plan/work-day-plan.model';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

async function run() {
  await connectDB();
  console.log('[backfill] connected to DB');
  const plans = await WorkDayPlan.find();
  console.log('[backfill] found', plans.length, 'plans');
  let updatedPlans = 0;
  let updatedTasks = 0;

  for (const plan of plans) {
    let changed = false;
    const assignments = plan.assignments || [];
    for (const a of assignments) {
      const tasks = a.tasks || [];
      for (const t of tasks) {
        try {
          const hasString = t && (t.startAtString !== undefined && t.startAtString !== null);
          if (!hasString && t && t.startAt) {
            const d = new Date(t.startAt);
            if (!isNaN(d.getTime())) {
              // Use UTC hours/minutes extracted from stored Date so we match the DB ISO time
              const hh = pad(d.getUTCHours());
              const mm = pad(d.getUTCMinutes());
              t.startAtString = `${hh}:${mm}`;
              changed = true;
              updatedTasks++;
            }
          }
        } catch (err) {
          console.error('[backfill] failed task update', err);
        }
      }
    }
    if (changed) {
      try {
        await plan.save();
        updatedPlans++;
        console.log('[backfill] saved plan', String(plan._id));
      } catch (err) {
        console.error('[backfill] failed to save plan', String(plan._id), err);
      }
    }
  }

  console.log('[backfill] done. plansUpdated=', updatedPlans, 'tasksUpdated=', updatedTasks);
  process.exit(0);
}

run().catch((e) => {
  console.error('[backfill] error', e);
  process.exit(1);
});

