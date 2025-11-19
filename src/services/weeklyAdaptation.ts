/**
 * Weekly Adaptation Service
 * Uses OpenAI to generate personalized workout recommendations
 * Based on last week's performance + user responses
 */

import { OPENAI_API_KEY } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeeklyAnalysisResult, ExerciseAnalysis } from './weeklyAnalysis';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// User responses from check-in questions
export interface UserResponses {
  weekRating: number; // 1-5 scale (1=exhausted, 5=crushing it)
  notes: string; // Optional context
}

// Single exercise recommendation
export interface ExerciseRecommendation {
  exerciseName: string;
  currentWeight: number;
  recommendedWeight: number;
  change: 'increase' | 'maintain' | 'decrease';
  changeAmount: number; // e.g., +5, 0, -5
  reason: string; // Human-readable explanation
}

// Complete adaptation result
export interface AdaptationResult {
  recommendations: ExerciseRecommendation[];
  overallMessage: string; // General advice for the week
  shouldDeload: boolean;
}

/**
 * Generate weekly adaptations using AI
 * @param analysis - Last week's workout analysis
 * @param responses - User's check-in responses
 * @returns AI-generated recommendations
 */
export async function generateWeeklyAdaptations(
  analysis: WeeklyAnalysisResult,
  responses: UserResponses
): Promise<AdaptationResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Build prompt with user data
  const prompt = await buildAdaptationPrompt(analysis, responses);

  try {
    console.log('🤖 Calling OpenAI for weekly adaptations...');

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are Atlas, an expert strength coach who analyzes workout performance and provides personalized weight progression advice. You understand progressive overload, recovery, and injury prevention. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1500,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content?.trim() || '';

    console.log('✅ AI response received:', aiResponse.substring(0, 200));

    // Parse JSON response - extract JSON from markdown or plain text
    let jsonStr = aiResponse;

    // Remove markdown code blocks
    if (jsonStr.includes('```')) {
      // Extract content between ``` markers
      const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (match && match[1]) {
        jsonStr = match[1];
      } else {
        // Fallback: remove all ``` markers
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
    }

    // Find JSON object by looking for { and }
    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
    }

    // AGGRESSIVE trailing comma removal - run multiple times to catch nested cases
    for (let i = 0; i < 5; i++) {
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');  // Remove , before } or ]
      jsonStr = jsonStr.replace(/,(\s*\n\s*[}\]])/g, '$1');  // Remove , before newline then } or ]
      jsonStr = jsonStr.replace(/,\s*,/g, ',');  // Remove double commas
      jsonStr = jsonStr.replace(/,(\s*\r?\n\s*[}\]])/g, '$1');  // Handle Windows line endings
    }

    console.log('📝 Cleaned JSON string:', jsonStr.substring(0, 200));

    let result: AdaptationResult;
    try {
      result = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('❌ JSON parse error. Raw AI response:', aiResponse);
      console.error('❌ Cleaned string:', jsonStr);
      throw new Error('Failed to parse AI response as JSON. The AI may have returned invalid JSON.');
    }

    console.log('✅ Adaptations generated:', result.recommendations.length, 'exercises');
    return result;
  } catch (error) {
    console.error('❌ Error generating adaptations:', error);
    throw new Error('Failed to generate weekly adaptations. Please try again.');
  }
}

/**
 * Apply adaptations to workout templates
 * Updates weights in AsyncStorage based on AI recommendations
 * @param recommendations - AI-generated recommendations
 * @param userEmail - User's email for AsyncStorage key
 * @returns Number of exercises updated
 */
