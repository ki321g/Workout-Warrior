'use server';

import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { RepsState } from '@/components/day-workout'; // Adjust path as necessary

const MOCK_USER_ID = 'defaultUser'; // Same assumption as saveWorkoutData

// Structure matching the data stored in Firestore
interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

interface DailyWorkoutRecordFirestore {
  reps: RepsState[string];
  recordedAt: FirestoreTimestamp;
  lastUpdatedAt: FirestoreTimestamp;
  dayOfWeek: string;
}

export interface LoadedWorkoutData {
    [dateString: string]: { // e.g., '2023-10-27'
        reps: RepsState[string];
        dayOfWeek: string;
        recordedAt: Date;
        lastUpdatedAt: Date;
    }
}


export async function loadWorkoutData(): Promise<LoadedWorkoutData | null> {
  const dailyRecordsRef = collection(db, 'workoutRecords', MOCK_USER_ID, 'daily');
  // Query to get all records, potentially could limit or paginate later
  const q = query(dailyRecordsRef, orderBy('recordedAt', 'desc')); // Order by date recorded

  try {
    const querySnapshot = await getDocs(q);
    const loadedData: LoadedWorkoutData = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data() as DailyWorkoutRecordFirestore;
      const dateString = doc.id; // Document ID is the 'yyyy-MM-dd' date string

      loadedData[dateString] = {
        reps: data.reps,
        dayOfWeek: data.dayOfWeek,
        // Convert Firestore Timestamps to JS Date objects
        recordedAt: new Date(data.recordedAt.seconds * 1000),
        lastUpdatedAt: new Date(data.lastUpdatedAt.seconds * 1000),
      };
    });

    console.log('Workout data loaded successfully.');
    return loadedData;
  } catch (error) {
    console.error('Error loading workout data:', error);
    return null; // Indicate failure
  }
}
