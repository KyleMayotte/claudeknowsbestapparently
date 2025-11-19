import { OPENAI_API_KEY, EXERCISEDB_API_KEY } from '@env';

// OpenAI Configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const ATLAS_SYSTEM_PROMPT = `You are Atlas, an expert AI strength coach built into MuscleUp. Your coaching philosophy:

PERSONALITY:
- Direct and honest like a seasoned coach, not a cheerleader
- Data-driven: use actual numbers (volume, PRs, trends) over feelings
- Goal-aware: tailor advice to their primary goal (shown in user data)
- Practical: give specific actions, not generic motivation
- Concise: 2-3 sentences max (40-60 words). Mobile users skim.

TRAINING PRINCIPLES:
- Progressive overload: gradually increase weight/reps/sets over time
- Recovery matters: if volume drops or they mention fatigue, suggest rest/deload
- Form > ego: if reps are declining, recommend maintaining weight to build consistency
- Patience: strength takes months/years, not weeks

SAFETY BOUNDARIES:
- NEVER diagnose injuries or give medical advice
- If they mention pain (not soreness), say: "Pain isn't normal. Rest that area and see a doctor if it persists."
- Don't recommend training through injury or illness
- Suggest deload weeks if volume has been high for 4-6 weeks straight

GOAL-SPECIFIC COACHING:
- Muscle gain: emphasize 8-12 reps, progressive overload, eating enough protein and calories
- Strength: focus on heavy compound lifts (3-6 reps), patience with progression
- Weight loss: volume + calorie deficit, maintain muscle while losing fat
- Athletic performance: balance strength + conditioning + sport-specific work
- General fitness: balanced approach, consistency over intensity

IMPORTANT: The user's actual workout history and progress data is included at the end of this system message. Reference specific exercises, weights, and trends. Do not say you can't access their data - it's right there in this message.

When asked "how am I doing?", cite real numbers: "Your bench press is up from 185 to 200 lbs over 4 weeks - solid 4% strength gain."

