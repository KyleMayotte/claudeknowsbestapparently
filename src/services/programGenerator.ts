import { OPENAI_API_KEY } from '@env';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Local WorkoutTemplate structure (matches WorkoutScreen)
interface Set {
  id: string;
  reps: string;
  weight: string;
  completed: boolean;
}

interface Exercise {
  id: string;
  name: string;
  sets: Set[];
}

interface WorkoutTemplate {
  id: string;
  name: string;
  emoji: string;
  category?: string;
  exercises: Exercise[];
}

export interface ProgramGeneratorInput {
  goal: 'build_muscle' | 'get_stronger' | 'lose_fat' | 'general_fitness' | 'athletic_performance';
  daysPerWeek: number; // 2-7
  trainingLocation: 'full_gym' | 'home_gym' | 'limited_gym' | 'bodyweight_only';
  timePerSession: '30-45' | '45-60' | '60-90'; // minutes
  notes?: string; // Optional: injuries, preferences, limitations (e.g., "shoulder pain, avoid overhead press")
}

export interface GeneratedProgram {
  programName: string;
  description: string;
  weeklySchedule: {
    dayNumber: number; // 1-7
    workoutName: string;
    focus: string; // e.g., "Upper Body Push", "Lower Body", "Full Body"
    exercises: Array<{
      name: string;
      sets: number;
      reps: string; // e.g., "8-12", "5", "AMRAP"
      startingWeight?: number; // AI-suggested starting weight based on user context
      notes?: string;
    }>;
  }[];
  progressionNotes: string;
  deloadSchedule: string;
}

export interface UserContext {
  age?: number;
  workoutHistory?: any[];
  currentWeight?: number;
}

/**
 * Generate a complete workout program using AI
 * @param existingProgram - Optional existing program to refine
 * @param refinementRequest - Optional user request for changes (e.g., "replace bench press with dumbbell press")
 */
