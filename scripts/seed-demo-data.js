const {
  admin,
  commitBatches,
  initAdmin,
  parseArgs,
  timestampForDate,
  todayKey
} = require('./firebase-admin');

const args = parseArgs(process.argv);
const trainerId = args.trainerId || process.env.DEMO_TRAINER_UID || 'demo-trainer';
const trainerName = args.trainerName || process.env.DEMO_TRAINER_NAME || 'Demo Coach';
const athleteCount = Math.max(1, Math.min(parseInt(args.athletes || process.env.DEMO_ATHLETE_COUNT || '2', 10), 6));

const programIds = {
  strength: 'demo-program-strength-base',
  power: 'demo-program-power-build'
};

const programs = [
  {
    id: programIds.strength,
    name: 'Demo Strength Base',
    difficulty: 'Intermediate',
    duration: '6',
    daysPerWeek: '3',
    estWorkoutTime: '55',
    goal: 'Strength',
    days: [
      { label: 'Day 1', exercises: [
        ex('Back Squat', '4', 'Reps', '5', '165', '90', '150', 'Keep bar path vertical.'),
        ex('Bench Press', '4', 'Reps', '6', '115', '90', '104'),
        ex('Romanian Deadlift', '3', 'Reps', '8', '135', '75', '101')
      ] },
      { label: 'Day 2', exercises: [
        ex('Deadlift', '4', 'Reps', '4', '205', '90', '185'),
        ex('Pull Up', '3', 'Reps', '8', '', '', ''),
        ex('Dumbbell Row', '3', 'Reps', '10', '55', '75', '41')
      ] },
      { label: 'Day 3', exercises: [
        ex('Front Squat', '3', 'Reps', '6', '135', '85', '115'),
        ex('Overhead Press', '4', 'Reps', '5', '75', '80', '60'),
        ex('Split Squat', '3', 'Reps', '10', '35', '', '')
      ] }
    ]
  },
  {
    id: programIds.power,
    name: 'Demo Power Build',
    difficulty: 'Advanced',
    duration: '5',
    daysPerWeek: '3',
    estWorkoutTime: '50',
    goal: 'Power',
    days: [
      { label: 'Day 1', exercises: [
        ex('Power Clean', '5', 'Reps', '3', '115', '80', '92'),
        ex('Back Squat', '5', 'Reps', '3', '185', '90', '167'),
        ex('Box Jump', '4', 'Reps', '5', '', '', '')
      ] },
      { label: 'Day 2', exercises: [
        ex('Bench Press', '5', 'Reps', '3', '135', '85', '115'),
        ex('Barbell Row', '4', 'Reps', '6', '115', '', ''),
        ex('Medicine Ball Slam', '5', 'Reps', '6', '20', '', '')
      ] },
      { label: 'Day 3', exercises: [
        ex('Deadlift', '5', 'Reps', '2', '245', '88', '216'),
        ex('Push Press', '4', 'Reps', '4', '95', '85', '81'),
        ex('Sled Push', '6', 'Timed', '20', '180', '', '')
      ] }
    ]
  }
];

function ex(name, sets, type, value, weight, percent, targetWeight, notes = '') {
  return { name, sets, type, value, weight, percent, targetWeight, rest: '90', notes, videoUrl: '' };
}

function flattenDays(days) {
  return days.flatMap(day => day.exercises || []);
}

function athleteId(index) {
  return `demo-athlete-${String(index).padStart(2, '0')}`;
}

function athleteName(index) {
  const names = ['Avery Lane', 'Jordan Price', 'Taylor Brooks', 'Morgan Reed', 'Casey Stone', 'Riley Hayes', 'Jamie Cross', 'Quinn Porter'];
  return names[index - 1] || `Demo Athlete ${index}`;
}

function loadFor(exerciseName, athleteIndex, sessionIndex, base) {
  const step = Math.floor(sessionIndex / 3) * 2.5 + athleteIndex * 2.5;
  if (!base) return null;
  if (exerciseName.includes('Squat')) return base + step;
  if (exerciseName.includes('Deadlift')) return base + step * 1.5;
  if (exerciseName.includes('Bench')) return base + step;
  if (exerciseName.includes('Press')) return base + Math.floor(step / 2);
  return base + Math.floor(step / 3);
}

function makeSetLogs(exercise, athleteIndex, sessionIndex) {
  const setCount = parseInt(exercise.sets, 10) || 3;
  const target = parseInt(exercise.value, 10) || 5;
  const baseWeight = parseFloat(exercise.targetWeight || exercise.weight || '0') || null;
  const weight = loadFor(exercise.name, athleteIndex, sessionIndex, baseWeight);
  return Array.from({ length: setCount }, (_, i) => {
    const reps = Math.max(1, target + (i === setCount - 1 && sessionIndex % 4 === 0 ? 1 : 0));
    const row = {
      setNum: i + 1,
      weight: weight ? `${Math.round(weight)} lb` : null,
      completedAt: new Date().toISOString()
    };
    if (exercise.type === 'Timed') row.timeSec = target;
    else row.reps = reps;
    return row;
  });
}