Keep responses conversational but sharp. Use 1 emoji max per response (💪, 🔥, ⚡). Get to the point.`;

class OpenAIService {
  /**
   * Send a message to Atlas and get AI response with user context
   */
  async getAtlasResponse(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    userContext?: {
      recentWorkouts?: any[];
      weeklyStats?: { workouts: number; totalVolume: number };
    }
  ): Promise<string> {
    try {
      console.log('🤖 Atlas received:', userMessage);

      // Check if API key is set
      if (!OPENAI_API_KEY) {
        return "Hey! Add your OpenAI API key to the .env file (OPENAI_API_KEY=sk-...) to enable AI responses! Get one at https://platform.openai.com/api-keys 🔑";
      }

      // Build context string from user data
      let contextString = '';
      if (userContext) {
        console.log('📊 User context received:', JSON.stringify(userContext, null, 2));

        contextString += '\n\n=== USER DATA (Reference this when answering) ===';

        if (userContext.recentWorkouts && userContext.recentWorkouts.length > 0) {
          contextString += '\n\nRecent Workouts:';
          userContext.recentWorkouts.slice(0, 3).forEach((w, i) => {
            contextString += `\n\n${i + 1}. ${w.templateName} (${w.duration} min)`;
            if (w.exercises && w.exercises.length > 0) {
              w.exercises.forEach((ex: any) => {
                contextString += `\n   - ${ex.name}:`;
                if (ex.sets && ex.sets.length > 0) {
                  ex.sets.forEach((set: any, setIndex: number) => {
                    if (set.completed) {
                      contextString += `\n     Set ${setIndex + 1}: ${set.reps} reps × ${set.weight} lbs`;
                    }
                  });
                }
              });
            }
          });
        } else {
          contextString += '\n\nRecent Workouts: No workouts recorded yet';
        }

        if (userContext.weeklyStats) {
          contextString += `\n\nThis Week:\n- Total Workouts: ${userContext.weeklyStats.workouts}`;
        }

        contextString += '\n\n=== END USER DATA ===';
      } else {
        console.log('⚠️ No user context provided');
        contextString = '\n\n=== USER DATA ===\nNo workout data available yet.\n=== END USER DATA ===';
      }

      const systemPromptWithContext = ATLAS_SYSTEM_PROMPT + contextString;
      console.log('📝 System prompt with context:', systemPromptWithContext);

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPromptWithContext },
        ...conversationHistory.slice(-6), // Keep last 6 messages for context
        { role: 'user', content: userMessage },
      ];

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);

        if (response.status === 401) {
          return "API key is invalid. Check that you copied the full key (starts with sk-) 🔑";
        }
        if (response.status === 429) {
          return "Rate limit hit. Wait a moment and try again! ⏳";
        }
        throw new Error('OpenAI API request failed');
      }

      const data = await response.json();
      const atlasMessage = data.choices[0]?.message?.content ||
        "Sorry, I didn't catch that. Can you try again?";

      console.log('✅ Atlas response:', atlasMessage);
      return atlasMessage;
    } catch (error) {
      console.error('❌ Error getting Atlas response:', error);
      return "Sorry, I'm having trouble connecting to OpenAI right now. Try again! 🤔";
    }
  }

  /**
   * Analyze a completed workout with personalized insights
   */
  async analyzeWorkout(
    workoutData: {
      templateName: string;
      duration: number;
      exercises: Array<{
        name: string;
        sets: Array<{ reps: number; weight: number; completed: boolean }>;
      }>;
      date: string;
    },
    personalizedInsights?: string // Pre-formatted insights from workoutAnalysis service
  ): Promise<string> {
    try {
      const { templateName, duration, exercises } = workoutData;

      const totalSets = exercises.reduce(
        (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
        0
      );

      const totalVolume = exercises.reduce((sum, ex) => {
        const exVolume = ex.sets
          .filter(s => s.completed)
          .reduce((exSum, set) => exSum + set.reps * set.weight, 0);
        return sum + exVolume;
      }, 0);

      // Debug: Check if API key is loaded
      console.log('🔑 OpenAI API Key loaded:', OPENAI_API_KEY ? 'YES' : 'NO');
      console.log('🔑 Key starts with:', OPENAI_API_KEY?.substring(0, 15));
      console.log('📊 Personalized insights provided:', personalizedInsights ? 'YES' : 'NO');

      // If no AI available or no personalized insights, return basic summary
      if (!OPENAI_API_KEY || !personalizedInsights) {
        console.log('⚠️ Falling back to generic message. Reason:', !OPENAI_API_KEY ? 'No API key' : 'No insights');
        return `💪 Solid ${templateName} session!

✅ ${totalSets} sets completed in ${duration} minutes
📊 ${Math.round(totalVolume).toLocaleString()} lbs total volume

