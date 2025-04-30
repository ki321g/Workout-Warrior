 "use client";

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Exercise, Superset } from '@/lib/workout-data';
import { Dumbbell, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface ExerciseCardProps {
  exerciseKey: string;
  exercise: Exercise | Superset;
  reps: { [roundIndex: number]: number | string };
  onRepChange: (roundIndex: number, value: number | string) => void;
  isSuperset?: boolean;
  isOptional?: boolean;
}


// Helper to parse suggested reps string (e.g., "8-10 reps", "10 reps", "3x12")
const parseSuggestedReps = (repsString?: string): { min: number; max: number } | null => {
    if (!repsString) return null;

    // Handle format like "3x12" or "3x 30 seconds"
    const setsMatch = repsString.match(/(\d+)\s*x\s*(\d+)/);
    if (setsMatch) {
        const repCount = parseInt(setsMatch[2], 10);
        return { min: repCount, max: repCount };
    }

    // Handle range like "8-10 reps"
    const rangeMatch = repsString.match(/(\d+)\s*–\s*(\d+)/) || repsString.match(/(\d+)-(\d+)/);
    if (rangeMatch) {
        return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };
    }

    // Handle single number like "10 reps"
    const singleMatch = repsString.match(/(\d+)/);
    if (singleMatch) {
        const repCount = parseInt(singleMatch[1], 10);
        return { min: repCount, max: repCount };
    }

    return null; // Could not parse
};


const getRepStatus = (completedReps: number | string, suggestedReps?: string): 'met' | 'below' | 'above' | 'neutral' => {
    if (completedReps === '' || completedReps === null || completedReps === undefined) {
        return 'neutral'; // No input yet
    }

    const completed = Number(completedReps);
    if (isNaN(completed)) return 'neutral'; // Invalid input

    const suggestedRange = parseSuggestedReps(suggestedReps);
    if (!suggestedRange) return 'neutral'; // Cannot determine target

    if (completed >= suggestedRange.min && completed <= suggestedRange.max) {
        return 'met';
    } else if (completed < suggestedRange.min) {
        return 'below';
    } else {
        return 'above';
    }
};


export function ExerciseCard({ exerciseKey, exercise, reps, onRepChange, isSuperset = false, isOptional = false }: ExerciseCardProps) {
  const rounds = (exercise as Superset).rounds || (exercise as Exercise).rounds || 1; // Default to 1 round


  const renderSingleExercise = (ex: Exercise, keySuffix: string = '', roundIndexOffset: number = 0) => {
    const suggestedRepsStr = ex.reps;
    const baseKey = `${exerciseKey}${keySuffix}`;
    const IconComponent = ex.icon || Dumbbell; // Get the component type or default

     // Simple mapping for image names - enhance this as needed
    const imageName = ex.name.toLowerCase().replace(/ /g, '-').replace(/[()]/g, ''); // e.g., barbell-back-squat
    const imageUrl = `/images/exercises/${imageName}.gif`; // Assuming GIFs in public/images/exercises

    return (
      <div key={baseKey} className="mb-4 last:mb-0">
         <div className="flex items-center justify-between mb-2">
            <Label htmlFor={`${baseKey}-round-0`} className="font-medium flex items-center gap-1">
                 <IconComponent className="h-4 w-4 text-primary" /> {/* Render the icon component */}
                 {ex.name}
            </Label>
            {suggestedRepsStr && <Badge variant="secondary">{suggestedRepsStr}</Badge>}
        </div>

        {/* Exercise Image */}
         <div className="my-2 flex justify-center">
            <Image
              src={imageUrl}
              alt={`${ex.name} illustration`}
              width={150}
              height={150}
              className="rounded-md object-contain"
               onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} // Hide if image fails to load
               unoptimized // Avoid Next.js optimization for local GIFs if needed
            />
          </div>

        <div className={cn("grid gap-3", rounds > 1 ? `grid-cols-${Math.min(rounds, 4)}` : 'grid-cols-1')}>
          {[...Array((ex.rounds || (isSuperset ? 1 : rounds)))].map((_, i) => { // Use ex.rounds if available, otherwise use superset/exercise rounds
            const roundIndex = i + roundIndexOffset;
            const completedReps = reps?.[roundIndex] ?? '';
            const status = getRepStatus(completedReps, suggestedRepsStr);

            return (
              <div key={`${baseKey}-round-${roundIndex}`} className="space-y-1 relative">
                <Label htmlFor={`${baseKey}-round-${roundIndex}`} className="text-xs text-muted-foreground">
                  Round {roundIndex + 1}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`${baseKey}-round-${roundIndex}`}
                    type="number"
                    placeholder="Reps"
                    value={completedReps}
                    onChange={(e) => onRepChange(roundIndex, e.target.value)}
                    className={cn(
                      "w-full text-center h-9",
                      status === 'met' && 'border-green-500 focus-visible:ring-green-500',
                      status === 'below' && 'border-orange-500 focus-visible:ring-orange-500',
                      status === 'above' && 'border-blue-500 focus-visible:ring-blue-500' // Or maybe purple for above?
                    )}
                    min="0"
                  />
                  {status === 'met' && <CheckCircle className="h-5 w-5 text-green-500 absolute right-2 top-6" />}
                   {status === 'below' && completedReps !== '' && <AlertCircle className="h-5 w-5 text-orange-500 absolute right-2 top-6" />}
                   {/* Optionally add an indicator for 'above' */}
                   {/* {status === 'above' && <ArrowUpCircle className="h-5 w-5 text-blue-500 absolute right-2 top-6" />} */}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className={cn("bg-card/50", isOptional && "border-dashed border-accent")}>
      <CardHeader className={cn("pb-2", isSuperset && "bg-primary/10 rounded-t-lg", isOptional && "bg-accent/10 rounded-t-lg")}>
         {isSuperset && (
             <CardTitle className="text-lg font-semibold flex items-center gap-2">
                 Superset {(exerciseKey.match(/[A-Z]/) || [])[0]}
                 {isOptional && <Badge variant="outline" className="ml-auto">Optional</Badge>}
            </CardTitle>
         )}
          {!isSuperset && !isOptional && (
             <CardTitle className="text-lg font-semibold flex items-center gap-2">
                 {(exercise as Exercise).name}
                 {isOptional && <Badge variant="outline" className="ml-auto">Optional</Badge>}
            </CardTitle>
          )}
          {isOptional && !isSuperset && (
             <CardTitle className="text-lg font-semibold flex items-center gap-2 text-accent-foreground">
                 <Info className="h-4 w-4"/> Optional Finisher
             </CardTitle>
           )}
        {isSuperset && <CardDescription>{(exercise as Superset).rounds} Rounds</CardDescription>}
         {!isSuperset && (exercise as Exercise).rounds && (exercise as Exercise).rounds! > 1 && !isOptional && <CardDescription>{(exercise as Exercise).rounds} Rounds</CardDescription>}
      </CardHeader>
      <CardContent className="pt-2">
        {isSuperset ? (
          (exercise as Superset).exercises.map((ex, idx) => renderSingleExercise(ex, `_${idx}`))
        ) : (
          renderSingleExercise(exercise as Exercise)
        )}
      </CardContent>
    </Card>
  );
}