export async function applyAdaptations(
  recommendations: ExerciseRecommendation[],
  userEmail: string
): Promise<number> {
  try {
    console.log('🔒 applyAdaptations() called');
    console.log('  User email:', userEmail);
    console.log('  Recommendations received:', recommendations.length);
    console.log('  Exercise names in recommendations:', recommendations.map(r => r.exerciseName));

    const storageKey = `@muscleup/workout_templates_${userEmail}`;
    console.log('  Storage key:', storageKey);

    const templatesJson = await AsyncStorage.getItem(storageKey);

    if (!templatesJson) {
      console.log('❌ No workout templates found in AsyncStorage');
      return 0;
    }

    console.log('✅ Templates found, parsing...');
    const templates = JSON.parse(templatesJson);
    console.log('  Number of templates:', templates.length);
    console.log('  Template names:', templates.map((t: any) => t.name));

    let updatedCount = 0;

    // Update each template
    for (const template of templates) {
      console.log(`\n📋 Processing template: ${template.name}`);
      console.log('  Exercises in template:', template.exercises.map((e: any) => e.name));

      for (const exercise of template.exercises) {
        console.log(`\n  🔍 Looking for match: "${exercise.name}"`);

        // Find matching recommendation - use EXACT match only to prevent incorrect updates
        // (e.g., "Press" would match "Bench Press", "Overhead Press", "Leg Press")
        const rec = recommendations.find(r => {
          const exactMatch = r.exerciseName.toLowerCase().trim() === exercise.name.toLowerCase().trim();

          console.log(`    Comparing "${r.exerciseName}" with "${exercise.name}": exactMatch = ${exactMatch}`);

          return exactMatch;
        });

        if (rec) {
          console.log(`  ✅ MATCH FOUND: "${exercise.name}" matches "${rec.exerciseName}"`);
          console.log(`    Current sets:`, exercise.sets.map((s: any) => `${s.weight} lbs`));

          // Update all sets with new weight
          for (const set of exercise.sets) {
            const oldWeight = set.weight;
            set.weight = rec.recommendedWeight.toString();
            console.log(`    Set updated: ${oldWeight} → ${set.weight} lbs`);
          }
          updatedCount++;
          console.log(`  ✅ Updated ${exercise.name}: ${rec.currentWeight} → ${rec.recommendedWeight} lbs`);
        } else {
          console.log(`  ❌ NO MATCH for "${exercise.name}"`);
        }
      }
    }

    console.log(`\n💾 Saving ${updatedCount} updates back to AsyncStorage...`);
    console.log('  Storage key:', storageKey);

    // Save updated templates back to AsyncStorage
    await AsyncStorage.setItem(storageKey, JSON.stringify(templates));

    console.log(`✅ AsyncStorage.setItem() completed successfully`);
    console.log(`✅ Applied ${updatedCount} adaptations to templates`);

    // VERIFICATION: Read back from storage to confirm write succeeded
    const verifyJson = await AsyncStorage.getItem(storageKey);
    const verifyTemplates = JSON.parse(verifyJson || '[]');
    console.log('\n🔍 VERIFICATION: Reading back from AsyncStorage...');
    for (const template of verifyTemplates) {
      for (const exercise of template.exercises) {
        const rec = recommendations.find(r =>
          r.exerciseName.toLowerCase().trim() === exercise.name.toLowerCase().trim()
        );
        if (rec) {
          console.log(`  ${exercise.name}: sets now have weight ${exercise.sets[0]?.weight} (expected: ${rec.recommendedWeight})`);
        }
      }
    }

    return updatedCount;
  } catch (error) {
    console.error('❌ Error applying adaptations:', error);
    throw new Error('Failed to apply adaptations to templates');
  }
}

/**
 * Build the AI prompt with user data
 */
