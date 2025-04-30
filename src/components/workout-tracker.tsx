'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DayWorkout, type RepsState } from '@/components/day-workout';
import { workoutPlan, type Exercise, type Superset, type WorkoutDayPlan } from '@/lib/workout-data'; // Import WorkoutDayPlan
import { useIsMobile } from '@/hooks/use-mobile';
import { CalendarDays, BarChartBig, Save, Loader2 } from 'lucide-react';
import { saveWorkoutData } from '@/app/actions/saveWorkoutData';
import { loadWorkoutData, type LoadedWorkoutData } from '@/app/actions/loadWorkoutData';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { differenceInDays, format, parseISO, startOfDay, subDays, getDay } from 'date-fns';

const daysOfWeek = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// Helper to parse suggested reps string (e.g., "8-10 reps", "10 reps", "3x12") - Moved here for use in seeding
const parseSuggestedReps = (repsString?: string): { min: number; max: number } | null => {
    if (!repsString) return null;
    const setsMatch = repsString.match(/(\d+)\s*x\s*(\d+)/);
    if (setsMatch) {
        const repCount = parseInt(setsMatch[2], 10);
        return { min: repCount, max: repCount };
    }
    const rangeMatch = repsString.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (rangeMatch) {
        return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };
    }
    const singleMatch = repsString.match(/(\d+)/);
    if (singleMatch) {
        const repCount = parseInt(singleMatch[1], 10);
        return { min: repCount, max: repCount };
    }
    return null; // Could not parse
};


// Helper function to generate a default empty rep state for a given day's plan
function generateDefaultRepsForDay(dayPlan: WorkoutDayPlan | undefined): RepsState[string] {
    const defaultDayReps: RepsState[string] = { morningGym: {}, eveningHome: {} };
    if (!dayPlan) return defaultDayReps;

    const processWorkoutItems = (items: { [key: string]: Exercise | Superset } | undefined, workoutType: 'morningGym' | 'eveningHome') => {
        if (!items) return;
        Object.entries(items).forEach(([baseIdentifier, item]) => {
            const rounds = (item as Superset).rounds || (item as Exercise).rounds || 1;
            if ('exercises' in item) { // Superset
                (item as Superset).exercises.forEach((ex, idx) => {
                    const uniqueId = `${baseIdentifier}_${idx}`;
                    const exRounds = ex.rounds || rounds;
                    defaultDayReps[workoutType]![uniqueId] = {};
                    for (let i = 0; i < exRounds; i++) {
                        defaultDayReps[workoutType]![uniqueId]![i] = '';
                    }
                });
            } else { // Single exercise
                defaultDayReps[workoutType]![baseIdentifier] = {};
                 const exRounds = (item as Exercise).rounds || 1;
                for (let i = 0; i < exRounds; i++) {
                    defaultDayReps[workoutType]![baseIdentifier]![i] = '';
                }
            }
        });
    };

    processWorkoutItems(dayPlan.morningGym, 'morningGym');
    processWorkoutItems(dayPlan.eveningHome, 'eveningHome');
    if (dayPlan.optionalFinisher) {
        const finisherRounds = dayPlan.optionalFinisher.rounds || 1;
        defaultDayReps.morningGym!['optionalFinisher'] = {};
         for (let i = 0; i < finisherRounds; i++) {
            defaultDayReps.morningGym!['optionalFinisher']![i] = '';
        }
    }

    return defaultDayReps;
}

