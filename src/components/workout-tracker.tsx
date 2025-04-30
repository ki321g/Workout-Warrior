
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
import { fillMissedDays } from '@/app/actions/fillMissedDays';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
// Removed unnecessary date-fns imports as startOfWeek handles it
import { addDays, format, parseISO, startOfDay, getDay, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

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
                        defaultDayReps[workoutType]![uniqueId]![i] = ''; // Default empty string
                    }
                });
            } else { // Single exercise
                defaultDayReps[workoutType]![baseIdentifier] = {};
                 const exRounds = (item as Exercise).rounds || 1;
                for (let i = 0; i < exRounds; i++) {
                    defaultDayReps[workoutType]![baseIdentifier]![i] = ''; // Default empty string
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
            defaultDayReps.morningGym!['optionalFinisher']![i] = ''; // Default empty string
        }
    }

    return defaultDayReps;
}

// Helper function to generate a rep state with all reps set to 0
function generateZeroRepsForDay(dayPlan: WorkoutDayPlan | undefined): RepsState[string] {
    const zeroDayReps: RepsState[string] = { morningGym: {}, eveningHome: {} };
    if (!dayPlan) return zeroDayReps;

    const processWorkoutItems = (items: { [key: string]: Exercise | Superset } | undefined, workoutType: 'morningGym' | 'eveningHome') => {
        if (!items) return;
        Object.entries(items).forEach(([baseIdentifier, item]) => {
            const rounds = (item as Superset).rounds || (item as Exercise).rounds || 1;
            if ('exercises' in item) { // Superset
                (item as Superset).exercises.forEach((ex, idx) => {
                    const uniqueId = `${baseIdentifier}_${idx}`;
                    const exRounds = ex.rounds || rounds;
                    zeroDayReps[workoutType]![uniqueId] = {};
                    for (let i = 0; i < exRounds; i++) {
                        zeroDayReps[workoutType]![uniqueId]![i] = 0; // Set to 0
                    }
                });
            } else { // Single exercise
                zeroDayReps[workoutType]![baseIdentifier] = {};
                 const exRounds = (item as Exercise).rounds || 1;
                for (let i = 0; i < exRounds; i++) {
                    zeroDayReps[workoutType]![baseIdentifier]![i] = 0; // Set to 0
                }
            }
        });
    };

    processWorkoutItems(dayPlan.morningGym, 'morningGym');
    processWorkoutItems(dayPlan.eveningHome, 'eveningHome');
    if (dayPlan.optionalFinisher) {
        const finisherRounds = dayPlan.optionalFinisher.rounds || 1;
        zeroDayReps.morningGym!['optionalFinisher'] = {};
         for (let i = 0; i < finisherRounds; i++) {
            zeroDayReps.morningGym!['optionalFinisher']![i] = 0; // Set to 0
        }
    }

    return zeroDayReps;
}


