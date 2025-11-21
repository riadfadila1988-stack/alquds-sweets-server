#!/usr/bin/env node
"use strict";
/**
 * Convert tasks that only have startAtString into explicit UTC startAt Date fields.
 * TypeScript version. Run with `npx ts-node scripts/convert-startat-to-utc.ts` (dry-run by default when MONGO_URI is not set).
 *
 * Usage examples:
 *  Dry run (no DB connection):
 *    npx ts-node scripts/convert-startat-to-utc.ts
 *
 *  Apply changes (after backup):
 *    set MONGO_URI=mongodb://user:pw@host:port/dbname
 *    set NOTIFY_TZ=Asia/Jerusalem
 *    npx ts-node scripts/convert-startat-to-utc.ts
 */
const argv = process.argv.slice(2);
const arg = (name) => {
    const p = argv.find(a => a.startsWith(`--${name}=`));
    return p ? p.split('=')[1] : undefined;
};
const MONGO = process.env.MONGO_URI || arg('mongo');
const TARGET_TZ = process.env.NOTIFY_TZ || arg('target-tz') || 'Asia/Jerusalem';
const DRY = !MONGO || argv.includes('--dry-run');
(async function main() {
    console.log('[convert-startat-to-utc] target tz=', TARGET_TZ, 'MONGO_URI set=', !!MONGO, 'dryRun=', DRY);
    if (DRY) {
        console.log('[convert-startat-to-utc] Dry run. No DB connection will be made.');
        console.log('[convert-startat-to-utc] To apply changes, set MONGO_URI and re-run:');
        console.log('  set MONGO_URI=mongodb://... && set NOTIFY_TZ=' + TARGET_TZ + ' && npx ts-node scripts\\convert-startat-to-utc.ts');
        process.exit(0);
    }
    try {
        // Use require to avoid assorted tsconfig interop issues when this is run standalone
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mongoose = require('mongoose');
        console.log('[convert-startat-to-utc] connecting to', MONGO);
        await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
        const models = require('../src/modules/work-day-plan/work-day-plan.model');
        const WorkDayPlan = models && (models.WorkDayPlan || models.default || models);
        if (!WorkDayPlan)
            throw new Error('WorkDayPlan model not found at src/modules/work-day-plan/work-day-plan.model');
        // Luxon
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { DateTime } = require('luxon');
        // Cursor over plans that have tasks with startAtString but no startAt
        const cursor = WorkDayPlan.find({ 'assignments.tasks.startAtString': { $exists: true } }).cursor();
        let plansTouched = 0;
        let tasksUpdated = 0;
        const sample = [];
        for (let plan = await cursor.next(); plan != null; plan = await cursor.next()) {
            let modified = false;
            for (const a of plan.assignments || []) {
                for (const t of a.tasks || []) {
                    if (t && t.startAtString && !t.startAt) {
                        // parse startAtString as HH:mm[:ss]
                        const m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/.exec(t.startAtString);
                        if (!m)
                            continue;
                        const hh = Number(m[1]);
                        const mm = Number(m[2]);
                        const ss = m[3] ? Number(m[3]) : 0;
                        const tz = (t.timezone) || TARGET_TZ || 'Asia/Jerusalem';
                        // Build a Luxon DateTime from plan.date in the target zone then set the time
                        const planDate = plan.date instanceof Date ? DateTime.fromJSDate(plan.date, { zone: tz }) : DateTime.fromISO(String(plan.date), { zone: tz });
                        const dt = planDate.set({ hour: hh, minute: mm, second: ss, millisecond: 0 });
                        if (!dt.isValid)
                            continue;
                        // Set task.startAt to UTC instant (JS Date)
                        t.startAt = dt.toJSDate();
                        modified = true;
                        tasksUpdated++;
                    }
                }
            }
            if (modified) {
                await plan.save();
                plansTouched++;
                if (sample.length < 10)
                    sample.push(String(plan._id));
            }
        }
        console.log('[convert-startat-to-utc] done. plansTouched=', plansTouched, 'tasksUpdated=', tasksUpdated, 'samplePlanIds=', sample);
        await mongoose.disconnect();
        process.exit(0);
    }
    catch (err) {
        console.error('[convert-startat-to-utc] failed', err);
        process.exit(2);
    }
})();
