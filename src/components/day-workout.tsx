
"use client";

import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExerciseCard } from '@/components/exercise-card';
import type { WorkoutDay } from '@/lib/workout-data';
import { Sun, Moon, Heart, Repeat } from 'lucide-react';

// RepsState structure: reps[day][workoutType][uniqueExerciseIdentifier][roundIndex]
export interface RepsState {
  [day: string]: {
    [workoutType: string]: { // 'morningGym', 'eveningHome'
      [uniqueExerciseIdentifier: string]: { // Unique key like 'supersetA_0', 'bicepCurls', 'optionalFinisher'
        [roundIndex: number]: number | string; // Store reps per round
      };
    };
  };
}


interface DayWorkoutProps {
  day: string;
  plan: WorkoutDay | undefined;
  reps: RepsState[string]; // Reps for the current day
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

  // The callback function remains the same, passing the unique identifier from ExerciseCard up
  const handleExerciseRepChange = (uniqueExerciseIdentifier: string, roundIndex: number, value: number | string, workoutType: 'morningGym' | 'eveningHome') => {
     onRepChange(day, workoutType, uniqueExerciseIdentifier, roundIndex, value);
  };


  const renderExercises = (workoutType: 'morningGym' | 'eveningHome', exercises: WorkoutDay['morningGym'] | WorkoutDay['eveningHome'], icon: React.ReactNode) => {
    if (!exercises || Object.keys(exercises).length === 0) return null;

    const title = workoutType === 'morningGym' ? "Morning Gym" : "Evening Home Dumbbells";
    const workoutTypeReps = reps?.[workoutType] || {}; // Reps for this specific workout type (morning/evening)

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
              // Prepare the reps data specifically for this ExerciseCard
              // Include reps for all unique identifiers starting with the baseIdentifier
              const relevantReps: RepsState[string][string] = {};
              for (const uniqueId in workoutTypeReps) {
                if (uniqueId.startsWith(baseIdentifier)) {
                  relevantReps[uniqueId] = workoutTypeReps[uniqueId];
                }
              }

              return(
                 <ExerciseCard
                    key={baseIdentifier} // Use the base identifier for React list key
                    baseIdentifier={baseIdentifier} // Pass the base identifier
                    exercise={exercise}
                    repsData={relevantReps} // Pass the filtered reps data
                    onRepChange={(uniqueExerciseIdentifier, roundIndex, value) => handleExerciseRepChange(uniqueExerciseIdentifier, roundIndex, value, workoutType)}
                    isSuperset={baseIdentifier.startsWith('superset')}
                  />
              )
          })}
          {plan.optionalFinisher && workoutType === 'morningGym' && (
             <ExerciseCard
                baseIdentifier="optionalFinisher"
                exercise={plan.optionalFinisher}
                // Pass only the reps for the optional finisher
                repsData={{ optionalFinisher: workoutTypeReps?.optionalFinisher || {} }}
                onRepChange={(uniqueExerciseIdentifier, roundIndex, value) => handleExerciseRepChange(uniqueExerciseIdentifier, roundIndex, value, workoutType)}
                isOptional={true}
              />
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCardio = (cardio: WorkoutDay['cardio'], icon: React.ReactNode) => {
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

   const renderRecovery = (recovery: WorkoutDay['recovery'], icon: React.ReactNode) => {
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