async function buildAdaptationPrompt(
  analysis: WeeklyAnalysisResult,
  responses: UserResponses
): Promise<string> {
  // Filter out exercises with invalid weight data (bodyweight exercises or incomplete data)
  const validExercises = analysis.exercises.filter(ex =>
    ex.thisWeek.maxWeight > 0 && !isNaN(ex.thisWeek.maxWeight)
  );

  console.log('🔍 Filtered exercises for AI:', {
    total: analysis.exercises.length,
    valid: validExercises.length,
    filtered: analysis.exercises.filter(ex => ex.thisWeek.maxWeight <= 0 || isNaN(ex.thisWeek.maxWeight)).map(ex => ex.name)
  });

  // Get user's primary goal
  const prefsStr = await AsyncStorage.getItem('@muscleup/preferences');
  const preferences = prefsStr ? JSON.parse(prefsStr) : {};
  const primaryGoal = preferences.primaryGoal || 'general_fitness';

  const goalLabels: Record<string, string> = {
    muscle_gain: 'Build Muscle (Hypertrophy)',
    strength: 'Get Stronger (Powerlifting)',
    weight_loss: 'Lose Weight (Fat Loss + Muscle)',
    athletic_performance: 'Athletic Performance (Sport Conditioning)',
    general_fitness: 'General Fitness (Health & Wellness)',
  };

  // Format exercises for prompt (include ALL valid exercises)
  // Show what they ACTUALLY did last week
  const exercisesText = validExercises
    .map((ex) => {
      // Show actual performance data
      return `- ${ex.name}: ${Math.round(ex.thisWeek.maxWeight)} lbs × ${Math.round(ex.thisWeek.avgReps)} reps, ${ex.thisWeek.totalSets} sets completed`;
    })
    .join('\n');

  console.log('🤖 Sending exercises to AI:', validExercises.map(e => `${e.name}: ${Math.round(e.thisWeek.maxWeight)} lbs × ${Math.round(e.thisWeek.avgReps)} reps`));

  // Week rating interpretation (1-5 scale with emojis)
  const ratingLabel =
    responses.weekRating === 5 ? '🔥 Crushing it' :
    responses.weekRating === 4 ? '💪 Feeling strong' :
    responses.weekRating === 3 ? '🤖 You decide (let Atlas choose based on data)' :
    responses.weekRating === 2 ? '😐 Feeling tired' :
    '😫 Exhausted';

  // Notes text
  const notesText = responses.notes.trim()
    ? `\n- Athlete Notes: "${responses.notes}"`
    : '\n- Athlete Notes: None provided';

  // Goal-specific context
  const goalContextMap: Record<string, string> = {
    muscle_gain: 'Emphasize progressive overload with 8-12 reps for hypertrophy',
    strength: 'Focus on heavy compound lifts with 3-6 reps for max strength',
    weight_loss: 'Higher volume (10-15 reps) to maximize calorie burn while preserving muscle',
    athletic_performance: 'Balance strength, power, and conditioning for sport performance',
    general_fitness: 'Balanced approach for overall health and wellness',
  };
  const goalContext = goalContextMap[primaryGoal] || goalContextMap.general_fitness;

  return `You are Atlas, an expert strength coach. Recommend next week's training weights based on last week's performance.

ATHLETE'S GOAL: ${goalLabels[primaryGoal]} (${goalContext})

LAST WEEK'S TRAINING:
- Workouts: ${analysis.workoutsCompleted} | Volume: ${analysis.totalVolume} lbs | Sets: ${analysis.totalSets}

EXERCISES PERFORMED:
${exercisesText}

ATHLETE FEEDBACK:
- Rating: ${responses.weekRating}/5 (${ratingLabel})${notesText}

DECISION RULES:
Apply to EACH exercise based on rating + set volume:

Rating 5 (🔥 Peak) + 3+ sets → INCREASE +10 lbs (aggressive progression)
Rating 4 (💪 Strong) + 3+ sets → INCREASE +5 lbs (standard progression)
Rating 3 (🤖 Neutral) + 3+ sets → INCREASE +5 lbs (data-driven)
Rating 3 (🤖 Neutral) + 1-2 sets → MAINTAIN (build consistency)
Rating 2 (😐 Tired) → DECREASE -5 lbs (prioritize recovery)
Rating 1 (😫 Exhausted) → DELOAD -10% ALL exercises (they need rest)

SAFETY OVERRIDES:
- If notes mention pain/injury in specific exercise → DECREASE that exercise by 10 lbs, reason: "Rest [bodypart]. Pain isn't normal - reduce load."
- If notes mention illness/sickness → Set shouldDeload: true, reduce ALL by 10%
- Low volume (1-2 sets) + Rating 4-5 → MAINTAIN (don't increase until consistent volume)

OUTPUT RULES:
- "currentWeight" = what they lifted LAST WEEK (from data above)
- "recommendedWeight" = what to lift NEXT WEEK
- "reason" must cite specific data: sets completed, rating, weight change
- Return ONLY valid JSON (no markdown, no trailing commas, no extra text)

JSON FORMAT:
{
  "recommendations": [
    {
      "exerciseName": "Bench Press",
      "currentWeight": 180,
      "recommendedWeight": 185,
      "change": "increase",
      "changeAmount": 5,
      "reason": "6 sets at 180 lbs, rating 4/5 - standard +5 lbs progression."
    }
  ],
  "overallMessage": "Brief summary of the week and overall plan (2 sentences max).",
  "shouldDeload": false
}

Respond with valid JSON only:`;
}
