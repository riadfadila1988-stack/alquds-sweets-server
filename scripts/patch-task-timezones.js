#!/usr/bin/env node
// Safe script to add a timezone to tasks that only have startAtString and no timezone.
// Usage:
//   node scripts/patch-task-timezones.js            # dry-run if MONGO_URI not set
//   MONGO_URI="mongodb://..." NOTIFY_TZ="Asia/Jerusalem" node scripts/patch-task-timezones.js
//   or pass --target-tz=Asia/Jerusalem and --mongo="mongodb://..."

const argv = process.argv.slice(2);
const arg = (name) => {
  const p = argv.find(a => a.startsWith(`--${name}=`));
  return p ? p.split('=')[1] : undefined;
};

const MONGO = process.env.MONGO_URI || arg('mongo');
const TARGET_TZ = process.env.NOTIFY_TZ || arg('target-tz') || 'Asia/Jerusalem';
const DRY = !MONGO || argv.includes('--dry-run');

(async function main() {
  console.log('[patch-task-timezones] target tz=', TARGET_TZ, 'MONGO_URI set=', !!MONGO, 'dryRun=', DRY);
  if (DRY) {
    console.log('[patch-task-timezones] Dry run. No DB connection will be made.');
    console.log('[patch-task-timezones] To apply changes, set MONGO_URI and re-run:');
    console.log('  set MONGO_URI=your_mongo && set NOTIFY_TZ=' + TARGET_TZ + ' && node scripts\\patch-task-timezones.js');
    console.log('[patch-task-timezones] Example update that would run:');
    console.log("db.workdayplans.find({'assignments.tasks.startAtString':{$exists:true}}).forEach(p=>{/* add p.assignments[].tasks[].timezone = '"+TARGET_TZ+"' where missing */})");
    process.exit(0);
  }

  // Real run
  try {
    const mongoose = require('mongoose');
    console.log('[patch-task-timezones] connecting to', MONGO);
    await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });

    // Require the WorkDayPlan model file from the project
    // The file exports a named WorkDayPlan (used in server sources). Try to require it.
    const models = require('../src/modules/work-day-plan/work-day-plan.model');
    const WorkDayPlan = models && (models.WorkDayPlan || models.default || models);
    if (!WorkDayPlan) throw new Error('WorkDayPlan model not found at src/modules/work-day-plan/work-day-plan.model');

    const cursor = WorkDayPlan.find({ 'assignments.tasks.startAtString': { $exists: true } }).cursor();
    let patchedPlans = 0;
    let touchedTasks = 0;
    const sampleIds = [];
    for (let plan = await cursor.next(); plan != null; plan = await cursor.next()) {
      let modified = false;
      for (const a of plan.assignments || []) {
        for (const t of a.tasks || []) {
          if (t && t.startAtString && !t.timezone) {
            t.timezone = TARGET_TZ;
            modified = true;
            touchedTasks++;
          }
        }
      }
      if (modified) {
        await plan.save();
        patchedPlans++;
        sampleIds.push(String(plan._id));
        if (sampleIds.length >= 5) sampleIds.pop();
      }
    }

    console.log('[patch-task-timezones] done. patchedPlans=', patchedPlans, 'touchedTasks=', touchedTasks, 'samplePlanIds=', sampleIds);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[patch-task-timezones] failed', err);
    process.exit(2);
  }
})();

