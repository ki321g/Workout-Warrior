"use client";

import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExerciseCard } from '@/components/exercise-card';
import type { WorkoutDay } from '@/lib/workout-data';
import { Sun, Moon, Heart, Dumbbell, Repeat } from 'lucide-react';

export interface RepsState {
  [day: string]: {
    [workoutType: string]: { // 'morningGym', 'eveningHome'
      [exerciseKey: string]: { // e.g., 'supersetA_0', 'bicepCurls'
        [roundIndex: number]: number | string; // Store reps per round
      };
    };
  };
}


interface DayWorkoutProps {
  day: string;
  plan: WorkoutDay | undefined;
  reps: RepsState[string];
   onRepChange: (day: string, workoutType: string, exerciseKey: string, roundIndex: number, value: number | string) => void;
}

export function DayWorkout({ day, plan, reps, onRepChange }: DayWorkoutProps) {
  if (!plan) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-center">No workout planned for {day}.</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const renderExercises = (workoutType: 'morningGym' | 'eveningHome', exercises: WorkoutDay['morningGym'] | WorkoutDay['eveningHome'], icon: React.ReactNode) => {
    if (!exercises || Object.keys(exercises).length === 0) return null;

     // Determine title based on workout type
    const title = workoutType === 'morningGym' ? "Morning Gym" : "Evening Home Dumbbells";

    return (
      <Card className="mb-6 shadow-md">
        <CardHeader className="bg-secondary rounded-t-lg">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {Object.entries(exercises).map(([key, exercise], index) => {
              const exerciseKey = `${key}`;
              return(
                 <ExerciseCard
                    key={exerciseKey}
                    exerciseKey={exerciseKey}
                    exercise={exercise}
                    reps={reps?.[workoutType]?.[exerciseKey] || {}}
                    onRepChange={(roundIndex, value) => onRepChange(day, workoutType, exerciseKey, roundIndex, value)}
                    isSuperset={key.startsWith('superset')}
                  />
              )
          })}
          {plan.optionalFinisher && workoutType === 'morningGym' && (
             <ExerciseCard
                exerciseKey="optionalFinisher"
                exercise={plan.optionalFinisher}
                reps={reps?.morningGym?.optionalFinisher || {}}
                onRepChange={(roundIndex, value) => onRepChange(day, 'morningGym', 'optionalFinisher', roundIndex, value)}
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
        <CardHeader className="bg-accent/20 rounded-t-lg">
          <CardTitle className="text-xl font-semibold flex items-center gap-2 text-accent-foreground">
            {icon}
            Cardio
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-muted-foreground">{cardio}</p>
        </CardContent>
      </Card>
    );
  };

   const renderRecovery = (recovery: WorkoutDay['recovery'], icon: React.ReactNode) => {
    if (!recovery) return null;
    return (
      <Card className="mb-6 shadow-md">
        <CardHeader className="bg-primary/10 rounded-t-lg">
          <CardTitle className="text-xl font-semibold flex items-center gap-2 text-primary">
             {icon}
            Active Recovery / Optional
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {recovery.split('\n').map((line, i) => (
            <p key={i} className="text-muted-foreground">{line.trim()}</p>
          ))}
        </CardContent>
      </Card>
    );
  };


  return (
    <div className="space-y-6">
       {renderExercises( 'morningGym', plan.morningGym, <Sun className="text-yellow-500" />)}
       {renderExercises('eveningHome', plan.eveningHome, <Moon className="text-blue-400" />)}
       {renderCardio(plan.cardio, <Heart className="text-red-500" />)}
       {renderRecovery(plan.recovery, <Repeat className="text-green-500" />)}

       {plan.restDay && (
         <Card className="shadow-md bg-green-50 dark:bg-green-900/30">
           <CardHeader>
             <CardTitle className="text-xl font-semibold text-center text-green-700 dark:text-green-400">
               Rest Day
             </CardTitle>
           </CardHeader>
           <CardContent>
             <p className="text-center text-muted-foreground">Take a well-deserved break!</p>
           </CardContent>
         </Card>
       )}
    </div>
  );
}
