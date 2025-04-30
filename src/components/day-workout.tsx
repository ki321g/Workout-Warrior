
"use client";

import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExerciseCard } from '@/components/exercise-card';
import type { WorkoutDayPlan } from '@/lib/workout-data'; // Changed import to WorkoutDayPlan
import { Sun, Moon, Heart, Repeat } from 'lucide-react';

// RepsState structure remains the same: reps[day][workoutType][uniqueExerciseIdentifier][roundIndex]
export interface RepsState {
  [day: string]: { // e.g., 'Monday', 'Tuesday'
    [workoutType: string]: { // 'morningGym', 'eveningHome'
      [uniqueExerciseIdentifier: string]: { // Unique key like 'supersetA_0', 'bicepCurls', 'optionalFinisher'
        [roundIndex: number]: number | string; // Store reps per round (allow empty string)
      };
    };
  };
}

interface DayWorkoutProps {
  day: string; // The specific day this component represents (e.g., "Monday")
  plan: WorkoutDayPlan | undefined; // The plan for this specific day
  reps: RepsState[string]; // Reps data specifically for this 'day'
  onRepChange: (day: string, workoutType: string, uniqueExerciseIdentifier: string, roundIndex: number, value: number | string) => void;
}

export function DayWorkout({ day, plan, reps, onRepChange }: DayWorkoutProps) {
  if (!plan) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl font-semibold text-center">No workout planned for {day}.</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // Callback function simplified: it knows the 'day' from props, only needs the rest from ExerciseCard
  const handleExerciseRepChange = (uniqueExerciseIdentifier: string, roundIndex: number, value: number | string, workoutType: 'morningGym' | 'eveningHome') => {
     // Call the parent handler, passing the 'day' prop along
     onRepChange(day, workoutType, uniqueExerciseIdentifier, roundIndex, value);
  };


  const renderExercises = (workoutType: 'morningGym' | 'eveningHome', exercises: WorkoutDayPlan['morningGym'] | WorkoutDayPlan['eveningHome'], icon: React.ReactNode) => {
    if (!exercises || Object.keys(exercises).length === 0) return null;

    const title = workoutType === 'morningGym' ? "Morning Gym" : "Evening Home Dumbbells";
    // Use the 'reps' prop directly, which already contains data for the correct 'day'
    const workoutTypeReps = reps?.[workoutType] || {}; // Reps for this specific workout type (morning/evening) for this day

    return (
      <Card className="mb-6 shadow-md">
        <CardHeader className="bg-secondary rounded-t-lg py-3 sm:py-4 px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 px-2 sm:px-6 space-y-4">
          {Object.entries(exercises).map(([baseIdentifier, exercise]) => {
              // Prepare the reps data specifically for this ExerciseCard by filtering workoutTypeReps
              const relevantReps: { [uniqueId: string]: { [roundIndex: number]: number | string } } = {};
              for (const uniqueId in workoutTypeReps) {
                if (uniqueId.startsWith(baseIdentifier)) {
                  relevantReps[uniqueId] = workoutTypeReps[uniqueId];
                }
              }

              return(
                 <ExerciseCard
                    key={`${day}-${workoutType}-${baseIdentifier}`} // Ensure key uniqueness across days/types
                    baseIdentifier={baseIdentifier} // Pass the base identifier
                    exercise={exercise}
                    repsData={relevantReps} // Pass the filtered reps data for this exercise/superset
                    // Pass the simplified handler
                    onRepChange={(uniqueId, roundIdx, val) => handleExerciseRepChange(uniqueId, roundIdx, val, workoutType)}
                    isSuperset={baseIdentifier.startsWith('superset')}
                  />
              )
          })}
          {/* Optional Finisher logic needs workoutTypeReps */}
          {plan.optionalFinisher && workoutType === 'morningGym' && (
             <ExerciseCard
                key={`${day}-morningGym-optionalFinisher`}
                baseIdentifier="optionalFinisher"
                exercise={plan.optionalFinisher}
                // Pass only the reps for the optional finisher from the morning gym reps
                repsData={{ optionalFinisher: workoutTypeReps?.optionalFinisher || {} }}
                 onRepChange={(uniqueId, roundIdx, val) => handleExerciseRepChange(uniqueId, roundIdx, val, workoutType)}
                isOptional={true}
              />
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCardio = (cardio: WorkoutDayPlan['cardio'], icon: React.ReactNode) => {
    if (!cardio) return null;
    return (
      <Card className="mb-6 shadow-md">
         <CardHeader className="bg-accent/20 rounded-t-lg py-3 sm:py-4 px-4 sm:px-6">
           <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-accent-foreground">
            {icon}
            Cardio
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 px-4 sm:px-6">
          <p className="text-muted-foreground text-sm sm:text-base">{cardio}</p>
        </CardContent>
      </Card>
    );
  };

   const renderRecovery = (recovery: WorkoutDayPlan['recovery'], icon: React.ReactNode) => {
    if (!recovery) return null;
    return (
      <Card className="mb-6 shadow-md">
         <CardHeader className="bg-primary/10 rounded-t-lg py-3 sm:py-4 px-4 sm:px-6">
           <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-primary">
             {icon}
            Active Recovery / Optional
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 px-4 sm:px-6 space-y-2">
          {recovery.split('\n').map((line, i) => (
            <p key={i} className="text-muted-foreground text-sm sm:text-base">{line.trim()}</p>
          ))}
        </CardContent>
      </Card>
    );
  };


  return (
    <div className="space-y-6">
       {renderExercises( 'morningGym', plan.morningGym, <Sun className="text-yellow-500 h-5 w-5 sm:h-6 sm:w-6" />)}
       {renderExercises('eveningHome', plan.eveningHome, <Moon className="text-blue-400 h-5 w-5 sm:h-6 sm:w-6" />)}
       {renderCardio(plan.cardio, <Heart className="text-red-500 h-5 w-5 sm:h-6 sm:w-6" />)}
       {renderRecovery(plan.recovery, <Repeat className="text-green-500 h-5 w-5 sm:h-6 sm:w-6" />)}

       {plan.restDay && (
         <Card className="shadow-md bg-green-50 dark:bg-green-900/30">
            <CardHeader className="py-3 sm:py-4 px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl font-semibold text-center text-green-700 dark:text-green-400">
               Rest Day
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-4 px-4 sm:px-6">
             <p className="text-center text-muted-foreground text-sm sm:text-base">Take a well-deserved break!</p>
           </CardContent>
         </Card>
       )}
    </div>
  );
}


    