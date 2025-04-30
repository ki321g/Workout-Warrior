
'use server';

import { differenceInDays, format, parseISO, startOfDay, subDays, getDay, addDays } from 'date-fns';
import { saveWorkoutData } from './saveWorkoutData';
import { loadWorkoutData } from './loadWorkoutData';
import { workoutPlan, type WorkoutDayPlan } from '@/lib/workout-data';
import type { RepsState } from '@/components/day-workout';

const daysOfWeek = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];


// Helper function to generate a rep state with all reps set to 0
function generateZeroRepsForDay(dayPlan: WorkoutDayPlan | undefined): RepsState[string] {
    const zeroDayReps: RepsState[string] = { morningGym: {}, eveningHome: {} };
    if (!dayPlan) return zeroDayReps;

    const processWorkoutItems = (items: { [key: string]: any } | undefined, workoutType: 'morningGym' | 'eveningHome') => {
        if (!items) return;
        Object.entries(items).forEach(([baseIdentifier, item]) => {
            const rounds = item.rounds || 1;
            if (item.exercises) { // Superset
                item.exercises.forEach((ex: any, idx: number) => {
                    const uniqueId = `${baseIdentifier}_${idx}`;
                    const exRounds = ex.rounds || rounds;
                    zeroDayReps[workoutType]![uniqueId] = {};
                    for (let i = 0; i < exRounds; i++) {
                        zeroDayReps[workoutType]![uniqueId]![i] = 0;
                    }
                });
            } else { // Single exercise
                zeroDayReps[workoutType]![baseIdentifier] = {};
                 const exRounds = item.rounds || 1;
                for (let i = 0; i < exRounds; i++) {
                    zeroDayReps[workoutType]![baseIdentifier]![i] = 0;
                }
            }
        });
    };

    processWorkoutItems(dayPlan.morningGym, 'morningGym');
    processWorkoutItems(dayPlan.eveningHome, 'eveningHome');
    if (dayPlan.optionalFinisher) {
        const finisherRounds = dayPlan.optionalFinisher.rounds || 1;
        zeroDayReps.morningGym!['optionalFinisher'] = {};
         for (let i = 0; i < finisherRounds; i++) {
            zeroDayReps.morningGym!['optionalFinisher']![i] = 0;
        }
    }

    return zeroDayReps;
}

// Action to fill missed days
export async function fillMissedDays(lastRecordedDate: Date | null, today: Date): Promise<boolean> {
  const startOfToday = startOfDay(today);
  if (!lastRecordedDate) {
    console.log("No previous record found, cannot fill missed days.");
    return false; // Indicate nothing was filled
  }

  const startDate = startOfDay(lastRecordedDate);
  const daysDiff = differenceInDays(startOfToday, startDate);

  if (daysDiff <= 1) {
    console.log("No missed days or only yesterday recorded.");
    return false;
  }

  console.log(`Checking for missed days between ${format(addDays(startDate, 1), 'yyyy-MM-dd')} and ${format(subDays(startOfToday, 1), 'yyyy-MM-dd')}`);
  let filledAny = false;

  for (let i = 1; i < daysDiff; i++) {
    const missedDate = addDays(startDate, i); // Iterate from the day *after* the last record up to the day *before* today
    const missedDateString = format(missedDate, 'yyyy-MM-dd');
    const missedDayIndex = (getDay(missedDate) + 6) % 7; // 0 = Monday, 6 = Sunday
    const missedDayName = daysOfWeek[missedDayIndex];
    const dayPlan = workoutPlan[missedDayName as keyof typeof workoutPlan];

    // Only save zero reps if it's a planned workout day (not rest/recovery)
    if (!dayPlan || dayPlan.restDay || dayPlan.recovery) {
      console.log(`Skipping fill for recovery/rest day: ${missedDateString}`);
      continue;
    }

    // Generate a rep state with all reps set to 0
    const zeroReps = generateZeroRepsForDay(dayPlan);

    console.log(`Saving zero reps for missed day: ${missedDateString} (${missedDayName})`);
    // Save using the actual missed date
    await saveWorkoutData(missedDate, missedDayName, zeroReps);
    filledAny = true;
  }

  if (filledAny) {
      console.log("Finished filling missed days.");
  } else {
       console.log("No missed workout days found to fill.");
  }
  return filledAny;
}

    