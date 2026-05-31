# CoachSync Demo Data Scripts

These scripts seed and clear repeatable demo data for local testing.

The default seed is intentionally small: 1 trainer, 2 athletes, and 2 completed programs per athlete. It includes workout logs and set-level exercise logs so progress, performance graphs, rep PRs, weight history, adherence, goals, and trainer views all have realistic data.

## Setup

Install dependencies:

```powershell
npm install
```

Authenticate one of two ways:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccountKey.json"
$env:FIREBASE_PROJECT_ID="your-project-id"
```

Or paste service account JSON into `FIREBASE_SERVICE_ACCOUNT_JSON`.

The key file must stay out of git. `serviceAccountKey.json` and `*.service-account.json` are ignored.

## Seed

Seed demo data under the default demo trainer:

```powershell
npm run seed:demo
```

Seed data under a real trainer account so it appears when that trainer logs in:

```powershell
npm run seed:demo -- --trainer-id YOUR_TRAINER_UID --trainer-name "Coach Name"
```

Optional athlete count, capped at 6:

```powershell
npm run seed:demo -- --trainer-id YOUR_TRAINER_UID --athletes 4
```

## Clear

Remove every document tagged with `demoData: true`:

```powershell
npm run clear:demo
```

The cleanup script only deletes tagged demo documents in known app collections.
