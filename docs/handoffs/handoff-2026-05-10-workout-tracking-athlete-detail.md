# Handoff — 2026-05-10 — Workout Tracking & Athlete Detail

## What was completed

### Workout tracking system (workouts.html)
- **Calendar-driven Week/Day**: week and day are computed from `programStartDate` (set in Schedule) + today's date. No manual "advance day" needed.
- **All exercises shown every day** — trainer doesn't tag exercises by day yet, so all show on every day tab.
- **Log structure**: `workoutLogs` documents now include `week` and `day` fields alongside `date`.
- **No start date state**: if athlete hasn't set a start date, workouts.html shows a prompt linking to schedule.html.
- **"Log Workout" button**: saves progress and updates `sessionsCompleted` + `lastWorkout` on athlete doc.

### Schedule page integration
- `programStartDate` (stored as millisecond timestamp) is the source of truth for week/day across the app.
- Athlete sets or changes start date from the program banner on schedule.html.

### My Athletes page (my-athletes.html)
- Cards now show: current Week/Day, program progress bar, Active/Inactive/Not started badge, last workout (relative), workout count.
- Clicking a card navigates to `athlete-detail.html?id=<uid>`. Clicking buttons inside the card does not navigate.

### Athlete Detail page (athlete-detail.html) — NEW
- Profile hero with name, email, Active badge, joined date.
- 4 stat cards: Workouts Logged, Current Week, Current Day, Last Workout.
- Program progress bar (Week X of Y, % complete if duration is set).
- **Today's Workout tab**: shows all exercises with green checkmarks for completed ones, athlete notes in amber, trainer notes in white.
- **History tab**: all past `workoutLogs` sorted by week/day desc, with exercise pills (green = done), completion %, and athlete notes.

### Firestore rules
- `workoutLogs` read now allows trainer access: checks `users/$(athleteId).trainerId == request.auth.uid` via `get()`.

## Current state

Everything is committed and working. Firestore rules have been published manually via Firebase Console.

## Exact next steps

1. **End-to-end test**: Login as trainer → My Athletes → Assign program to smith@gmail.com → Login as athlete → Schedule → Set start date → My Workouts → check exercises, log a workout → Back to trainer → athlete-detail — verify history appears.
2. **Fix if broken**: If workoutLogs query on athlete-detail returns empty, check that `week` field is being written correctly (old logs without `week` field won't match the `where('week', ...)` query).
3. **Messages page** (`messages.html`) — stub exists, not built yet.
4. **Analytics page** (`analytics.html`) — stub exists, not built yet.
5. **Per-day exercise tagging** — programs.html could let trainers tag each exercise to a specific day (Day 1, Day 2…) so My Workouts shows different exercises per day rather than all exercises every day.

## Open questions / pending decisions

- Should "Log Workout" mark the day as fully complete even if not all exercises are checked? Currently it saves whatever is checked.
- Old `workoutLogs` documents (before the `week` field was added) won't appear in athlete-detail history — should old logs be migrated or just ignored?
- The day tabs in workouts.html let athletes switch to any day within the current week. Should past days be read-only or still editable?
