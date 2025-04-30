 "use client";

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Exercise, Superset } from '@/lib/workout-data';
import { Dumbbell, CheckCircle, AlertCircle, Info, Minus, Plus } from 'lucide-react';
import type { RepsState } from './day-workout'; // Import RepsState type

interface ExerciseCardProps {
  baseIdentifier: string; // Base identifier (e.g., 'supersetA', 'bicepCurls')
  exercise: Exercise | Superset;
  // Receives reps data for potentially multiple unique IDs (e.g., supersetA_0, supersetA_1)
  repsData: RepsState[string][string];
  // Callback now passes the *unique* identifier for the specific exercise being changed
  onRepChange: (uniqueExerciseIdentifier: string, roundIndex: number, value: number | string) => void;
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

    // Handle range like "8–10 reps" or "8-10 reps"
    const rangeMatch = repsString.match(/(\d+)\s*[-–]\s*(\d+)/);
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
    if (isNaN(completed)) return 'neutral'; // Treat non-numeric as neutral

    const suggestedRange = parseSuggestedReps(suggestedReps);
    if (!suggestedRange) return 'neutral'; // Cannot determine target

    // If completed is 0 and the minimum target is > 0, treat as 'below'
    // Otherwise, 0 is considered neutral unless the range specifically includes 0 (which is unlikely for reps)
    if (completed === 0 && suggestedRange.min > 0) {
        return 'below';
    }
     if (completed === 0) {
        return 'neutral'; // If target is 0 or could not parse range correctly, 0 is neutral
    }


    if (completed >= suggestedRange.min && completed <= suggestedRange.max) {
        return 'met';
    } else if (completed < suggestedRange.min) {
        return 'below';
    } else {
        return 'above';
    }
};


