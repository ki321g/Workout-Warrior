
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, LineChart as LineChartIcon } from 'lucide-react'; // Renamed LineChart to avoid conflict
import { loadWorkoutData, type LoadedWorkoutData } from '@/app/actions/loadWorkoutData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, isValid } from 'date-fns';
import { workoutPlan, type Exercise, type Superset, type WorkoutDayPlan } from '@/lib/workout-data'; // Import workout plan details

// Helper function to get exercise names mapped to their unique identifiers
function getExerciseNameMap(): { [key: string]: string } {
    const map: { [key: string]: string } = {};

    Object.values(workoutPlan).forEach(dayPlan => {
        if (!dayPlan) return;

        const processItems = (items: { [key: string]: Exercise | Superset } | undefined) => {
            if (!items) return;
            Object.entries(items).forEach(([baseIdentifier, item]) => {
                if ('exercises' in item) { // Superset
                    (item as Superset).exercises.forEach((ex, idx) => {
                        const uniqueId = `${baseIdentifier}_${idx}`;
                        map[uniqueId] = ex.name;
                    });
                } else { // Single exercise
                    const uniqueId = baseIdentifier;
                     // Ensure item is an Exercise before accessing name
                    if (item && typeof item === 'object' && 'name' in item) {
                         map[uniqueId] = (item as Exercise).name;
                     } else {
                         console.warn(`Item with baseIdentifier ${baseIdentifier} is not a valid Exercise object.`);
                     }
                }
            });
        };

        processItems(dayPlan.morningGym);
        processItems(dayPlan.eveningHome);

        if (dayPlan.optionalFinisher) {
            map['optionalFinisher'] = dayPlan.optionalFinisher.name;
        }
    });
    // console.log("Generated Exercise Name Map:", map); // For debugging
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
        data: ExerciseDataPoint[];
    };
}

export default function AnalyticsPage() {
    const [workoutData, setWorkoutData] = React.useState<LoadedWorkoutData | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const exerciseNameMap = React.useMemo(() => getExerciseNameMap(), []); // Memoize the map

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

                    // Only add if reps were actually performed (or 0 was explicitly entered, might want to filter > 0 later)
                    // And if we have a name for this exercise
                    const exerciseName = exerciseNameMap[uniqueId];
                    if (exerciseName) { // Ensure we have a name mapping
                        if (!exerciseProgress[uniqueId]) {
                            exerciseProgress[uniqueId] = {
                                exerciseName: exerciseName,
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
                         // console.warn(`No name found for unique exercise ID: ${uniqueId}`); // Debugging missing names
                     }
                });
            };

            processWorkoutType(dayData.reps.morningGym);
            processWorkoutType(dayData.reps.eveningHome);
        });


         // Ensure each exercise's data is sorted by date (should be due to outer loop, but good practice)
         Object.values(exerciseProgress).forEach(exercise => {
             exercise.data.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
         });

        return exerciseProgress;
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
                            // Only render chart if there are at least 2 data points for a line chart
                            const canRenderLineChart = chartInfo.data.length >= 2;
                             // Render bar chart if only 1 point, or line if >= 2
                            const ChartComponent = canRenderLineChart ? LineChart : null; // Hide chart if only 1 point for line chart

                             // Check if there is any non-zero rep data
                            const hasNonZeroData = chartInfo.data.some(d => d.reps > 0);

                             if (!hasNonZeroData) {
                                 return null; // Skip rendering if all reps are 0
                             }


                            return (
                                <Card key={uniqueId} className="shadow-md">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-medium">{chartInfo.exerciseName}</CardTitle>
                                         <CardDescription>Total reps per session</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {ChartComponent ? (
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
                                              <p className="text-muted-foreground text-sm">Not enough data points yet for a line chart (needs at least 2 recorded sessions with reps &gt; 0).</p>
                                         )}
                                    </CardContent>
                                </Card>
                            );
                        })
                    ) : (
                         <p className="text-muted-foreground md:col-span-2 lg:col-span-3 text-center">No exercise data with recorded reps found.</p>
                    )}
                </div>
             </div>


             {/* Placeholder for more advanced analytics */}
            <Card className="mb-6 shadow-md border-dashed">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-muted-foreground">More Analytics Coming Soon!</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Volume tracking and AI insights are under development.</p>
                </CardContent>
            </Card>

        </div>
    );
}


    