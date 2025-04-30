'use server';

import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { RepsState } from '@/components/day-workout'; // Adjust path as necessary
import { format } from 'date-fns';

// Assuming a single-user scenario for now, using a fixed userId
// In a real app, you'd get this from authentication context
const MOCK_USER_ID = 'defaultUser';

// Represents the structure of data stored for a single day
interface DailyWorkoutRecord {
  reps: RepsState[string]; // Reps for a specific day { morningGym: {...}, eveningHome: {...} }
  recordedAt: ReturnType<typeof serverTimestamp>;
  lastUpdatedAt: ReturnType<typeof serverTimestamp>;
  dayOfWeek: string; // e.g., 'Monday'
}

export async function saveWorkoutData(
  date: Date,
  dayOfWeek: string,
  dayReps: RepsState[string]
): Promise<{ success: boolean; error?: string }> {
  if (!date || !dayOfWeek || !dayReps) {
    return { success: false, error: 'Missing required data.' };
  }

  const dateString = format(date, 'yyyy-MM-dd');
  const docRef = doc(db, 'workoutRecords', MOCK_USER_ID, 'daily', dateString);

  try {
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // Update existing record
      await setDoc(docRef, {
        reps: dayReps,
        lastUpdatedAt: serverTimestamp(),
      }, { merge: true }); // Merge to only update specified fields
    } else {
      // Create new record
      const newRecord: DailyWorkoutRecord = {
        reps: dayReps,
        recordedAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
        dayOfWeek: dayOfWeek,
      };
      await setDoc(docRef, newRecord);
    }

    console.log('Workout data saved successfully for:', dateString);
    return { success: true };
  } catch (error) {
    console.error('Error saving workout data:', error);
    return { success: false, error: 'Failed to save workout data.' };
  }
}
