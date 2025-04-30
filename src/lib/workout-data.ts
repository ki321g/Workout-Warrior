
import type * as React from 'react';
// Replaced Barbell with Weight as Barbell is not available in lucide-react
// Replaced Kettlebell with Activity as Kettlebell is not available in lucide-react
import { Weight, Dumbbell, Heart, PersonStanding, GitBranchPlus, Activity, Footprints, Bike, RowingMachine, TrendingUp } from 'lucide-react'; // Added RowingMachine, TrendingUp

export interface Exercise {
  name: string;
  reps: string; // e.g., "8-10 reps", "10 reps", "30 seconds"
  rounds?: number; // Number of rounds for this specific exercise (used in non-supersets sometimes)
  icon?: React.ElementType; // Icon component type
}

export interface Superset {
  exercises: Exercise[];
  rounds: number; // Number of rounds for the entire superset
}

// Workout type can be a single exercise or a superset
export type WorkoutItem = Exercise | Superset;

// Structure for defining the plan for a single day
export interface WorkoutDayPlan {
  morningGym?: {
    [key: string]: WorkoutItem; // e.g., supersetA, supersetB, finisher
  };
  eveningHome?: {
    [key: string]: Exercise; // e.g., bicepCurls, overheadPress
  };
   optionalFinisher?: Exercise;
  cardio?: string;
  recovery?: string; // For Wednesday, Saturday, Sunday
  restDay?: boolean; // For Sunday
}


export const workoutPlan: { [key: string]: WorkoutDayPlan } = {
  Monday: {
    morningGym: {
      supersetA: {
        exercises: [
          { name: 'Barbell Back Squat', reps: '8-10 reps', icon: Weight }, // Use Weight icon
          { name: 'Push-Ups or Dumbbell Bench Press', reps: '10-12 reps', icon: Dumbbell },
        ],
        rounds: 3,
      },
      supersetB: {
        exercises: [
          { name: 'Romanian Deadlift', reps: '10 reps', icon: Weight }, // Use Weight icon
          { name: 'Overhead Dumbbell Press', reps: '10-12 reps', icon: Dumbbell },
        ],
        rounds: 3,
      },
    },
     optionalFinisher: {
        name: 'Kettlebell Swings + Air Squats', reps: '15 + 15 reps', rounds: 3, icon: Activity // Use Activity icon as fallback
    },
    cardio: '30-45 min brisk walk or 15-20 min spin bike',
    eveningHome: {
      bicepCurls: { name: 'Dumbbell Bicep Curls', reps: '3×12', icon: Dumbbell },
      overheadPress: { name: 'Overhead Press', reps: '3×10', icon: Dumbbell },
      tricepsKickbacks: { name: 'Triceps Kickbacks', reps: '3×12', icon: Dumbbell },
    },
  },
  Tuesday: {
    morningGym: {
      supersetA: {
        exercises: [
          { name: 'Deadlift', reps: '6-8 reps', icon: Weight }, // Use Weight icon
          { name: 'Dumbbell Bent-Over Rows', reps: '10 reps', icon: Dumbbell },
        ],
        rounds: 3,
      },
      supersetB: {
        exercises: [
          { name: 'Lat Pulldown or Assisted Pull-Up', reps: '8-10 reps', icon: GitBranchPlus }, // Using GitBranchPlus as placeholder
          { name: 'Goblet Squats', reps: '12 reps', icon: Dumbbell },
        ],
        rounds: 3,
      },
     },
      optionalFinisher: {
         name: "Farmer's Carry", reps: '30 seconds', rounds: 3, icon: Dumbbell
     },
    cardio: '20-30 min rowing machine (steady pace)',
    eveningHome: {
      lateralRaises: { name: 'Lateral Raises', reps: '3×12', icon: Dumbbell },
      hammerCurls: { name: 'Hammer Curls', reps: '3×10', icon: Dumbbell },
      arnoldPress: { name: 'Arnold Press', reps: '3×10', icon: Dumbbell },
    },
  },
  Wednesday: {
     recovery: '30-45 min walk outdoors\nOptional light stretching or yoga',
     cardio: 'Included in recovery', // Explicitly state it's part of recovery
  },
   Thursday: { // Repeat of Monday
    morningGym: {
      supersetA: {
        exercises: [
          { name: 'Barbell Back Squat', reps: '8-10 reps', icon: Weight }, // Use Weight icon
          { name: 'Push-Ups or Dumbbell Bench Press', reps: '10-12 reps', icon: Dumbbell },
        ],
        rounds: 3,
      },
      supersetB: {
        exercises: [
          { name: 'Romanian Deadlift', reps: '10 reps', icon: Weight }, // Use Weight icon
          { name: 'Overhead Dumbbell Press', reps: '10-12 reps', icon: Dumbbell },
        ],
        rounds: 3,
      },
    },
     optionalFinisher: {
        name: 'Kettlebell Swings + Air Squats', reps: '15 + 15 reps', rounds: 3, icon: Activity // Use Activity icon as fallback
    },
    cardio: '30-45 min brisk walk or 15-20 min spin bike',
    eveningHome: {
      bicepCurls: { name: 'Dumbbell Bicep Curls', reps: '3×12', icon: Dumbbell },
      overheadPress: { name: 'Overhead Press', reps: '3×10', icon: Dumbbell },
      tricepsKickbacks: { name: 'Triceps Kickbacks', reps: '3×12', icon: Dumbbell },
    },
   },
   Friday: { // Repeat of Tuesday
    morningGym: {
      supersetA: {
        exercises: [
          { name: 'Deadlift', reps: '6-8 reps', icon: Weight }, // Use Weight icon
          { name: 'Dumbbell Bent-Over Rows', reps: '10 reps', icon: Dumbbell },
        ],
        rounds: 3,
      },
      supersetB: {
        exercises: [
          { name: 'Lat Pulldown or Assisted Pull-Up', reps: '8-10 reps', icon: GitBranchPlus },
          { name: 'Goblet Squats', reps: '12 reps', icon: Dumbbell },
        ],
        rounds: 3,
      },
     },
      optionalFinisher: {
         name: "Farmer's Carry", reps: '30 seconds', rounds: 3, icon: Dumbbell
     },
    cardio: '20-30 min rowing machine or incline treadmill',
    eveningHome: {
      lateralRaises: { name: 'Lateral Raises', reps: '3×12', icon: Dumbbell },
      hammerCurls: { name: 'Hammer Curls', reps: '3×10', icon: Dumbbell },
      arnoldPress: { name: 'Arnold Press', reps: '3×10', icon: Dumbbell },
    },
  },
  Saturday: {
     recovery: '45-60 min long outdoor walk or hike\nOptional stretching, foam rolling',
     cardio: 'Included in recovery',
  },
  Sunday: {
     recovery: 'Optional Light Cardio: Light walk or bike, 20-30 min',
     restDay: true, // Indicate it's primarily a rest day
     cardio: 'Optional light walk or bike (part of recovery)',
  },
};

    