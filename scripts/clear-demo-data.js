const {
  admin,
  commitBatches,
  initAdmin,
  parseArgs
} = require('./firebase-admin');

const args = parseArgs(process.argv);
const collections = (args.collections || 'users,programs,workoutLogs,exerciseLogs,goals,messages,sessions')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

async function main() {
  initAdmin();
  const db = admin.firestore();
  const writes = [];

  for (const collection of collections) {
    const snap = await db.collection(collection).where('demoData', '==', true).get();
    snap.docs.forEach(doc => {
      writes.push({ type: 'delete', collection, id: doc.id });
    });
  }

  await commitBatches(db, writes);
  console.log(`Deleted ${writes.length} demo documents from: ${collections.join(', ')}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