// Helper function to generate sample reps for a given day's plan
function generateSampleRepsForDay(dayPlan: WorkoutDayPlan | undefined): RepsState[string] {
    const sampleDayReps: RepsState[string] = { morningGym: {}, eveningHome: {} };
    if (!dayPlan) return sampleDayReps;

    const processWorkoutItems = (items: { [key: string]: Exercise | Superset } | undefined, workoutType: 'morningGym' | 'eveningHome') => {
        if (!items) return;
        Object.entries(items).forEach(([baseIdentifier, item]) => {
            const rounds = (item as Superset).rounds || (item as Exercise).rounds || 1;
            if ('exercises' in item) { // Superset
                (item as Superset).exercises.forEach((ex, idx) => {
                    const uniqueId = `${baseIdentifier}_${idx}`;
                    const exRounds = ex.rounds || rounds;
                    const suggested = parseSuggestedReps(ex.reps);
                    const sampleRep = suggested ? Math.max(0, suggested.min - Math.floor(Math.random() * 2)) : 8; // Sample rep slightly below min or 8
                    sampleDayReps[workoutType]![uniqueId] = {};
                    for (let i = 0; i < exRounds; i++) {
                        // Introduce some variation per round
                         const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
                         sampleDayReps[workoutType]![uniqueId]![i] = Math.max(0, sampleRep + variation);
                    }
                });
            } else { // Single exercise
                const suggested = parseSuggestedReps((item as Exercise).reps);
                const sampleRep = suggested ? Math.max(0, suggested.min - Math.floor(Math.random() * 2)) : 10;
                sampleDayReps[workoutType]![baseIdentifier] = {};
                const exRounds = (item as Exercise).rounds || 1;
                for (let i = 0; i < exRounds; i++) {
                      const variation = Math.floor(Math.random() * 3) - 1;
                     sampleDayReps[workoutType]![baseIdentifier]![i] = Math.max(0, sampleRep + variation);
                }
            }
        });
    };

    processWorkoutItems(dayPlan.morningGym, 'morningGym');
    processWorkoutItems(dayPlan.eveningHome, 'eveningHome');
    if (dayPlan.optionalFinisher) {
        const finisherRounds = dayPlan.optionalFinisher.rounds || 1;
        const suggested = parseSuggestedReps(dayPlan.optionalFinisher.reps);
        const sampleRep = suggested ? Math.max(0, suggested.min - 1) : 12;
        sampleDayReps.morningGym!['optionalFinisher'] = {};
        for (let i = 0; i < finisherRounds; i++) {
            const variation = Math.floor(Math.random() * 3) - 1;
            sampleDayReps.morningGym!['optionalFinisher']![i] = Math.max(0, sampleRep + variation);
        }
    }

    return sampleDayReps;
}


// Helper function to fill missed days with zeros
async function fillMissedDays(lastRecordedDate: Date | null, today: Date): Promise<boolean> {
    const startOfToday = startOfDay(today);
    if (!lastRecordedDate) {
        console.log("No previous record found, cannot fill missed days.");
        return false; // Indicate nothing was filled
    }

    const startDate = startOfDay(lastRecordedDate);
    const daysDiff = differenceInDays(startOfToday, startDate);

    if (daysDiff <= 1) {
        console.log("No missed days or only yesterday recorded.");
        return false;
    }

    console.log(`Filling missed days between ${format(startDate, 'yyyy-MM-dd')} and ${format(startOfToday, 'yyyy-MM-dd')}`);
    let filledAny = false;

    for (let i = 1; i < daysDiff; i++) { // Start from 1 to skip the last recorded date itself
        const missedDate = subDays(startOfToday, daysDiff - i);
        const missedDateString = format(missedDate, 'yyyy-MM-dd');
        const missedDayIndex = (getDay(missedDate) + 6) % 7; // 0 = Monday, 6 = Sunday
        const missedDayName = daysOfWeek[missedDayIndex];
        const dayPlan = workoutPlan[missedDayName as keyof typeof workoutPlan];

        // Only save zero reps if it's a workout day (not Wed, Sat, Sun unless specified)
        if (!dayPlan || dayPlan.restDay || dayPlan.recovery?.includes('recovery')) {
            console.log(`Skipping fill for recovery/rest day: ${missedDateString}`);
            continue;
        }


        // Generate a rep state with all reps set to 0
        const zeroReps = generateDefaultRepsForDay(dayPlan);
        Object.keys(zeroReps).forEach(workoutType => {
            const type = workoutType as 'morningGym' | 'eveningHome';
             if (zeroReps[type]) {
                Object.keys(zeroReps[type]!).forEach(exerciseId => {
                     if(zeroReps[type]![exerciseId]) {
                        Object.keys(zeroReps[type]![exerciseId]!).forEach(roundIdx => {
                            zeroReps[type]![exerciseId]![parseInt(roundIdx)] = 0; // Set to 0
                        });
                    }
                });
            }
        });

        console.log(`Saving zero reps for missed day: ${missedDateString} (${missedDayName})`);
        await saveWorkoutData(missedDate, missedDayName, zeroReps);
        filledAny = true;
    }
     return filledAny;
}


