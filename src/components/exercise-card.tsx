
 "use client";

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // Import Button
import { cn } from '@/lib/utils';
import type { Exercise, Superset } from '@/lib/workout-data';
import { Dumbbell, CheckCircle, AlertCircle, Info, Minus, Plus } from 'lucide-react'; // Import Minus and Plus

interface ExerciseCardProps {
  exerciseIdentifier: string; // Base identifier (e.g., 'supersetA', 'bicepCurls')
  exercise: Exercise | Superset;
  reps: { [roundIndex: number]: number | string }; // Reps for this specific exerciseIdentifier
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
    // Allow 0 as a valid input, but treat non-numeric as neutral
    if (isNaN(completed) && completedReps !== '') return 'neutral';
     if (isNaN(completed)) return 'neutral'; // Treat NaN as neutral if it wasn't an empty string initially


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


export function ExerciseCard({ exerciseIdentifier, exercise, reps, onRepChange, isSuperset = false, isOptional = false }: ExerciseCardProps) {
  const rounds = (exercise as Superset).rounds || (exercise as Exercise).rounds || 1; // Default to 1 round

  const handleIncrement = (uniqueId: string, roundIndex: number) => {
    const currentValue = reps?.[roundIndex] ?? 0;
    const numericValue = Number(currentValue) || 0; // Default to 0 if not a number
    onRepChange(uniqueId, roundIndex, numericValue + 1);
  };

  const handleDecrement = (uniqueId: string, roundIndex: number) => {
    const currentValue = reps?.[roundIndex] ?? 0;
    const numericValue = Number(currentValue) || 0; // Default to 0 if not a number
    onRepChange(uniqueId, roundIndex, Math.max(0, numericValue - 1)); // Ensure reps don't go below 0
  };

   const handleInputChange = (uniqueId: string, roundIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    // Allow empty string or positive integers
    if (value === '' || /^\d+$/.test(value)) {
       onRepChange(uniqueId, roundIndex, value);
    }
   };


  // Generates a unique identifier for an exercise within a superset or a standalone exercise
  const getUniqueExerciseIdentifier = (baseIdentifier: string, indexSuffix: string = ''): string => {
      return `${baseIdentifier}${indexSuffix}`;
  };


  const renderSingleExercise = (ex: Exercise, indexSuffix: string = '', roundIndexOffset: number = 0) => {
    const suggestedRepsStr = ex.reps;
    // Create a unique identifier for *this specific exercise* instance
    const uniqueId = getUniqueExerciseIdentifier(exerciseIdentifier, indexSuffix);
    const IconComponent = ex.icon || Dumbbell; // Get the component type or default

     // Simple mapping for image names - enhance this as needed
    const imageName = ex.name.toLowerCase().replace(/ /g, '-').replace(/[()]/g, ''); // e.g., barbell-back-squat
    const imageUrl = `/images/exercises/${imageName}.gif`; // Assuming GIFs in public/images/exercises

    return (
      <div key={uniqueId} className="mb-4 last:mb-0">
         <div className="flex items-center justify-between mb-2 flex-wrap gap-y-1">
            <Label htmlFor={`${uniqueId}-round-0`} className="font-medium flex items-center gap-1 text-sm sm:text-base">
                 <IconComponent className="h-4 w-4 text-primary" />
                 {ex.name}
            </Label>
            {suggestedRepsStr && <Badge variant="secondary" className="text-xs sm:text-sm">{suggestedRepsStr}</Badge>}
        </div>

        {/* Exercise Image - Centered */}
         <div className="my-2 flex justify-center">
            <Image
              src={imageUrl}
              alt={`${ex.name} illustration`}
              width={100} // Reduced size slightly for mobile
              height={100}
              className="rounded-md object-contain"
               onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} // Hide if image fails to load
               unoptimized // Avoid Next.js optimization for local GIFs if needed
            />
          </div>

        {/* Responsive grid for rounds */}
        <div className={cn(
             "grid gap-3",
             rounds <= 2 ? 'grid-cols-1 sm:grid-cols-2' : '', // 1 col on mobile, 2 on sm+ for 1-2 rounds
             rounds === 3 ? 'grid-cols-1 sm:grid-cols-3' : '', // 1 col on mobile, 3 on sm+ for 3 rounds
             rounds >= 4 ? 'grid-cols-2 sm:grid-cols-4' : '' // 2 cols on mobile, 4 on sm+ for 4+ rounds
             )}>
          {[...Array((ex.rounds || rounds))].map((_, i) => {
            const roundIndex = i + roundIndexOffset;
            // Use the reps state passed down for this uniqueId
            const completedReps = reps?.[roundIndex] ?? '';
            const status = getRepStatus(completedReps, suggestedRepsStr);

            return (
              <div key={`${uniqueId}-round-${roundIndex}`} className="space-y-1 relative">
                 <Label htmlFor={`${uniqueId}-round-${roundIndex}`} className="text-xs text-muted-foreground block text-center mb-1">
                  Round {roundIndex + 1}
                </Label>
                {/* Flex container for buttons and input */}
                <div className="flex items-center gap-1">
                   <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0" // Make buttons smaller
                    onClick={() => handleDecrement(uniqueId, roundIndex)}
                    aria-label={`Decrease reps for round ${roundIndex + 1}`}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                   <Input
                    id={`${uniqueId}-round-${roundIndex}`}
                    type="text" // Use text to allow empty string
                     inputMode="numeric" // Hint for numeric keyboard on mobile
                     pattern="[0-9]*" // Pattern for numeric input
                    placeholder="Reps"
                    value={completedReps}
                    // onChange={(e) => onRepChange(uniqueId, roundIndex, e.target.value)} // Pass uniqueId
                    onChange={(e) => handleInputChange(uniqueId, roundIndex, e)}
                    className={cn(
                      "w-full text-center h-9 px-1 text-base", // Adjust padding and text size
                      status === 'met' && 'border-green-500 focus-visible:ring-green-500',
                      status === 'below' && completedReps !== '' && 'border-orange-500 focus-visible:ring-orange-500',
                       status === 'above' && 'border-blue-500 focus-visible:ring-blue-500',
                       // Remove number input spinners
                        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    )}
                    // min="0" // Remove min attribute when type is text
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0" // Make buttons smaller
                    onClick={() => handleIncrement(uniqueId, roundIndex)}
                     aria-label={`Increase reps for round ${roundIndex + 1}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                   {/* Status Icons - Positioned relative to the input container */}
                   <div className="absolute right-10 top-[26px] transform -translate-y-1/2 flex items-center pointer-events-none">
                       {status === 'met' && <CheckCircle className="h-4 w-4 text-green-500" />}
                       {status === 'below' && completedReps !== '' && <AlertCircle className="h-4 w-4 text-orange-500" />}
                       {/* {status === 'above' && <ArrowUpCircle className="h-4 w-4 text-blue-500" />} */}
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
                 <span>Superset {(exerciseIdentifier.match(/[A-Z]/) || [])[0]}</span>
                 {isOptional && <Badge variant="outline" className="ml-auto text-xs">Optional</Badge>}
            </CardTitle>
         )}
          {!isSuperset && !isOptional && (
             <CardTitle className="text-base sm:text-lg font-semibold flex items-center justify-between gap-2">
                  <span>{(exercise as Exercise).name}</span>
                  {isOptional && <Badge variant="outline" className="ml-auto text-xs">Optional</Badge>}
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
           // For non-supersets, the exerciseIdentifier is already unique
          renderSingleExercise(exercise as Exercise)
        )}
      </CardContent>
    </Card>
  );
}