export function WorkoutTracker() {
  const [reps, setReps] = React.useState<RepsState>({});
  const [activeTab, setActiveTab] = React.useState(daysOfWeek[0]);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [lastSavedTimes, setLastSavedTimes] = React.useState<{ [day: string]: Date | null }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState<{ [day: string]: boolean }>({});
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [loadedDataDates, setLoadedDataDates] = React.useState<{ [day: string]: string | null }>({}); // Track loaded date per day of week
  const [currentWeekStart, setCurrentWeekStart] = React.useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday as start

   // Function to determine the date corresponding to a selected day of the week tab within the *current* week
   const getDateForDayOfWeek = (targetDayOfWeek: string): Date => {
     const targetDayIndex = daysOfWeek.indexOf(targetDayOfWeek); // 0 for Monday, 6 for Sunday
     // Add the index (0-6) to the start of the current week (which is always a Monday)
     return addDays(currentWeekStart, targetDayIndex);
   };


  // Load data on mount and handle initial setup
  React.useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        const today = new Date();
        const todayDayIndex = (getDay(today) + 6) % 7; // 0 = Monday
        const currentDayOfWeek = daysOfWeek[todayDayIndex];
        const weekStartsOnMonday = startOfWeek(today, { weekStartsOn: 1 });
        setCurrentWeekStart(weekStartsOnMonday); // Set current week start date

        console.log("Loading workout data...");
        // Load all historical data
        let loadedData = await loadWorkoutData();

        const initialReps: RepsState = {};
        const initialUnsavedChanges: { [day: string]: boolean } = {};
        const initialLastSaved: { [day: string]: Date | null } = {};
        const initialLoadedDates: { [day: string]: string | null } = {};

        let lastRecordDate: Date | null = null;
        if (loadedData && Object.keys(loadedData).length > 0) {
            const sortedDates = Object.keys(loadedData).sort().reverse();
            if (sortedDates.length > 0) {
                lastRecordDate = parseISO(sortedDates[0]);
                console.log(`Last recorded date found: ${format(lastRecordDate, 'yyyy-MM-dd')}`);
            } else {
                 console.log("Loaded data object is not empty but contains no dates.");
            }
        } else {
            console.log("No existing workout data found.");
        }

        // Fill missed days based on the absolute last recorded date found
        // This should run BEFORE populating the current week's state
        if (lastRecordDate) {
             console.log(`Checking for missed days between ${format(addDays(lastRecordDate, 1), 'yyyy-MM-dd')} and ${format(startOfDay(today), 'yyyy-MM-dd')}`);
            const filledMissed = await fillMissedDays(lastRecordDate, today);
            if (filledMissed) {
                // Reload data if missed days were filled, so we have the latest state
                console.log("Missed days were filled. Reloading data...");
                loadedData = await loadWorkoutData();
                 // Update lastRecordDate after potentially filling gaps and reloading
                 if (loadedData && Object.keys(loadedData).length > 0) {
                    const sortedDates = Object.keys(loadedData).sort().reverse();
                    if (sortedDates.length > 0) {
                        lastRecordDate = parseISO(sortedDates[0]);
                        console.log(`Updated last recorded date after fill: ${format(lastRecordDate, 'yyyy-MM-dd')}`);
                    }
                 }
            }
        } else {
             console.log("No last record date, skipping fillMissedDays check.");
        }


       // Populate reps state for the current week based on the new rules
       daysOfWeek.forEach((day, index) => {
           const dateForThisDay = getDateForDayOfWeek(day); // Use the corrected helper
           const dateString = format(dateForThisDay, 'yyyy-MM-dd');
           const dayPlan = workoutPlan[day as keyof typeof workoutPlan];
           const isPastDay = dateForThisDay < startOfDay(today);
           const isWorkoutDay = dayPlan && !dayPlan.restDay && !dayPlan.recovery;

            if (loadedData && loadedData[dateString]) {
                // Data exists for this day in the current week's date range - always load it
                initialReps[day] = loadedData[dateString].reps;
                initialLastSaved[day] = loadedData[dateString].lastUpdatedAt;
                initialLoadedDates[day] = dateString;
                console.log(`Loaded existing data for ${day} (${dateString})`);
            } else {
                // No data exists for this day's date for the current week
                 initialLastSaved[day] = null;
                 initialLoadedDates[day] = null;

                 // Always generate default empty state if no record found for the current week's date
                 initialReps[day] = generateDefaultRepsForDay(dayPlan);
                 console.log(`No record for ${day} (${dateString}). Generated default empty state.`);

                 // Note: fillMissedDays already handled inserting zero reps for past workout days
                 // based on the *last recorded date overall*, not just within the current week.
            }
            initialUnsavedChanges[day] = false; // Start with no unsaved changes for any day
        });


        setReps(initialReps);
        setHasUnsavedChanges(initialUnsavedChanges);
        setLastSavedTimes(initialLastSaved);
        setLoadedDataDates(initialLoadedDates);
        setActiveTab(currentDayOfWeek); // Set the active tab to the current day of the week
        setIsLoading(false);
        console.log("Initial data load complete.");
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount


  // Debounced save function
  const debouncedSave = React.useCallback(() => {
     if (saveTimeoutRef.current) {
       clearTimeout(saveTimeoutRef.current);
     }
     saveTimeoutRef.current = setTimeout(async () => {
        const dayToSave = activeTab; // Get the currently active tab
        if (!hasUnsavedChanges[dayToSave]) return; // Don't save if nothing changed for this specific day

       setIsSaving(true);
       const dateToSave = getDateForDayOfWeek(dayToSave); // Determine the correct date for the active tab
       const dayRepsToSave = reps[dayToSave];

       if (!dayRepsToSave) {
            console.warn("No reps data found for the day being saved:", dayToSave);
            setIsSaving(false);
            return;
        }

       console.log(`Auto-saving data for ${dayToSave} (${format(dateToSave, 'yyyy-MM-dd')})...`);
       const result = await saveWorkoutData(dateToSave, dayToSave, dayRepsToSave);
       setIsSaving(false);

       if (result.success) {
          console.log(`Auto-save successful for ${dayToSave}.`);
          setLastSavedTimes(prev => ({ ...prev, [dayToSave]: new Date() }));
          setHasUnsavedChanges(prev => ({ ...prev, [dayToSave]: false }));
          setLoadedDataDates(prev => ({ ...prev, [dayToSave]: format(dateToSave, 'yyyy-MM-dd') })); // Mark data as loaded/saved for this date
       } else {
         console.error(`Auto-save failed for ${dayToSave}:`, result.error);
         toast({
           title: 'Auto-Save Failed',
           description: result.error || `Could not automatically save workout data for ${dayToSave}.`,
           variant: 'destructive',
         });
       }
     }, 1500); // 1.5-second debounce timer
   }, [activeTab, reps, hasUnsavedChanges, toast, getDateForDayOfWeek]); // Include getDateForDayOfWeek


  const handleRepChange = (day: string, workoutType: string, exerciseIdentifier: string, roundIndex: number, value: number | string) => {
    // Ensure day matches the activeTab before updating state
    if (day !== activeTab) {
        console.warn(`Rep change received for inactive tab ${day}, current tab is ${activeTab}. Ignoring.`);
        return;
    }

    const numericValue = value === '' ? '' : Number(value);
    // Prevent non-numeric inputs (allowing empty string for clearing)
    if (value !== '' && isNaN(numericValue)) {
        return;
    }

    setReps((prevReps) => {
        const newReps = JSON.parse(JSON.stringify(prevReps));
        // Ensure the structure exists
        if (!newReps[day]) newReps[day] = { morningGym: {}, eveningHome: {} };
        if (!newReps[day][workoutType]) newReps[day][workoutType] = {};
        if (!newReps[day][workoutType][exerciseIdentifier]) newReps[day][workoutType][exerciseIdentifier] = {};

        newReps[day][workoutType][exerciseIdentifier][roundIndex] = value; // Store the value as is (string or number)

        return newReps;
    });

    // Mark changes and trigger debounce
    setHasUnsavedChanges(prev => ({ ...prev, [day]: true }));
    debouncedSave();
  };


   // Manual Save Function
   const handleManualSave = async () => {
       if (saveTimeoutRef.current) {
           clearTimeout(saveTimeoutRef.current); // Cancel any pending auto-save
       }

       const dayToSave = activeTab; // Get the currently active tab
       if (!hasUnsavedChanges[dayToSave]) {
           toast({ title: 'No Changes', description: `Nothing new to save for ${dayToSave}.` });
           return;
       }

       setIsSaving(true);
       const dateToSave = getDateForDayOfWeek(dayToSave); // Determine the correct date for the active tab
       const dayRepsToSave = reps[dayToSave];


       if (!dayRepsToSave) {
            console.error(`Manual save error: No workout data found for ${dayToSave}.`);
            toast({ title: 'Save Error', description: `No workout data found for ${dayToSave}.`, variant: 'destructive' });
            setIsSaving(false);
            return;
        }

       console.log(`Manually saving data for ${dayToSave} (${format(dateToSave, 'yyyy-MM-dd')})...`);
       const result = await saveWorkoutData(dateToSave, dayToSave, dayRepsToSave);
       setIsSaving(false);

       if (result.success) {
           console.log(`Manual save successful for ${dayToSave}.`);
           setLastSavedTimes(prev => ({ ...prev, [dayToSave]: new Date() }));
           setHasUnsavedChanges(prev => ({ ...prev, [dayToSave]: false }));
            setLoadedDataDates(prev => ({ ...prev, [dayToSave]: format(dateToSave, 'yyyy-MM-dd') })); // Mark data as loaded/saved for this date
           toast({ title: 'Workout Saved', description: `Progress for ${dayToSave} (${format(dateToSave, 'MMM d')}) saved successfully.` });
       } else {
            console.error(`Manual save failed for ${dayToSave}:`, result.error);
           toast({ title: 'Save Failed', description: result.error || `Could not save workout data for ${dayToSave}.`, variant: 'destructive' });
       }
   };


   if (isLoading) {
    return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
        );
    }

   const currentDayHasUnsavedChanges = hasUnsavedChanges[activeTab];
   const currentDayLastSavedTime = lastSavedTimes[activeTab];


  return (
    <div className="container mx-auto px-2 sm:px-4 py-8 max-w-4xl">
      <header className="text-center mb-6 relative">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-1">Workout Warrior</h1>
        <p className="text-base sm:text-lg text-muted-foreground mb-4">Track your weekly progress</p>
         <div className="flex justify-center items-center gap-4 mb-4">
            <Button variant="outline" onClick={handleManualSave} disabled={isSaving || !currentDayHasUnsavedChanges}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {currentDayHasUnsavedChanges ? 'Save Now' : 'Saved'}
            </Button>
            <Link href="/analytics" passHref>
                 <Button variant="outline">
                    <BarChartBig className="mr-2 h-4 w-4" />
                    Analytics
                </Button>
             </Link>
         </div>
         {currentDayLastSavedTime && !currentDayHasUnsavedChanges && (
            <p className="text-xs text-muted-foreground text-center absolute bottom-0 left-0 right-0 -mb-4">
                {activeTab} last saved: {format(currentDayLastSavedTime, 'Pp')}
            </p>
         )}
           {currentDayHasUnsavedChanges && !isSaving && ( // Only show unsaved if not currently saving
             <p className="text-xs text-orange-500 text-center absolute bottom-0 left-0 right-0 -mb-4">
                Unsaved changes for {activeTab}
            </p>
           )}
           {isSaving && ( // Show saving indicator
             <p className="text-xs text-blue-500 text-center absolute bottom-0 left-0 right-0 -mb-4">
                Saving {activeTab}...
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
                day={day} // Pass the day this content is for
                plan={workoutPlan[day as keyof typeof workoutPlan]}
                // Ensure reps[day] exists before passing, fallback to empty object if not
                reps={reps[day] || generateDefaultRepsForDay(workoutPlan[day as keyof typeof workoutPlan])}
                onRepChange={handleRepChange} // Pass the single handler
              />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
    


            