// Seed sample data for previous days if no records exist
async function seedInitialDataIfNeeded(today: Date): Promise<boolean> {
    console.log("Checking if initial data seeding is needed...");
    const loadedData = await loadWorkoutData();

    if (loadedData && Object.keys(loadedData).length > 0) {
        console.log("Existing data found. No seeding needed.");
        return false; // Data exists, no need to seed
    }

    console.log("No existing data found. Seeding sample data for previous Monday and Tuesday.");

    const todayDayIndex = (getDay(today) + 6) % 7; // 0 = Monday
    let daysToSeed: { dayOfWeek: string, date: Date }[] = [];

    // Find previous Monday
    const daysSinceMonday = (todayDayIndex + 7) % 7; // 0 if today is Mon, 1 if Tue, etc.
    if (daysSinceMonday > 0) { // Only seed if today is not Monday
        const prevMondayDate = subDays(today, daysSinceMonday);
        daysToSeed.push({ dayOfWeek: 'Monday', date: prevMondayDate });
    }


    // Find previous Tuesday
    const daysSinceTuesday = (todayDayIndex - 1 + 7) % 7; // 0 if today is Tue, 1 if Wed, etc.
    if (daysSinceMonday > 1) { // Only seed if today is not Monday or Tuesday
        const prevTuesdayDate = subDays(today, daysSinceTuesday);
         // Ensure we don't seed Tuesday if it's the same day as Monday (e.g., if today is Tuesday)
         if (!daysToSeed.find(d => format(d.date, 'yyyy-MM-dd') === format(prevTuesdayDate, 'yyyy-MM-dd'))) {
             daysToSeed.push({ dayOfWeek: 'Tuesday', date: prevTuesdayDate });
        }
    }


     if (daysToSeed.length === 0) {
        console.log("No previous Monday/Tuesday found in the current week relative to today. Skipping seed.");
        return false;
    }


    for (const { dayOfWeek, date } of daysToSeed) {
        const dayPlan = workoutPlan[dayOfWeek as keyof typeof workoutPlan];
        const sampleReps = generateSampleRepsForDay(dayPlan);
        console.log(`Seeding sample data for ${dayOfWeek} (${format(date, 'yyyy-MM-dd')})`);
        await saveWorkoutData(date, dayOfWeek, sampleReps);
    }

    console.log("Sample data seeding complete.");
    return true; // Data was seeded
}


