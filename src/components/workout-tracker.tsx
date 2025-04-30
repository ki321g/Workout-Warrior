'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DayWorkout, type RepsState } from '@/components/day-workout';
import { workoutPlan, type Exercise, type Superset } from '@/lib/workout-data';
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

// Helper function to generate a default empty rep state for a given day's plan
function generateDefaultRepsForDay(dayPlan: typeof workoutPlan[string] | undefined): RepsState[string] {
    const defaultDayReps: RepsState[string] = { morningGym: {}, eveningHome: {} };
    if (!dayPlan) return defaultDayReps;

    const processWorkoutItems = (items: { [key: string]: Exercise | Superset } | undefined, workoutType: 'morningGym' | 'eveningHome') => {
        if (!items) return;
        Object.entries(items).forEach(([baseIdentifier, item]) => {
            const rounds = (item as Superset).rounds || (item as Exercise).rounds || 1;
            if ((item as Superset).exercises) { // Superset
                (item as Superset).exercises.forEach((ex, idx) => {
                    const uniqueId = `${baseIdentifier}_${idx}`;
                    const exRounds = ex.rounds || rounds; // Use specific exercise rounds if available
                    defaultDayReps[workoutType]![uniqueId] = {};
                    for (let i = 0; i < exRounds; i++) {
                        defaultDayReps[workoutType]![uniqueId]![i] = ''; // Initialize with empty string
                    }
                });
            } else { // Single exercise
                defaultDayReps[workoutType]![baseIdentifier] = {};
                 const exRounds = (item as Exercise).rounds || 1;
                for (let i = 0; i < exRounds; i++) {
                    defaultDayReps[workoutType]![baseIdentifier]![i] = ''; // Initialize with empty string
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
            defaultDayReps.morningGym!['optionalFinisher']![i] = ''; // Initialize with empty string
        }
    }

    return defaultDayReps;
}

// Helper function to fill missed days with zeros
async function fillMissedDays(lastRecordedDate: Date | null): Promise<void> {
    const today = startOfDay(new Date());
    if (!lastRecordedDate) {
        console.log("No previous record found, cannot fill missed days.");
        return; // Nothing to fill if no prior record
    }

    const startDate = startOfDay(lastRecordedDate);
    const daysDiff = differenceInDays(today, startDate);

    if (daysDiff <= 1) {
        console.log("No missed days or only yesterday recorded.");
        return; // No gap or only yesterday
    }

    console.log(`Filling missed days between ${format(startDate, 'yyyy-MM-dd')} and ${format(today, 'yyyy-MM-dd')}`);

    for (let i = 1; i < daysDiff; i++) {
        const missedDate = subDays(today, daysDiff - i);
        const missedDateString = format(missedDate, 'yyyy-MM-dd');
        const missedDayIndex = (getDay(missedDate) + 6) % 7; // 0 = Monday, 6 = Sunday
        const missedDayName = daysOfWeek[missedDayIndex];
        const dayPlan = workoutPlan[missedDayName as keyof typeof workoutPlan];

        // Generate a rep state with all reps set to 0
        const zeroReps = generateDefaultRepsForDay(dayPlan);
        Object.keys(zeroReps).forEach(workoutType => {
            const type = workoutType as 'morningGym' | 'eveningHome';
            Object.keys(zeroReps[type]!).forEach(exerciseId => {
                Object.keys(zeroReps[type]![exerciseId]!).forEach(roundIdx => {
                    zeroReps[type]![exerciseId]![parseInt(roundIdx)] = 0; // Set to 0
                });
            });
        });

        console.log(`Saving zero reps for missed day: ${missedDateString} (${missedDayName})`);
        await saveWorkoutData(missedDate, missedDayName, zeroReps);
    }
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
      const loadedData = await loadWorkoutData();
      const today = new Date();
      const todayDateString = format(today, 'yyyy-MM-dd');
      const todayDayIndex = (getDay(today) + 6) % 7;
      const currentDayOfWeek = daysOfWeek[todayDayIndex];

      let initialReps: RepsState = {};
      let lastRecordDate: Date | null = null;

      if (loadedData && Object.keys(loadedData).length > 0) {
        // Find the most recent record date
         const sortedDates = Object.keys(loadedData).sort().reverse();
         if(sortedDates.length > 0) {
            lastRecordDate = parseISO(sortedDates[0]);
         }


        // Restore state for all days from loaded data
        Object.entries(loadedData).forEach(([dateStr, data]) => {
            // We are only storing day-specific reps now, not the full RepsState object per day
            // The structure needs rethinking. We should store RepsState indexed by date.
            // For now, let's just load today's data if available.
            // A better approach is needed for historical data view.

            // This loading logic needs to be adapted based on how we want to view past data.
            // Current setup assumes we only edit/view the current day's plan based on loaded reps.
        });

         // Load today's data if exists, otherwise generate default
         if (loadedData[todayDateString]) {
            initialReps[currentDayOfWeek] = loadedData[todayDateString].reps;
            setLoadedDataDate(todayDateString); // Mark that today's data was loaded
             setLastSavedTime(loadedData[todayDateString].lastUpdatedAt);
        } else {
             console.log("No record found for today. Generating default reps.");
             initialReps[currentDayOfWeek] = generateDefaultRepsForDay(workoutPlan[currentDayOfWeek as keyof typeof workoutPlan]);
             setLoadedDataDate(null); // No data loaded for today
             setLastSavedTime(null);
        }

         // Fill missed days based on the last recorded date
         await fillMissedDays(lastRecordDate);


      } else {
          console.log("No data loaded from Firestore. Generating default reps for today.");
         // Generate default reps for today if no data exists at all
          initialReps[currentDayOfWeek] = generateDefaultRepsForDay(workoutPlan[currentDayOfWeek as keyof typeof workoutPlan]);
          setLoadedDataDate(null);
          setLastSavedTime(null);
      }


      // Initialize reps state for all days, using loaded data for today if available, else defaults
      daysOfWeek.forEach(day => {
          if (!initialReps[day]) {
              initialReps[day] = generateDefaultRepsForDay(workoutPlan[day as keyof typeof workoutPlan]);
          }
      });

      setReps(initialReps);
      setActiveTab(currentDayOfWeek);
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
       const currentDayOfWeek = activeTab; // Use the currently active tab's day
        const today = new Date(); // Use current date for saving
        const dayRepsToSave = reps[currentDayOfWeek];

       if (!dayRepsToSave) {
            console.warn("No reps data found for the current day:", currentDayOfWeek);
            setIsSaving(false);
            return;
        }


       const result = await saveWorkoutData(today, currentDayOfWeek, dayRepsToSave);
       setIsSaving(false);

       if (result.success) {
         setLastSavedTime(new Date()); // Update last saved time on successful save
         setHasUnsavedChanges(false); // Reset unsaved changes flag
         // Don't show toast on auto-save to avoid annoyance
       } else {
         toast({
           title: 'Save Failed',
           description: result.error || 'Could not automatically save workout data.',
           variant: 'destructive',
         });
       }
     }, 1500); // Adjust debounce delay as needed (e.g., 1.5 seconds)
   }, [reps, activeTab, toast, hasUnsavedChanges]); // Include hasUnsavedChanges

  const handleRepChange = (day: string, workoutType: string, exerciseIdentifier: string, roundIndex: number, value: number | string) => {
    const numericValue = value === '' ? '' : Number(value);

    setReps((prevReps) => {
      // Create a deep copy to avoid mutating the previous state directly
       const newReps = JSON.parse(JSON.stringify(prevReps));

       // Ensure the structure exists before assigning
        if (!newReps[day]) newReps[day] = { morningGym: {}, eveningHome: {} };
        if (!newReps[day][workoutType]) newReps[day][workoutType] = {};
        if (!newReps[day][workoutType][exerciseIdentifier]) newReps[day][workoutType][exerciseIdentifier] = {};


      newReps[day][workoutType][exerciseIdentifier][roundIndex] = numericValue;

      setHasUnsavedChanges(true); // Mark changes as unsaved
       debouncedSave(); // Trigger debounced save on change
      return newReps;
    });
  };

  // Manual Save Function
   const handleManualSave = async () => {
       if (saveTimeoutRef.current) {
           clearTimeout(saveTimeoutRef.current); // Cancel any pending auto-save
       }
       setIsSaving(true);
       const currentDayOfWeek = activeTab;
       const today = new Date(); // Use current date for saving
       const dayRepsToSave = reps[currentDayOfWeek];


       if (!dayRepsToSave) {
            toast({
                title: 'Save Error',
                description: 'No workout data found for the current day.',
                variant: 'destructive',
            });
            setIsSaving(false);
            return;
        }

       const result = await saveWorkoutData(today, currentDayOfWeek, dayRepsToSave);
       setIsSaving(false);

       if (result.success) {
           setLastSavedTime(new Date());
           setHasUnsavedChanges(false);
           toast({
               title: 'Workout Saved',
               description: `Progress for ${currentDayOfWeek} saved successfully.`,
           });
       } else {
           toast({
               title: 'Save Failed',
               description: result.error || 'Could not save workout data.',
               variant: 'destructive',
           });
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
           {hasUnsavedChanges && (
             <p className="text-xs text-orange-500 text-center absolute bottom-0 left-0 right-0 -mb-4">
                Unsaved changes
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
                 // Provide the reps specifically for the day being rendered
                 // Ensure the structure exists before passing it down
                reps={reps[day] || generateDefaultRepsForDay(workoutPlan[day as keyof typeof workoutPlan])}
                onRepChange={handleRepChange}
              />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
