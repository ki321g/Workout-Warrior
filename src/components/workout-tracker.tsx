
'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DayWorkout, type RepsState } from '@/components/day-workout';
import { workoutPlan, type Exercise, type Superset, type WorkoutDayPlan } from '@/lib/workout-data'; // Import WorkoutDayPlan
import { useIsMobile } from '@/hooks/use-mobile';
import { CalendarDays, BarChartBig, Save, Loader2, CheckCircle } from 'lucide-react'; // Added CheckCircle
import { saveWorkoutData } from '@/app/actions/saveWorkoutData';
import { loadWorkoutData, type LoadedWorkoutData } from '@/app/actions/loadWorkoutData';
import { fillMissedDays } from '@/app/actions/fillMissedDays';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { addDays, format, parseISO, startOfDay, getDay, startOfWeek, subDays } from 'date-fns';

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

export function WorkoutTracker() {
  const [reps, setReps] = React.useState<RepsState>({});
  const [activeTab, setActiveTab] = React.useState(daysOfWeek[0]);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState<{ [day: string]: boolean }>({});
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
        let loadedData = await loadWorkoutData();

        const initialReps: RepsState = {};
        const initialUnsavedChanges: { [day: string]: boolean } = {};
        const initialLoadedDates: { [day: string]: string | null } = {};

        let lastRecordDate: Date | null = null;
        if (loadedData && Object.keys(loadedData).length > 0) {
            const sortedDates = Object.keys(loadedData).sort((a, b) => b.localeCompare(a)); // Sort descending
            if (sortedDates.length > 0) {
                lastRecordDate = parseISO(sortedDates[0]); // Get the most recent date
                console.log(`Last recorded date found: ${format(lastRecordDate, 'yyyy-MM-dd')}`);
            } else {
                 console.log("Loaded data object is not empty but contains no valid dates.");
            }
        } else {
            console.log("No existing workout data found.");
            // Initialize with empty state if no data exists at all
             daysOfWeek.forEach(day => {
                initialReps[day] = generateDefaultRepsForDay(workoutPlan[day as keyof typeof workoutPlan]);
                initialUnsavedChanges[day] = false;
                initialLoadedDates[day] = null;
             });
        }

         // Proceed with filling/loading logic only if some data was potentially found or needs init
        // Fill missed days based on the absolute last recorded date found
        if (lastRecordDate) {
            const dayAfterLastRecord = addDays(lastRecordDate, 1);
            const dayBeforeToday = subDays(startOfDay(today),1); // Use start of day for accurate comparison

            // Only fill if there's a gap *before* today
            if (dayAfterLastRecord <= dayBeforeToday) {
                 console.log(`Checking for missed days between ${format(dayAfterLastRecord, 'yyyy-MM-dd')} and ${format(dayBeforeToday, 'yyyy-MM-dd')}`);
                 const filledMissed = await fillMissedDays(lastRecordDate, today);
                 if (filledMissed) {
                     console.log("Missed days were filled. Reloading data...");
                     loadedData = await loadWorkoutData(); // Reload to include filled data
                     if (loadedData && Object.keys(loadedData).length > 0) {
                         const sortedDates = Object.keys(loadedData).sort((a, b) => b.localeCompare(a));
                          if (sortedDates.length > 0) {
                             lastRecordDate = parseISO(sortedDates[0]); // Update last record date again
                             console.log(`Updated last recorded date after fill: ${format(lastRecordDate, 'yyyy-MM-dd')}`);
                         }
                     }
                  }
             } else {
                  console.log("No gap found to fill between last record and today.");
             }
         } else {
             console.log("No last record date, skipping fillMissedDays check.");
         }


         // Populate reps state for the current week based on loaded data or defaults
        daysOfWeek.forEach((day) => {
            const dateForThisDay = addDays(weekStartsOnMonday, daysOfWeek.indexOf(day)); // Calculate date based on THIS week's Monday
            const dateString = format(dateForThisDay, 'yyyy-MM-dd');
            const dayPlan = workoutPlan[day as keyof typeof workoutPlan];
            const isPastOrToday = dateForThisDay <= startOfDay(today);

            if (loadedData && loadedData[dateString] && isPastOrToday) {
                // Data exists for this past/today day in the current week - load it
                initialReps[day] = loadedData[dateString].reps;
                initialLoadedDates[day] = dateString;
                console.log(`Loaded existing data for ${day} (${dateString})`);
            } else {
                // No data exists for this day OR it's a future day OR no data loaded at all
                initialLoadedDates[day] = null;
                 // Generate default empty state
                initialReps[day] = generateDefaultRepsForDay(dayPlan);
                 if (isPastOrToday && loadedData) { // Distinguish between no record vs future
                     console.log(`No record found for past/today ${day} (${dateString}). Generated default empty state.`);
                 } else if (!isPastOrToday) {
                      console.log(`Future day ${day} (${dateString}). Generated default empty state.`);
                 } else {
                      // Handles the case where loadedData was null initially
                      console.log(`Initializing default state for ${day} (${dateString}) as no data was loaded.`);
                 }
            }
            initialUnsavedChanges[day] = false; // Start with no unsaved changes
        });


        setReps(initialReps);
        setHasUnsavedChanges(initialUnsavedChanges);
        setLoadedDataDates(initialLoadedDates);
        setActiveTab(currentDayOfWeek); // Set the active tab to the current day of the week
        setIsLoading(false);
        console.log("Initial data load complete.");
    };

    fetchData();
   // No longer using getDateForDayOfWeek in dependency array
  }, []); // Run only once on mount


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
        // Deep copy only the specific day being changed for performance
        const newRepsForDay = JSON.parse(JSON.stringify(prevReps[day] || { morningGym: {}, eveningHome: {} }));

        // Ensure the structure exists within the copied day's reps
        if (!newRepsForDay[workoutType]) newRepsForDay[workoutType] = {};
        if (!newRepsForDay[workoutType][exerciseIdentifier]) newRepsForDay[workoutType][exerciseIdentifier] = {};

        newRepsForDay[workoutType][exerciseIdentifier][roundIndex] = value; // Store the value as is

        // Return the updated state object
        return {
            ...prevReps,
            [day]: newRepsForDay
        };
    });

    // Mark changes for the current day
    setHasUnsavedChanges(prev => ({ ...prev, [day]: true }));
  };


   // Manual Save Function
   const handleManualSave = async () => {
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
           setHasUnsavedChanges(prev => ({ ...prev, [dayToSave]: false }));
            setLoadedDataDates(prev => ({ ...prev, [dayToSave]: format(dateToSave, 'yyyy-MM-dd') })); // Mark data as loaded/saved for this date
           // Updated toast with green icon and success variant
           toast({
              variant: "success", // Use the success variant
              title: (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" /> {/* Icon color handled by variant */}
                  Workout Saved
                </span>
              ),
             description: `Progress for ${dayToSave} (${format(dateToSave, 'MMM d')}) saved successfully.`
           });
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


  return (
    // Increased padding-bottom to pb-24
    <div className="container mx-auto px-2 sm:px-4 py-8 max-w-4xl pb-24">
      <header className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-1">Workout Warrior</h1>
        <p className="text-base sm:text-lg text-muted-foreground">Track your weekly progress</p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {isMobile ? (
          <div className="mb-6 sticky top-0 bg-background z-10 pt-2 pb-2"> {/* Make dropdown sticky */}
             <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full h-12 text-base shadow-md">
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
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-1 sm:gap-2 mb-6 h-auto flex-wrap justify-center sticky top-0 bg-background z-10 pt-2 pb-2 shadow-sm"> {/* Make tabs sticky */}
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
                reps={reps[day] || generateDefaultRepsForDay(workoutPlan[day as keyof typeof workoutPlan])}
                onRepChange={handleRepChange}
              />
          </TabsContent>
        ))}
      </Tabs>

       {/* Floating Action Buttons - applied fixed positioning and z-index */}
       <div className="fixed bottom-4 right-4 flex flex-col gap-3 z-50">
            <Button
                variant="default"
                size="lg" // Make button larger
                className="rounded-full shadow-lg h-14 w-14 p-0 flex items-center justify-center" // Style as FAB
                onClick={handleManualSave}
                disabled={isSaving || !currentDayHasUnsavedChanges}
                aria-label="Save Workout"
            >
                 {isSaving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
            </Button>
            <Link href="/analytics" passHref>
                 <Button
                    variant="secondary"
                    size="lg" // Make button larger
                    className="rounded-full shadow-lg h-14 w-14 p-0 flex items-center justify-center" // Style as FAB
                    aria-label="View Analytics"
                  >
                    <BarChartBig className="h-6 w-6" />
                </Button>
             </Link>
       </div>
    </div>
  );
}
