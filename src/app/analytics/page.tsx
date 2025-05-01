
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, LineChart as LineChartIcon, BrainCircuit, AlertTriangle } from 'lucide-react'; // Renamed LineChart, Added BrainCircuit, AlertTriangle
import { loadWorkoutData, type LoadedWorkoutData } from '@/app/actions/loadWorkoutData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, isValid } from 'date-fns';
import { workoutPlan, type Exercise, type Superset, type WorkoutDayPlan } from '@/lib/workout-data'; // Import workout plan details
import { suggestWeightChange, type SuggestWeightChangeInput, type SuggestWeightChangeOutput } from '@/ai/flows/suggest-weight-change-flow'; // Import the new AI flow
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components


// Helper function to get exercise names and target reps mapped to their unique identifiers
function getExerciseDetailsMap(): { [key: string]: { name: string; targetReps: string } } {
    const map: { [key: string]: { name: string; targetReps: string } } = {};

    Object.values(workoutPlan).forEach(dayPlan => {
        if (!dayPlan) return;

        const processItems = (items: { [key: string]: Exercise | Superset } | undefined) => {
            if (!items) return;
            Object.entries(items).forEach(([baseIdentifier, item]) => {
                if ('exercises' in item) { // Superset
                    (item as Superset).exercises.forEach((ex, idx) => {
                        const uniqueId = `${baseIdentifier}_${idx}`;
                        map[uniqueId] = { name: ex.name, targetReps: ex.reps };
                    });
                } else { // Single exercise
                    const uniqueId = baseIdentifier;
                    // Ensure item is an Exercise before accessing name and reps
                    if (item && typeof item === 'object' && 'name' in item && 'reps' in item) {
                         map[uniqueId] = { name: (item as Exercise).name, targetReps: (item as Exercise).reps };
                     } else {
                         console.warn(`Item with baseIdentifier ${baseIdentifier} is not a valid Exercise object.`);
                     }
                }
            });
        };

        processItems(dayPlan.morningGym);
        processItems(dayPlan.eveningHome);

        if (dayPlan.optionalFinisher) {
            map['optionalFinisher'] = { name: dayPlan.optionalFinisher.name, targetReps: dayPlan.optionalFinisher.reps };
        }
    });
    // console.log("Generated Exercise Details Map:", map); // For debugging
    return map;
}


// Interface for processed exercise data point
interface ExerciseDataPoint {
    date: string; // Keep original date string for sorting
    name: string; // Formatted date for display (e.g., 'MMM d')
    reps: number;
}

// Interface for the structure holding data for all exercise charts
interface ExerciseChartData {
    [uniqueId: string]: {
        exerciseName: string;
        targetReps: string; // Store target reps string
        data: ExerciseDataPoint[];
    };
}