export const generateWorkoutProgram = async (
  input: ProgramGeneratorInput,
  userContext?: UserContext,
  existingProgram?: GeneratedProgram,
  refinementRequest?: string
): Promise<GeneratedProgram> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Training location descriptions
  const locationMap = {
    full_gym: 'Full commercial gym (barbells, dumbbells, machines, cables, racks)',
    home_gym: 'Home gym (barbell, rack, bench, dumbbells, basic equipment)',
    limited_gym: 'Limited equipment (dumbbells, bodyweight, minimal machines)',
    bodyweight_only: 'Bodyweight only (no equipment)',
  };
  const location = locationMap[input.trainingLocation];

  // Time per session
  const timeMap = {
    '30-45': '30-45 minutes per workout',
    '45-60': '45-60 minutes per workout',
    '60-90': '60-90 minutes per workout',
  };
  const sessionTime = timeMap[input.timePerSession];

  const notesText = input.notes ? `\n- Notes: ${input.notes}` : '';

  // Infer experience level from workout history
  const inferExperienceLevel = (): string => {
    if (!userContext?.workoutHistory || userContext.workoutHistory.length === 0) {
      return 'Beginner (no workout history)';
    }
    const workoutCount = userContext.workoutHistory.length;
    if (workoutCount < 20) return 'Beginner (new to training)';
    if (workoutCount < 100) return 'Intermediate (consistent training)';
    return 'Advanced (experienced lifter)';
  };

  const experienceLevel = inferExperienceLevel();
  const ageText = userContext?.age ? `\n- Age: ${userContext.age} years old` : '';
  const weightText = userContext?.currentWeight ? `\n- Body weight: ${userContext.currentWeight} lbs` : '';

  // Goal-specific parameters
  const goalParams = {
    build_muscle: { reps: '8-12', sets: '3-4', focus: 'Hypertrophy (muscle growth)' },
    get_stronger: { reps: '3-5', sets: '5-8', focus: 'Max strength (powerlifting)' },
    lose_fat: { reps: '10-15', sets: '3-4', focus: 'Fat loss + muscle retention' },
    athletic_performance: { reps: '6-10', sets: '3-5', focus: 'Power + conditioning' },
    general_fitness: { reps: '8-12', sets: '3-4', focus: 'General health + wellness' },
  }[input.goal] || { reps: '8-12', sets: '3-4', focus: 'Balanced training' };

  // Build refinement context if refining existing program
  let refinementContext = '';
  if (existingProgram && refinementRequest) {
    refinementContext = `
=== REFINEMENT MODE ===
You are refining an existing program. The user wants to make changes but keep what's working.

EXISTING PROGRAM:
${JSON.stringify(existingProgram, null, 2)}

USER'S REFINEMENT REQUEST:
"${refinementRequest}"

REFINEMENT RULES:
- ONLY change what the user specifically requests
- Keep exercises, sets, reps, and structure that aren't mentioned in the request
- If user says "replace X with Y", swap ONLY that exercise
- If user says "I don't have X equipment", replace exercises requiring X with alternatives
- If user says "add more Y", increase volume/exercises for muscle group Y
- If user says "remove X", delete that exercise and optionally suggest replacement
- Maintain the same programName, description, and overall structure unless specifically requested
- Keep the same number of training days unless user requests change
- Preserve startingWeight values for exercises that aren't being replaced

EXAMPLES:
Request: "I don't have a barbell, replace barbell exercises with dumbbells"
→ Replace "Barbell Bench Press" with "Dumbbell Bench Press", keep everything else

Request: "Replace deadlifts with Romanian deadlifts"
→ Swap ONLY that exercise, keep sets/reps similar, adjust weight if needed

Request: "Add more shoulder work to Day 1"
→ Add 1-2 shoulder exercises to Day 1, keep other days unchanged

=== END REFINEMENT MODE ===
`;
  }

  const prompt = `${refinementContext}Design an 8-week program for ${goalParams.focus}.

ATHLETE SPECS:
- Training days: ${input.daysPerWeek}x/week
- Training location: ${location}
- Time per session: ${sessionTime}
- Experience level: ${experienceLevel}${ageText}${weightText}${notesText}

PROGRAM RULES:
- Goal-specific volume: ${goalParams.sets} sets × ${goalParams.reps} reps
- Progressive overload: increase weight when hitting top of rep range
- Deload every 4-6 weeks (60% volume, same weights)
- Recovery: don't program deadlifts day after squats, allow 48h between muscle groups
- Warm-up: include "notes" field for main lifts (e.g., "2 warm-up sets, then 3 working sets")
- Time constraint: Start with ${sessionTime} baseline, BUT if notes specify different time (e.g., "only 10 minutes"), prioritize that and adjust exercise count accordingly (10 min = 2-3 exercises max)
- Equipment: Start with ${input.trainingLocation} equipment baseline, BUT if notes specify exact equipment availability, prioritize that (e.g., "no squat rack" means no back squats even for home_gym)
- Starting weights: Suggest conservative starting weights for each exercise based on age/experience/body weight (use "startingWeight" field in lbs). Be VERY conservative - better to start light than risk injury.

SAFETY:
- Respect any injuries/limitations mentioned in notes
- Include mobility work if needed (e.g., "Hip Flexor Stretch" for lower back issues)
- Bodyweight-only programs: focus on progressive calisthenics (adding reps, tempo, difficulty variations)

JSON FORMAT:
{
  "programName": "Descriptive name",
  "description": "1-2 sentences on program philosophy",
  "weeklySchedule": [
    {
      "dayNumber": 1,
      "workoutName": "Day 1: Push",
      "focus": "Chest, Shoulders, Triceps",
      "exercises": [
        {"name": "Barbell Bench Press", "sets": 4, "reps": "6-8", "startingWeight": 135, "notes": "2 warm-up sets at 95 and 115 lbs, then 3 working sets"},
        {"name": "Incline Dumbbell Press", "sets": 3, "reps": "8-12", "startingWeight": 30},
        {"name": "Push-ups", "sets": 3, "reps": "10-15"}
      ]
    }
  ],
  "progressionNotes": "Add 5lbs to compounds, 2.5lbs to accessories when top of range hit.",
  "deloadSchedule": "Week 4, 8, 12: 60% volume, same weight"
}

PROGRAM NAME RULES:
- Keep it SHORT (2-4 words max) - it becomes a category filter
- Format: "[Split/Style] [Focus]" - prioritize the training style/split over equipment type
- DON'T include equipment type (bodyweight/home gym) unless it's truly unique to the program
- User already selected equipment in the form - they know what they chose!
- BAD (too long): "8-Week Beginner Bodyweight Hypertrophy Program" ❌
- BAD (redundant): "Bodyweight Hypertrophy" (user already picked bodyweight only) ❌
- GOOD: "PPL Hypertrophy" ✅
- GOOD: "Full Body Strength" ✅
- GOOD: "Upper/Lower Split" ✅
- GOOD: "Push/Pull/Legs" ✅

OUTPUT:
- Return ONLY valid JSON (no markdown, no trailing commas)
- Include ${input.daysPerWeek} days in weeklySchedule
- 4-8 exercises per workout
- Specific exercise names ("Barbell Squat" not "Squats")
- Include "startingWeight" for weighted exercises (omit for bodyweight exercises like push-ups, pull-ups)
- Conservative starting weights: Beginners should start with empty bar (45 lbs) or light dumbbells (10-20 lbs)
- IMPORTANT: programName must be 2-4 words max (this becomes a category name)

Generate program:`;

  try {
    console.log('🤖 Generating workout program...');

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
            content: 'You are an expert strength coach specializing in program design. Prioritize injury prevention, appropriate volume for experience level, and sustainable progression. Return only valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content?.trim() || '';

    console.log('✅ AI response received');

    // Parse JSON response
    // Remove markdown code blocks if present
    let jsonStr = aiResponse;
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }

    const program: GeneratedProgram = JSON.parse(jsonStr.trim());

    console.log('✅ Program generated:', program.programName);
    return program;
  } catch (error) {
    console.error('❌ Error generating program:', error);
    throw new Error('Failed to generate workout program. Please try again.');
  }
};

/**
 * Convert generated program to workout templates
 * Returns an array of templates (one per workout day)
 */
export const convertProgramToTemplates = (
  program: GeneratedProgram
): WorkoutTemplate[] => {
  return program.weeklySchedule.map((day, dayIndex) => {
    const timestamp = Date.now() + dayIndex * 1000; // Ensure unique IDs

    const exercises = day.exercises.map((ex, exIndex) => {
      // Create sets array with proper structure
      // Pre-fill reps with bottom of range (e.g., "8" from "8-12")
      const repsBottomOfRange = ex.reps.split('-')[0] || ex.reps;

      // Pre-fill weight if AI provided a starting weight
      const startingWeight = ex.startingWeight?.toString() || '';

      const sets = Array.from({ length: ex.sets }, (_, setIndex) => ({
        id: `${timestamp}-${exIndex}-${setIndex}`,
        reps: repsBottomOfRange,
        weight: startingWeight,
        completed: false,
      }));

      return {
        id: `${timestamp}-${exIndex}`,
        name: ex.name,
        sets: sets,
      };
    });

    return {
      id: `${timestamp}`,
      name: day.workoutName,
      emoji: '🤖', // AI-generated workouts get robot emoji
      category: program.programName,
      exercises,
    };
  });
};
