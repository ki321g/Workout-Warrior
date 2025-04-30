'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { loadWorkoutData, type LoadedWorkoutData } from '@/app/actions/loadWorkoutData'; // Assuming you have this action
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

// Example data processing - adjust based on your needs
interface ChartData {
    name: string; // Exercise name or date
    value: number; // Average reps, total volume, etc.
    // Add more fields as needed
}

export default function AnalyticsPage() {
    const [workoutData, setWorkoutData] = React.useState<LoadedWorkoutData | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

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
    // This is a very basic example. You'll need more sophisticated logic
    // to calculate meaningful analytics like volume, average reps per exercise, etc.

    const processDataForChart = (): ChartData[] => {
        if (!workoutData) return [];

         // Example: Calculate total recorded reps per day for the last 7 days
        const processed: ChartData[] = [];
        const sortedDates = Object.keys(workoutData).sort().slice(-7); // Get last 7 recorded dates

        sortedDates.forEach(dateStr => {
            const dayData = workoutData[dateStr];
            let totalReps = 0;

            Object.values(dayData.reps).forEach(workoutType => { // Iterate through morning/evening
                 if(workoutType){
                      Object.values(workoutType).forEach(exerciseReps => { // Iterate through exercises
                           if(exerciseReps){
                                Object.values(exerciseReps).forEach(repValue => { // Iterate through rounds
                                    if (typeof repValue === 'number') {
                                        totalReps += repValue;
                                    } else if (typeof repValue === 'string' && repValue !== '') {
                                         const num = parseInt(repValue, 10);
                                         if (!isNaN(num)) {
                                             totalReps += num;
                                         }
                                     }
                                });
                           }
                    });
                 }
            });

            processed.push({
                name: format(parseISO(dateStr), 'MMM d'), // Format date for X-axis label
                value: totalReps,
            });
        });

        return processed;
    };

    const chartData = processDataForChart();

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
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                 <h1 className="text-3xl font-bold text-primary">Workout Analytics</h1>
                 <Link href="/" passHref>
                     <Button variant="outline" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Tracker
                    </Button>
                </Link>
            </div>

            {/* Add more cards and charts as needed */}
            <Card className="mb-6 shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold">Total Reps (Last 7 Recorded Days)</CardTitle>
                </CardHeader>
                <CardContent>
                     {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="hsl(var(--primary))" name="Total Reps" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                         <p className="text-muted-foreground">Not enough data for this chart.</p>
                     )}
                </CardContent>
            </Card>

             {/* Placeholder for more advanced analytics */}
            <Card className="mb-6 shadow-md border-dashed">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-muted-foreground">More Analytics Coming Soon!</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Detailed exercise progress, volume tracking, and AI insights are under development.</p>
                </CardContent>
            </Card>

        </div>
    );
}