export default function AnalyticsPage() {
    const [workoutData, setWorkoutData] = React.useState<LoadedWorkoutData | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const exerciseDetailsMap = React.useMemo(() => getExerciseDetailsMap(), []); // Memoize the map
    const [suggestions, setSuggestions] = React.useState<{ [uniqueId: string]: SuggestWeightChangeOutput | null }>({});
    const [suggestionLoading, setSuggestionLoading] = React.useState<{ [uniqueId: string]: boolean }>({});
    const [suggestionError, setSuggestionError] = React.useState<{ [uniqueId: string]: string | null }>({});


    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await loadWorkoutData();
                if (data) {
                    setWorkoutData(data);
                } else {
                   setError('Could not load workout data.');
                }
            } catch (err) {
                console.error("Error loading analytics data:", err);
                setError('Failed to load analytics data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- Data Processing for Charts ---
    const processDataForCharts = (): ExerciseChartData => {
        if (!workoutData) return {};

        const exerciseProgress: ExerciseChartData = {};
        const sortedDates = Object.keys(workoutData).sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime()); // Sort dates chronologically

        sortedDates.forEach(dateStr => {
            const dayData = workoutData[dateStr];
            if (!dayData || !dayData.reps) return; // Skip if data or reps are missing

            const processWorkoutType = (workoutTypeData: LoadedWorkoutData[string]['reps'][string]) => {
                 if (!workoutTypeData) return;

                Object.entries(workoutTypeData).forEach(([uniqueId, roundsData]) => {
                     if (!roundsData) return;
                    let totalReps = 0;
                    Object.values(roundsData).forEach(repValue => {
                        if (typeof repValue === 'number') {
                            totalReps += repValue;
                        } else if (typeof repValue === 'string' && repValue !== '') {
                            const num = parseInt(repValue, 10);
                            if (!isNaN(num)) {
                                totalReps += num;
                            }
                        }
                    });

                    // Find exercise details from the map
                    const details = exerciseDetailsMap[uniqueId];
                    if (details) { // Ensure we have details mapping
                        if (!exerciseProgress[uniqueId]) {
                            exerciseProgress[uniqueId] = {
                                exerciseName: details.name,
                                targetReps: details.targetReps, // Store target reps
                                data: [],
                            };
                        }
                        const dateObj = parseISO(dateStr);
                         if (isValid(dateObj)) { // Ensure the date is valid before formatting
                             exerciseProgress[uniqueId].data.push({
                                date: dateStr, // Keep original for sorting
                                name: format(dateObj, 'MMM d'), // Formatted for display
                                reps: totalReps,
                            });
                         } else {
                             console.warn(`Invalid date string encountered: ${dateStr}`);
                         }
                    } else {
                         // console.warn(`No details found for unique exercise ID: ${uniqueId}`); // Debugging missing details
                     }
                });
            };

            processWorkoutType(dayData.reps.morningGym);
            processWorkoutType(dayData.reps.eveningHome);
        });


         // Ensure each exercise's data is sorted by date
         Object.values(exerciseProgress).forEach(exercise => {
             exercise.data.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
         });

        return exerciseProgress;
    };

    // --- AI Suggestion ---
    const handleGetSuggestion = async (uniqueId: string) => {
        const chartInfo = exerciseChartsData[uniqueId];
        if (!chartInfo || chartInfo.data.length < 2) {
            setSuggestionError({ ...suggestionError, [uniqueId]: "Not enough data for a suggestion." });
            return;
        }
         // Check if all reps are zero
         if (chartInfo.data.every(p => p.reps === 0)) {
            setSuggestionError({ ...suggestionError, [uniqueId]: "No reps recorded for this exercise yet." });
            return;
        }


        setSuggestionLoading({ ...suggestionLoading, [uniqueId]: true });
        setSuggestionError({ ...suggestionError, [uniqueId]: null });
        setSuggestions({ ...suggestions, [uniqueId]: null }); // Clear previous suggestion

        try {
            const input: SuggestWeightChangeInput = {
                exerciseName: chartInfo.exerciseName,
                targetReps: chartInfo.targetReps,
                progressionData: chartInfo.data.map(d => ({ date: d.name, reps: d.reps })), // Use formatted date for readability in prompt if needed
            };
            console.log(`Requesting suggestion for ${uniqueId} with input:`, input); // Log input
            const result = await suggestWeightChange(input);
            console.log(`Received suggestion for ${uniqueId}:`, result); // Log output
            setSuggestions({ ...suggestions, [uniqueId]: result });
        } catch (err: any) {
            console.error(`Error getting suggestion for ${uniqueId}:`, err);
             const errorMessage = err.message || 'An unexpected error occurred while getting the suggestion.';
             setSuggestionError({ ...suggestionError, [uniqueId]: errorMessage });
        } finally {
            setSuggestionLoading({ ...suggestionLoading, [uniqueId]: false });
        }
    };


    const exerciseChartsData = processDataForCharts();
    const exerciseIdsWithData = Object.keys(exerciseChartsData);

    // --- Rendering Logic ---

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
                <h1 className="text-3xl font-bold text-destructive mb-4">Error</h1>
                <p className="text-muted-foreground mb-6">{error}</p>
                 <Link href="/" passHref>
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Tracker
                    </Button>
                </Link>
            </div>
        );
    }

     if (!workoutData || Object.keys(workoutData).length === 0) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
                 <h1 className="text-3xl font-bold text-primary mb-4">Workout Analytics</h1>
                <p className="text-muted-foreground mb-6">No workout data found to display analytics.</p>
                <Link href="/" passHref>
                    <Button variant="outline">
                         <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Tracker
                    </Button>
                </Link>
            </div>
        );
    }


    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl"> {/* Increased max-width */}
            <div className="flex items-center justify-between mb-6">
                 <h1 className="text-3xl font-bold text-primary">Workout Analytics</h1>
                 <Link href="/" passHref>
                     <Button variant="outline" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Tracker
                    </Button>
                </Link>
            </div>

             {/* Section for Individual Exercise Progress */}
             <div className="mb-8">
                 <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-secondary-foreground">
                     <LineChartIcon className="h-6 w-6 text-primary" />
                    Individual Exercise Progress
                 </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exerciseIdsWithData.length > 0 ? (
                         exerciseIdsWithData.map((uniqueId) => {
                            const chartInfo = exerciseChartsData[uniqueId];
                            const suggestionData = suggestions[uniqueId];
                             const isLoadingSuggestion = suggestionLoading[uniqueId];
                             const suggestionErr = suggestionError[uniqueId];
                             const canRenderLineChart = chartInfo.data.length >= 2; // Minimum data points for line chart
                             const hasNonZeroData = chartInfo.data.some(d => d.reps > 0); // Check for actual reps


                             if (!hasNonZeroData) {
                                 // Optionally render a card saying "no reps recorded" or just skip
                                 // return (
                                 //    <Card key={uniqueId} className="shadow-md opacity-50">
                                 //        <CardHeader>
                                 //            <CardTitle className="text-lg font-medium">{chartInfo.exerciseName}</CardTitle>
                                 //            <CardDescription>Target: {chartInfo.targetReps}</CardDescription>
                                 //        </CardHeader>
                                 //        <CardContent>
                                 //            <p className="text-muted-foreground text-sm text-center py-10">No reps recorded yet.</p>
                                 //        </CardContent>
                                 //    </Card>
                                 // );
                                 return null; // Skip rendering if no reps ever recorded
                             }


                            return (
                                <Card key={uniqueId} className="shadow-md flex flex-col">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-medium">{chartInfo.exerciseName}</CardTitle>
                                         <CardDescription>Target: {chartInfo.targetReps}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        {canRenderLineChart ? (
                                            <ResponsiveContainer width="100%" height={200}>
                                                <LineChart data={chartInfo.data}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" fontSize={10} />
                                                    <YAxis allowDecimals={false} />
                                                     <Tooltip contentStyle={{ fontSize: '12px', padding: '4px 8px' }}/>
                                                    <Legend wrapperStyle={{ fontSize: '12px' }}/>
                                                    <Line
                                                        type="monotone"
                                                        dataKey="reps"
                                                        stroke="hsl(var(--primary))"
                                                        strokeWidth={2}
                                                        dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                                                        activeDot={{ r: 6 }}
                                                        name="Total Reps"
                                                     />
                                                </LineChart>
                                            </ResponsiveContainer>
                                         ) : (
                                              <p className="text-muted-foreground text-sm text-center py-10">Not enough data points yet for a chart (needs at least 2 sessions with reps recorded).</p>
                                         )}
                                    </CardContent>
                                     <CardFooter className="flex-col items-start gap-3 pt-4 border-t mt-auto">
                                          {/* AI Suggestion Section */}
                                         {canRenderLineChart && hasNonZeroData && (
                                              <>
                                                  <Button
                                                      onClick={() => handleGetSuggestion(uniqueId)}
                                                      disabled={isLoadingSuggestion}
                                                      size="sm"
                                                      variant="outline"
                                                      className="w-full"
                                                  >
                                                     {isLoadingSuggestion ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                     ) : (
                                                        <BrainCircuit className="mr-2 h-4 w-4 text-primary" />
                                                     )}
                                                     Get AI Suggestion
                                                 </Button>

                                                 {isLoadingSuggestion && (
                                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
                                                     </p>
                                                 )}

                                                {suggestionErr && !isLoadingSuggestion && (
                                                     <Alert variant="destructive" className="mt-2">
                                                         <AlertTriangle className="h-4 w-4"/>
                                                        <AlertTitle>Suggestion Error</AlertTitle>
                                                         <AlertDescription className="text-xs">{suggestionErr}</AlertDescription>
                                                     </Alert>
                                                 )}

                                                {suggestionData && !isLoadingSuggestion && !suggestionErr && (
                                                     <Alert variant={suggestionData.suggestion === "Increase Weight" ? "success" : suggestionData.suggestion === "Decrease Weight" ? "destructive" : "default"} className="mt-2">
                                                        <AlertTitle className="flex items-center gap-2 text-sm font-semibold">
                                                             AI Suggestion: {suggestionData.suggestion}
                                                         </AlertTitle>
                                                         <AlertDescription className="text-xs mt-1">{suggestionData.explanation}</AlertDescription>
                                                    </Alert>
                                                 )}
                                             </>
                                          )}
                                     </CardFooter>
                                </Card>
                            );
                        })
                    ) : (
                         <p className="text-muted-foreground md:col-span-2 lg:col-span-3 text-center">No exercise data with recorded reps found.</p>
                    )}
                </div>
             </div>
        </div>
    );
}
