
"use client";

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DayWorkout, type RepsState } from '@/components/day-workout';
import { workoutPlan } from '@/lib/workout-data';
import { CalendarDays } from 'lucide-react';

const daysOfWeek = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function WorkoutTracker() {
  const [reps, setReps] = React.useState<RepsState>({});
  const [activeTab, setActiveTab] = React.useState(daysOfWeek[0]);

  React.useEffect(() => {
    // Load saved reps from local storage on component mount
    const savedReps = localStorage.getItem('workoutReps');
    if (savedReps) {
      try {
        setReps(JSON.parse(savedReps));
      } catch (error) {
        console.error("Failed to parse saved reps:", error);
        // Optionally clear invalid data
        // localStorage.removeItem('workoutReps');
      }
    }

    // Set active tab to current day of the week
    const todayIndex = (new Date().getDay() + 6) % 7; // 0 for Monday, 6 for Sunday
    setActiveTab(daysOfWeek[todayIndex]);

  }, []);

 const handleRepChange = (day: string, workoutType: string, exerciseIdentifier: string, roundIndex: number, value: number | string) => {
    const numericValue = value === '' ? '' : Number(value); // Allow empty string or number

    setReps((prevReps) => {
      const updatedReps = {
        ...prevReps,
        [day]: {
          ...prevReps[day],
          [workoutType]: {
            ...prevReps[day]?.[workoutType],
            [exerciseIdentifier]: { // Use the unique identifier directly
              ...prevReps[day]?.[workoutType]?.[exerciseIdentifier],
              [roundIndex]: numericValue,
            },
          },
        },
      };
      // Save updated reps to local storage
      localStorage.setItem('workoutReps', JSON.stringify(updatedReps));
      return updatedReps;
    });
  };


  return (
    // Added padding for better spacing on mobile
    <div className="container mx-auto px-2 sm:px-4 py-8 max-w-4xl">
      <header className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2">Workout Warrior</h1>
        <p className="text-base sm:text-lg text-muted-foreground">Track your weekly progress</p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Adjusted grid columns for responsiveness */}
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-1 sm:gap-2 mb-6 h-auto flex-wrap justify-center">
          {daysOfWeek.map((day) => (
            <TabsTrigger
              key={day}
              value={day}
              className="flex items-center justify-center gap-1 sm:gap-2 py-2 px-1 text-[10px] sm:text-xs md:text-sm h-10 sm:h-auto" // Adjusted padding and text size
            >
              <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:inline" />
              <span className="truncate">{day}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {daysOfWeek.map((day) => (
          <TabsContent key={day} value={day} className="mt-4"> {/* Added margin-top */}
             <DayWorkout
                day={day}
                plan={workoutPlan[day as keyof typeof workoutPlan]}
                reps={reps[day] || {}}
                onRepChange={handleRepChange}
              />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