export function ExerciseCard({ baseIdentifier, exercise, repsData, onRepChange, isSuperset = false, isOptional = false }: ExerciseCardProps) {
  const rounds = (exercise as Superset).rounds || (exercise as Exercise).rounds || 1; // Default to 1 round

  const handleIncrement = (uniqueId: string, roundIndex: number) => {
     // Access the correct reps state using the uniqueId
    const currentValue = repsData?.[uniqueId]?.[roundIndex] ?? 0;
    const numericValue = Number(currentValue) || 0;
    onRepChange(uniqueId, roundIndex, numericValue + 1);
  };

  const handleDecrement = (uniqueId: string, roundIndex: number) => {
     // Access the correct reps state using the uniqueId
    const currentValue = repsData?.[uniqueId]?.[roundIndex] ?? 0;
    const numericValue = Number(currentValue) || 0;
    onRepChange(uniqueId, roundIndex, Math.max(0, numericValue - 1));
  };

   const handleInputChange = (uniqueId: string, roundIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    // Allow empty string or only digits
    if (value === '' || /^\d+$/.test(value)) {
       onRepChange(uniqueId, roundIndex, value);
    }
   };


  // Generates a unique identifier for an exercise within a superset or a standalone exercise
  const getUniqueExerciseIdentifier = (baseId: string, indexSuffix: string = ''): string => {
      return `${baseId}${indexSuffix}`;
  };


  const renderSingleExercise = (ex: Exercise, indexSuffix: string = '', roundIndexOffset: number = 0) => {
    const suggestedRepsStr = ex.reps;
    const uniqueId = getUniqueExerciseIdentifier(baseIdentifier, indexSuffix);
    const IconComponent = ex.icon || Dumbbell;
    const imageName = ex.name.toLowerCase().replace(/ /g, '-').replace(/[()]/g, '');
    const imageUrl = `/images/exercises/${imageName}.gif`;

    return (
      <div key={uniqueId} className="mb-4 last:mb-0">
         <div className="flex items-center justify-between mb-2 flex-wrap gap-y-1">
            <Label htmlFor={`${uniqueId}-round-0`} className="font-medium flex items-center gap-1 text-sm sm:text-base">
                 <IconComponent className="h-4 w-4 text-primary" />
                 {ex.name}
            </Label>
            {suggestedRepsStr && <Badge variant="secondary" className="text-xs sm:text-sm">{suggestedRepsStr}</Badge>}
        </div>

         <div className="my-2 flex justify-center">
            <Image
              src={imageUrl}
              alt={`${ex.name} illustration`}
              width={100}
              height={100}
              className="rounded-md object-contain"
               // Hide the image element if it fails to load (e.g., 404 Not Found)
               onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
               unoptimized // Add unoptimized for GIFs
            />
          </div>

        <div className={cn(
             "grid gap-3",
             rounds <= 2 ? 'grid-cols-1 sm:grid-cols-2' : '',
             rounds === 3 ? 'grid-cols-1 sm:grid-cols-3' : '',
             rounds >= 4 ? 'grid-cols-2 sm:grid-cols-4' : ''
             )}>
          {[...Array((ex.rounds || rounds))].map((_, i) => {
            const roundIndex = i + roundIndexOffset;
            // Access the reps state for this specific uniqueId and roundIndex
            const completedReps = repsData?.[uniqueId]?.[roundIndex] ?? '';
            const status = getRepStatus(completedReps, suggestedRepsStr);

            return (
              <div key={`${uniqueId}-round-${roundIndex}`} className="space-y-1 relative">
                 <Label htmlFor={`${uniqueId}-round-${roundIndex}`} className="text-xs text-muted-foreground block text-center mb-1">
                  Round {roundIndex + 1}
                </Label>
                <div className="flex items-center gap-1">
                   <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={() => handleDecrement(uniqueId, roundIndex)}
                    aria-label={`Decrease reps for round ${roundIndex + 1}`}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                   <Input
                    id={`${uniqueId}-round-${roundIndex}`}
                    type="text" // Changed from number to text to allow empty string and better control
                     inputMode="numeric" // Helps mobile keyboards show numeric pad
                     pattern="[0-9]*" // HTML5 pattern validation
                    placeholder="Reps"
                    value={completedReps}
                    onChange={(e) => handleInputChange(uniqueId, roundIndex, e)} // Added onChange handler
                    className={cn(
                      "w-full text-center h-9 px-1 text-base",
                      status === 'met' && 'border-green-500 focus-visible:ring-green-500',
                      // Show orange border only if below target AND not empty/0
                      status === 'below' && completedReps !== '' && completedReps !== 0 && 'border-orange-500 focus-visible:ring-orange-500',
                      status === 'above' && 'border-blue-500 focus-visible:ring-blue-500',
                      // Hide browser default number input spinners
                      "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    )}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={() => handleIncrement(uniqueId, roundIndex)}
                     aria-label={`Increase reps for round ${roundIndex + 1}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                   {/* Adjust icon position if needed based on input changes */}
                   <div className="absolute right-10 top-[26px] transform -translate-y-1/2 flex items-center pointer-events-none">
                       {status === 'met' && <CheckCircle className="h-4 w-4 text-green-500" />}
                       {/* Show warning icon only if below target AND not empty/0 */}
                       {status === 'below' && completedReps !== '' && completedReps !== 0 && <AlertCircle className="h-4 w-4 text-orange-500" />}
                   </div>
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
       <CardHeader className={cn("pb-2 pt-3 sm:pt-4 px-4 sm:px-6", isSuperset && "bg-primary/10 rounded-t-lg", isOptional && "bg-accent/10 rounded-t-lg")}>
         {isSuperset && (
             <CardTitle className="text-base sm:text-lg font-semibold flex items-center justify-between gap-2">
                 <span>Superset {(baseIdentifier.match(/[A-Z]/) || [])[0]}</span>
                 {isOptional && <Badge variant="outline" className="ml-auto text-xs">Optional</Badge>}
            </CardTitle>
         )}
          {!isSuperset && !isOptional && exercise && 'name' in exercise && (
             <CardTitle className="text-base sm:text-lg font-semibold flex items-center justify-between gap-2">
                  <span>{(exercise as Exercise).name}</span>
                  {/* Optional badge is handled below for non-superset optional */}
             </CardTitle>
           )}
          {isOptional && !isSuperset && (
             <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2 text-accent-foreground">
                 <Info className="h-4 w-4"/> Optional Finisher
             </CardTitle>
           )}
         {isSuperset && <CardDescription className="text-xs sm:text-sm">{rounds} Rounds</CardDescription>}
         {!isSuperset && (exercise as Exercise).rounds && (exercise as Exercise).rounds! > 1 && !isOptional && <CardDescription className="text-xs sm:text-sm">{rounds} Rounds</CardDescription>}
       </CardHeader>
       <CardContent className="pt-2 px-2 sm:px-6">
        {isSuperset ? (
          (exercise as Superset).exercises.map((ex, idx) => renderSingleExercise(ex, `_${idx}`))
        ) : (
          renderSingleExercise(exercise as Exercise)
        )}
      </CardContent>
    </Card>
  );
}