function buildWrites() {
  const writes = [];
  const now = admin.firestore.FieldValue.serverTimestamp();

  writes.push({
    collection: 'users',
    id: trainerId,
    data: {
      uid: trainerId,
      displayName: trainerName,
      email: `${trainerId}@demo.coachsync.test`,
      role: 'trainer',
      trainerCode: 'DEMO01',
      demoData: true,
      updatedAt: now,
      createdAt: timestampForDate(todayKey(-180))
    }
  });

  programs.forEach(program => {
    writes.push({
      collection: 'programs',
      id: program.id,
      data: {
        ...program,
        exercises: flattenDays(program.days),
        trainerId,
        demoData: true,
        createdAt: timestampForDate(todayKey(-120)),
        updatedAt: now
      }
    });
  });

  for (let i = 1; i <= athleteCount; i += 1) {
    const id = athleteId(i);
    const name = athleteName(i);
    const assignedPrograms = programs.map(program => program.name);
    const programStartDates = {};
    let runningOffset = -80 - i;
    programs.forEach(program => {
      programStartDates[program.name] = new Date(`${todayKey(runningOffset)}T12:00:00`).getTime();
      runningOffset += (parseInt(program.duration, 10) * 7) + 7;
    });
    const activeProgram = programs[programs.length - 1];
    const completedSessionCount = programs.reduce((sum, program) => (
      sum + (parseInt(program.duration, 10) * parseInt(program.daysPerWeek, 10))
    ), 0);

    writes.push({
      collection: 'users',
      id,
      data: {
        uid: id,
        displayName: name,
        email: `demo.athlete.${String(i).padStart(2, '0')}@coachsync.test`,
        role: 'athlete',
        trainerId,
        trainerName,
        assignedProgram: activeProgram.name,
        assignedPrograms,
        programStartDate: programStartDates[activeProgram.name],
        programStartDates,
        sessionsCompleted: completedSessionCount,
        lastWorkout: timestampForDate(todayKey(-1 - (i % 2))),
        demoData: true,
        createdAt: timestampForDate(todayKey(-150 - i)),
        updatedAt: now
      }
    });

    writes.push({
      collection: 'goals',
      id,
      data: {
        athleteId: id,
        athleteName: name,
        trainerId,
        goal90: 'Add consistency to training and improve main lift technique under fatigue.',
        goal180: `Complete both demo programs and bring ${i % 2 === 0 ? 'deadlift' : 'squat'} working sets up by 20 lb.`,
        goal365: 'Build a full year of measurable progress with fewer missed sessions and stronger movement quality.',
        demoData: true,
        updatedAt: timestampForDate(todayKey(-7 + (i % 4)))
      }
    });

    programs.forEach((program, programIndex) => {
      const daysPerWeek = parseInt(program.daysPerWeek, 10);
      const durationWeeks = parseInt(program.duration, 10);
      const sessions = daysPerWeek * durationWeeks;
      const startDate = new Date(programStartDates[program.name]);

      for (let s = 0; s < sessions; s += 1) {
        const week = Math.floor(s / daysPerWeek) + 1;
        const day = (s % daysPerWeek) + 1;
        const dateObj = new Date(startDate);
        dateObj.setDate(startDate.getDate() + ((week - 1) * 7) + (day - 1));
        const date = dateObj.toISOString().slice(0, 10);
        const dayExercises = program.days[day - 1].exercises;
        const completedExercises = dayExercises.map((_, idx) => String(idx));
        const logId = `demo-workout-${id}-p${programIndex + 1}-w${week}-d${day}`;

        writes.push({
          collection: 'workoutLogs',
          id: logId,
          data: {
            athleteId: id,
            programName: program.name,
            week,
            day,
            date,
            completedExercises,
            exerciseNames: dayExercises.map(item => item.name),
            exerciseIndexes: dayExercises.map((_, idx) => idx),
            exerciseNotes: { [`${day}_0`]: s % 5 === 0 ? 'Moved well today.' : '' },
            totalExercises: dayExercises.length,
            status: 'completed',
            skippedReason: '',
            rpe: Math.min(10, 6 + ((s + i + programIndex) % 4)),
            demoData: true,
            createdAt: timestampForDate(date),
            updatedAt: now
          }
        });

        dayExercises.forEach((exercise, exerciseIndex) => {
          writes.push({
            collection: 'exerciseLogs',
            id: `demo-exercise-${id}-p${programIndex + 1}-w${week}-d${day}-e${exerciseIndex}`,
            data: {
              athleteId: id,
              programName: program.name,
              exerciseName: exercise.name,
              exerciseIndex,
              type: exercise.type || 'Reps',
              prescribed: {
                sets: exercise.sets || null,
                value: exercise.value || exercise.reps || null,
                weight: exercise.targetWeight ? `${exercise.targetWeight} lb target` : (exercise.weight || null),
                rest: exercise.rest || null
              },
              sets: makeSetLogs(exercise, i, s),
              totalSets: parseInt(exercise.sets, 10) || 3,
              date,
              demoData: true,
              completedAt: timestampForDate(date),
              createdAt: timestampForDate(date)
            }
          });
        });
      }
    });

    writes.push({
      collection: 'messages',
      id: `demo-message-${id}`,
      data: {
        senderId: id,
        receiverId: trainerId,
        senderName: name,
        text: 'Demo check-in: training felt solid this week.',
        read: i % 2 === 0,
        demoData: true,
        createdAt: timestampForDate(todayKey(-i), 9)
      }
    });
  }

  return writes;
}

async function main() {
  initAdmin();
  const db = admin.firestore();
  const writes = buildWrites();
  await commitBatches(db, writes);
  console.log(`Seeded ${writes.length} demo documents.`);
  console.log(`Trainer id: ${trainerId}`);
  console.log('Demo docs are tagged with demoData: true and can be removed with npm run clear:demo.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