export function WorkoutTracker() {
  const [reps, setReps] = React.useState<RepsState>({});
  const [activeTab, setActiveTab] = React.useState(daysOfWeek[0]);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [lastSavedTime, setLastSavedTime] = React.useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [loadedDataDate, setLoadedDataDate] = React.useState<string | null>(null); // Track which date's data is loaded

  // Load data on mount
  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const today = new Date();

      // Attempt to seed data if none exists
      const dataWasSeeded = await seedInitialDataIfNeeded(today);

      // Load data (potentially including seeded data)
      let loadedData = await loadWorkoutData();

       // If data was seeded, reload might be needed if load happened before save completed
       // A small delay might help, but ideally, load happens after potential seed finishes.
       // For simplicity here, assume loadWorkoutData gets the latest, including seeded.


      const todayDateString = format(today, 'yyyy-MM-dd');
      const todayDayIndex = (getDay(today) + 6) % 7;
      const currentDayOfWeek = daysOfWeek[todayDayIndex];

      let initialReps: RepsState = {};
      let lastRecordDate: Date | null = null;
      let filledMissed = false;

      if (loadedData && Object.keys(loadedData).length > 0) {
         const sortedDates = Object.keys(loadedData).sort().reverse();
         if(sortedDates.length > 0) {
            lastRecordDate = parseISO(sortedDates[0]);
         }

        // Fill missed days based on the last recorded date BEFORE processing today
        filledMissed = await fillMissedDays(lastRecordDate, today);

        // If missed days were filled, reload data to include the new 'zero' entries
        if (filledMissed) {
            loadedData = await loadWorkoutData();
            if (loadedData) {
                 const sortedDatesAfterFill = Object.keys(loadedData).sort().reverse();
                 if(sortedDatesAfterFill.length > 0) {
                     // Update lastRecordDate if necessary (though likely won't change unless fill went past 'today')
                     lastRecordDate = parseISO(sortedDatesAfterFill[0]);
                 }
            } else {
                // Handle case where reload failed, maybe revert?
                console.error("Failed to reload data after filling missed days.");
                lastRecordDate = parseISO(sortedDates[0]); // Keep original last date
            }
        }

         // Restore state for the current day being viewed (today initially)
         if (loadedData && loadedData[todayDateString]) {
            initialReps[currentDayOfWeek] = loadedData[todayDateString].reps;
            setLoadedDataDate(todayDateString);
             setLastSavedTime(loadedData[todayDateString].lastUpdatedAt);
             console.log(`Loaded data for today: ${todayDateString}`);
        } else {
             console.log(`No record found for today (${todayDateString}). Generating default reps.`);
             initialReps[currentDayOfWeek] = generateDefaultRepsForDay(workoutPlan[currentDayOfWeek as keyof typeof workoutPlan]);
             setLoadedDataDate(null);
             setLastSavedTime(null);
        }

      } else {
          console.log("No data loaded from Firestore (even after potential seed). Generating default reps for today.");
          initialReps[currentDayOfWeek] = generateDefaultRepsForDay(workoutPlan[currentDayOfWeek as keyof typeof workoutPlan]);
          setLoadedDataDate(null);
          setLastSavedTime(null);
      }


      // Initialize reps state for all days for the UI tabs
      // This part doesn't load historical data into the UI state, only sets up the structure
      // We only actively load the data for the *current day* into the `reps` state slice being used by DayWorkout
      daysOfWeek.forEach(day => {
          if (!initialReps[day]) { // If today wasn't this day, initialize it
              initialReps[day] = generateDefaultRepsForDay(workoutPlan[day as keyof typeof workoutPlan]);
          }
      });

      setReps(initialReps);
      setActiveTab(currentDayOfWeek); // Set the active tab to the current day
      setIsLoading(false);
       setHasUnsavedChanges(false); // Reset unsaved changes after loading
    };

    fetchData();
  }, []); // Empty dependency array ensures this runs only once on mount


  // Debounced save function
  const debouncedSave = React.useCallback(() => {
     if (saveTimeoutRef.current) {
       clearTimeout(saveTimeoutRef.current);
     }
     saveTimeoutRef.current = setTimeout(async () => {
        if (!hasUnsavedChanges) return; // Don't save if nothing changed

       setIsSaving(true);
       const currentDayOfWeek = activeTab; // Save data for the day currently being viewed/edited
        const today = new Date(); // Always save with today's date
        const dayRepsToSave = reps[currentDayOfWeek];

       if (!dayRepsToSave) {
            console.warn("No reps data found for the current day:", currentDayOfWeek);
            setIsSaving(false);
            return;
        }


       const result = await saveWorkoutData(today, currentDayOfWeek, dayRepsToSave);
       setIsSaving(false);

       if (result.success) {
         setLastSavedTime(new Date());
         setHasUnsavedChanges(false);
         // Optional: Subtle feedback for auto-save?
       } else {
         toast({
           title: 'Auto-Save Failed',
           description: result.error || 'Could not automatically save workout data.',
           variant: 'destructive',
         });
       }
     }, 1500);
   }, [reps, activeTab, toast, hasUnsavedChanges]);

  const handleRepChange = (day: string, workoutType: string, exerciseIdentifier: string, roundIndex: number, value: number | string) => {
    const numericValue = value === '' ? '' : Number(value);

    setReps((prevReps) => {
       const newReps = JSON.parse(JSON.stringify(prevReps));
        if (!newReps[day]) newReps[day] = { morningGym: {}, eveningHome: {} };
        if (!newReps[day][workoutType]) newReps[day][workoutType] = {};
        if (!newReps[day][workoutType][exerciseIdentifier]) newReps[day][workoutType][exerciseIdentifier] = {};

      newReps[day][workoutType][exerciseIdentifier][roundIndex] = numericValue;

      // Check if the change actually altered the data compared to the loaded state for today
      // This is complex if loading historical data. Assuming we only edit "today's" record for now.
      setHasUnsavedChanges(true);
       debouncedSave();
      return newReps;
    });
  };

  // Manual Save Function
   const handleManualSave = async () => {
       if (saveTimeoutRef.current) {
           clearTimeout(saveTimeoutRef.current);
       }
       if (!hasUnsavedChanges) {
           toast({ title: 'No Changes', description: 'Nothing new to save.' });
           return;
       }

       setIsSaving(true);
       const currentDayOfWeek = activeTab;
       const today = new Date(); // Save associated with today's date
       const dayRepsToSave = reps[currentDayOfWeek];


       if (!dayRepsToSave) {
            toast({ title: 'Save Error', description: 'No workout data found for the current day.', variant: 'destructive' });
            setIsSaving(false);
            return;
        }

       const result = await saveWorkoutData(today, currentDayOfWeek, dayRepsToSave);
       setIsSaving(false);

       if (result.success) {
           setLastSavedTime(new Date());
           setHasUnsavedChanges(false);
           toast({ title: 'Workout Saved', description: `Progress for ${currentDayOfWeek} saved successfully.` });
       } else {
           toast({ title: 'Save Failed', description: result.error || 'Could not save workout data.', variant: 'destructive' });
       }
   };


   if (isLoading) {
    return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
        );
    }


  return (
    <div className="container mx-auto px-2 sm:px-4 py-8 max-w-4xl">
      <header className="text-center mb-6 relative">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-1">Workout Warrior</h1>
        <p className="text-base sm:text-lg text-muted-foreground mb-4">Track your weekly progress</p>
         <div className="flex justify-center items-center gap-4 mb-4">
            <Button variant="outline" onClick={handleManualSave} disabled={isSaving || !hasUnsavedChanges}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {hasUnsavedChanges ? 'Save Now' : 'Saved'}
            </Button>
            <Link href="/analytics" passHref>
                 <Button variant="outline">
                    <BarChartBig className="mr-2 h-4 w-4" />
                    Analytics
                </Button>
             </Link>
         </div>
         {lastSavedTime && !hasUnsavedChanges && (
            <p className="text-xs text-muted-foreground text-center absolute bottom-0 left-0 right-0 -mb-4">
                Last saved: {format(lastSavedTime, 'Pp')}
            </p>
         )}
           {hasUnsavedChanges && !isSaving && ( // Only show unsaved if not currently saving
             <p className="text-xs text-orange-500 text-center absolute bottom-0 left-0 right-0 -mb-4">
                Unsaved changes
            </p>
           )}
           {isSaving && ( // Show saving indicator
             <p className="text-xs text-blue-500 text-center absolute bottom-0 left-0 right-0 -mb-4">
                Saving...
            </p>
           )}
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {isMobile ? (
          <div className="mb-6">
             <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full h-12 text-base">
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((day) => (
                    <SelectItem key={day} value={day} className="text-base py-2">
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
        ) : (
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-1 sm:gap-2 mb-6 h-auto flex-wrap justify-center">
            {daysOfWeek.map((day) => (
              <TabsTrigger
                key={day}
                value={day}
                className="flex items-center justify-center gap-1 sm:gap-2 py-2 px-1 text-[10px] sm:text-xs md:text-sm h-10 sm:h-auto"
              >
                <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:inline" />
                <span className="truncate">{day}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        )}

        {daysOfWeek.map((day) => (
          <TabsContent key={day} value={day} className="mt-4 focus-visible:ring-0 focus-visible:ring-offset-0">
             <DayWorkout
                day={day}
                plan={workoutPlan[day as keyof typeof workoutPlan]}
                 // Pass reps for the *active* day (which is today initially)
                 // This assumes we only edit/view the current day's data loaded into 'reps' state
                reps={reps[day] || generateDefaultRepsForDay(workoutPlan[day as keyof typeof workoutPlan])}
                onRepChange={handleRepChange}
              />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
