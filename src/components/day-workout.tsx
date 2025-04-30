
"use client";

import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExerciseCard } from '@/components/exercise-card';
import type { WorkoutDay } from '@/lib/workout-data';
import { Sun, Moon, Heart, Repeat } from 'lucide-react';

// Updated RepsState to use a unique exercise identifier as the key
export interface RepsState {
  [day: string]: {
    [workoutType: string]: { // 'morningGym', 'eveningHome'
      [exerciseIdentifier: string]: { // Unique key like 'supersetA_0', 'bicepCurls', 'optionalFinisher'
        [roundIndex: number]: number | string; // Store reps per round
      };
    };
  };
}


interface DayWorkoutProps {
  day: string;
  plan: WorkoutDay | undefined;
  reps: RepsState[string];
  // Updated onRepChange to accept the unique exercise identifier
   onRepChange: (day: string, workoutType: string, exerciseIdentifier: string, roundIndex: number, value: number | string) => void;
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

  const handleExerciseRepChange = (exerciseIdentifier: string, roundIndex: number, value: number | string, workoutType: 'morningGym' | 'eveningHome') => {
     onRepChange(day, workoutType, exerciseIdentifier, roundIndex, value);
  };


  const renderExercises = (workoutType: 'morningGym' | 'eveningHome', exercises: WorkoutDay['morningGym'] | WorkoutDay['eveningHome'], icon: React.ReactNode) => {
    if (!exercises || Object.keys(exercises).length === 0) return null;

     // Determine title based on workout type
    const title = workoutType === 'morningGym' ? "Morning Gym" : "Evening Home Dumbbells";

    return (
      <Card className="mb-6 shadow-md">
        <CardHeader className="bg-secondary rounded-t-lg py-3 sm:py-4 px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 px-2 sm:px-6 space-y-4">
          {Object.entries(exercises).map(([key, exercise]) => {
              // The key here is like 'supersetA', 'bicepCurls' etc.
              // ExerciseCard will handle generating more specific keys internally if needed (for supersets)
              return(
                 <ExerciseCard
                    key={key} // Keep the original key for React list rendering
                    exerciseIdentifier={key} // Pass the base identifier
                    exercise={exercise}
                    // Pass the reps specific to this exercise/superset identifier
                    reps={reps?.[workoutType]?.[key] || {}}
                    onRepChange={(subExerciseIdentifier, roundIndex, value) => handleExerciseRepChange(subExerciseIdentifier, roundIndex, value, workoutType)}
                    isSuperset={key.startsWith('superset')}
                  />
              )
          })}
          {plan.optionalFinisher && workoutType === 'morningGym' && (
             <ExerciseCard
                exerciseIdentifier="optionalFinisher"
                exercise={plan.optionalFinisher}
                reps={reps?.morningGym?.optionalFinisher || {}}
                 onRepChange={(subExerciseIdentifier, roundIndex, value) => handleExerciseRepChange(subExerciseIdentifier, roundIndex, value, workoutType)}
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