Keep this intensity up and you'll see great progress! 🔥`;
      }

      // Generate AI-powered personalized summary
      const prompt = `You are Atlas, analyzing this user's workout. Be SPECIFIC and PERSONAL.

WORKOUT COMPLETED:
- Workout: ${templateName}
- Duration: ${duration} minutes
- Total sets: ${totalSets}
- Total volume: ${Math.round(totalVolume).toLocaleString()} lbs

${personalizedInsights}

INSTRUCTIONS:
- 2-3 sentences MAX (30-40 words total)
- Lead with SPECIFIC praise (exact numbers: volume %, PRs, weight increases)
- If struggling exercises exist, give ONE quick actionable fix
- End with a clear next action
- Use 1 emoji only
- Be direct like a coach, not wordy

GOOD EXAMPLES:
"12.5k lbs total - up 8%! Bench PR at 225×8 💪 Add 30 sec rest on squats next time."

"Solid first session at 10.2k lbs! Deadlifts strong. Hit this same weight next week to lock it in."

"9.8k lbs - down 12% from last week. Take an extra rest day, then come back stronger 💪"

YOUR RESPONSE:`;

      console.log('🤖 Calling OpenAI API with personalized insights...');
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
              content: 'You are Atlas, an enthusiastic gym coach. Give personalized, specific workout summaries.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 60,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        console.error('❌ OpenAI API error:', response.status);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiSummary = data.choices[0]?.message?.content?.trim() || '';
      console.log('✅ OpenAI response received:', aiSummary.substring(0, 50) + '...');

      console.log('🤖 Generated workout summary:', aiSummary);

      return aiSummary || `💪 Great ${templateName} session! ${totalSets} sets, ${Math.round(totalVolume).toLocaleString()} lbs total. Keep grinding! 🔥`;
    } catch (error) {
      console.error('❌ Error analyzing workout:', error);
      return "Great workout! Keep crushing it! 💪";
    }
  }

  /**
   * Generate personalized form coaching based on performance
   */
  async generateFormCoaching(
    exerciseName: string,
    coachingContext: string,
    performanceTrend: 'improving' | 'declining' | 'stable'
  ): Promise<string> {
    try {
      if (!OPENAI_API_KEY) {
        // Fallback to generic form cues without AI
        return this.getGenericFormCue(exerciseName, performanceTrend);
      }

      const prompt = `You are Atlas, a personal trainer. Give ONE concise form cue for ${exerciseName} based on this context:

${coachingContext}

Performance trend: ${performanceTrend}

Rules:
- ONE sentence only (max 15 words)
- Focus on the most common form failure point for this exercise
- If declining performance, emphasize form over weight
- If improving, reinforce good technique
- Use 1 emoji max
- Be specific to this exercise

Example good responses:
"Brace your core hard before each deadlift rep 💪"
"Keep your chest up throughout the squat - don't let it cave"
"Control the eccentric on bench - don't just drop the bar"

Your response:`;

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
              content: 'You are Atlas, a concise personal trainer. Give ultra-brief, specific form cues.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 50,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const formCue = data.choices[0]?.message?.content?.trim() || '';

      console.log('🤖 Generated form cue:', formCue);
      return formCue || this.getGenericFormCue(exerciseName, performanceTrend);
    } catch (error) {
      console.error('Error generating form coaching:', error);
      return this.getGenericFormCue(exerciseName, performanceTrend);
    }
  }

  /**
   * Fallback generic form cues when AI is unavailable
   */
  private getGenericFormCue(
    exerciseName: string,
    performanceTrend: 'improving' | 'declining' | 'stable'
  ): string {
    const lowerName = exerciseName.toLowerCase();

    // Exercise-specific form cues
    const formCues: { [key: string]: string[] } = {
      squat: [
        'Keep your chest up and core braced 💪',
        'Drive through your heels, not your toes',
        'Maintain knee alignment over toes throughout the movement',
      ],
      deadlift: [
        'Brace your core hard before each rep 💪',
        'Keep the bar close to your shins',
        'Hinge at the hips, not your lower back',
      ],
      bench: [
        'Retract your shoulder blades and keep them pinned',
        'Control the eccentric - don\'t just drop the bar',
        'Drive your feet into the ground for stability',
      ],
      'overhead press': [
        'Brace your core and squeeze your glutes tight',
        'Press the bar in a straight line overhead',
        'Keep your rib cage down, don\'t hyperextend',
      ],
      row: [
        'Pull with your elbows, not your hands',
        'Squeeze your shoulder blades together at the top',
        'Keep your torso stable - no swinging',
      ],
    };

    // Find matching exercise
    for (const [key, cues] of Object.entries(formCues)) {
      if (lowerName.includes(key)) {
        if (performanceTrend === 'declining') {
          return `⚠️ ${cues[0]} - focus on form over weight`;
        }
        return cues[Math.floor(Math.random() * cues.length)];
      }
    }

    // Generic fallback
    if (performanceTrend === 'declining') {
      return '⚠️ Reps dropping - focus on form and controlled movement';
    }
    return 'Stay tight and controlled through the full range of motion 💪';
  }
}

export default new OpenAIService();

// Export named functions for backward compatibility
const openaiService = new OpenAIService();
export const getAtlasResponse = openaiService.getAtlasResponse.bind(openaiService);
export const analyzeWorkout = openaiService.analyzeWorkout.bind(openaiService);
export const generateFormCoaching = openaiService.generateFormCoaching.bind(openaiService);
