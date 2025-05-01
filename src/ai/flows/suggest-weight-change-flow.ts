
'use server';
/**
 * @fileOverview Provides AI-driven suggestions for weight adjustments based on exercise progression.
 *
 * - suggestWeightChange - A function that analyzes progression and suggests weight changes.
 * - SuggestWeightChangeInput - The input type for the suggestWeightChange function.
 * - SuggestWeightChangeOutput - The return type for the suggestWeightChange function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Define the schema for individual progression data points
const ProgressionDataPointSchema = z.object({
  date: z.string().describe('The date of the workout session (e.g., "yyyy-MM-dd" or "MMM d").'),
  reps: z.number().describe('The total number of reps completed for the exercise in that session.'),
});

// Define the input schema for the flow
const SuggestWeightChangeInputSchema = z.object({
  exerciseName: z.string().describe('The name of the exercise being analyzed.'),
  targetReps: z.string().describe('The target rep range for the exercise (e.g., "8-10 reps", "10 reps", "3x12").'),
  progressionData: z.array(ProgressionDataPointSchema).describe('An array of workout data points showing reps completed over time.'),
});
export type SuggestWeightChangeInput = z.infer<typeof SuggestWeightChangeInputSchema>;

// Define the output schema for the flow
const SuggestWeightChangeOutputSchema = z.object({
  suggestion: z.enum(["Increase Weight", "Decrease Weight", "Maintain Weight", "Not Enough Data"])
               .describe('The suggested action regarding the weight for the next session.'),
  explanation: z.string().describe('A brief explanation justifying the suggestion based on the provided progression data and target reps.'),
});
export type SuggestWeightChangeOutput = z.infer<typeof SuggestWeightChangeOutputSchema>;

// Exported wrapper function to call the flow
export async function suggestWeightChange(input: SuggestWeightChangeInput): Promise<SuggestWeightChangeOutput> {
  // Basic check: Need at least a couple of data points for a meaningful suggestion
  if (input.progressionData.length < 2) {
      return {
          suggestion: "Not Enough Data",
          explanation: "Need at least two recorded sessions with completed reps to provide a suggestion."
      };
  }
  // Check if all reps are zero
  if (input.progressionData.every(p => p.reps === 0)) {
      return {
           suggestion: "Not Enough Data",
           explanation: "No reps have been recorded for this exercise yet."
      };
  }
  return suggestWeightChangeFlow(input);
}

// Define the prompt for the AI model
const suggestWeightChangePrompt = ai.definePrompt({
  name: 'suggestWeightChangePrompt',
  input: {
    schema: SuggestWeightChangeInputSchema,
  },
  output: {
    schema: SuggestWeightChangeOutputSchema,
  },
  prompt: `You are a helpful fitness assistant analyzing workout progression to suggest weight adjustments.

Analyze the following progression data for the exercise: {{{exerciseName}}}.
The target rep range for this exercise is: {{{targetReps}}}.

Progression Data:
{{#each progressionData}}
- Date: {{date}}, Reps Completed: {{reps}}
{{/each}}

Based *only* on this data and the target rep range:
- If the user is consistently hitting the *upper end* of the target rep range or exceeding it across the recent sessions, suggest "Increase Weight".
- If the user is consistently struggling to meet the *lower end* of the target rep range or reps are decreasing, suggest "Decrease Weight".
- If the user is consistently performing within the target rep range without significant struggle at the lower end or easily hitting the upper end, suggest "Maintain Weight".
- If the data is too sparse, inconsistent, or doesn't provide a clear trend relative to the target, lean towards "Maintain Weight" or explain why a suggestion cannot be made confidently, using the "Not Enough Data" suggestion type if applicable (though the calling function handles the most basic cases).

Provide a brief explanation for your suggestion. Focus solely on the rep progression relative to the target range. Do not comment on form, rest periods, or other factors not present in the data.
`,
});


// Define the Genkit flow
const suggestWeightChangeFlow = ai.defineFlow<
  typeof SuggestWeightChangeInputSchema,
  typeof SuggestWeightChangeOutputSchema
>(
  {
    name: 'suggestWeightChangeFlow',
    inputSchema: SuggestWeightChangeInputSchema,
    outputSchema: SuggestWeightChangeOutputSchema,
  },
  async (input) => {
    // Call the prompt with the input data
    const { output } = await suggestWeightChangePrompt(input);

    // Handle potential null output (though schema validation should prevent this)
    if (!output) {
        console.error('AI model returned null output for suggestWeightChangePrompt');
        return {
            suggestion: "Not Enough Data", // Default to safe suggestion
            explanation: "An error occurred while generating the suggestion. Unable to provide guidance."
        };
    }

    return output;
  }
);
