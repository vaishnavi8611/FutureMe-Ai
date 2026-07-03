const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;
let ai = null;

if (apiKey && apiKey !== 'your_gemini_api_key' && apiKey.trim() !== '') {
    try {
        console.log('✨ Initializing Gemini AI Client...');
        ai = new GoogleGenAI({ apiKey });
    } catch (e) {
        console.error('Failed to initialize GoogleGenAI client:', e.message);
    }
} else {
    console.warn('⚠️ GEMINI_API_KEY is missing. FutureMe will run in MOCK AI Generation Mode.');
}

const TONE_TEMPLATES = {
    "Motivational": "Be a beacon of hope and high energy. Focus on progress, inspire them to run through walls, and tell them that the struggle is only temporary proof that they are growing. Use words like 'champion', 'momentum', 'becoming', and validate their hard work.",
    "Brutally Honest": "Do not sugarcoat anything. Call out excuses, laziness, or looking for shortcuts. Tell them that their current habits are the reason they are stuck. Be direct, punchy, and force deep accountability. No fluff, just hard truths.",
    "Calm Mentor": "Be peaceful, wise, and deeply reflective. Highlight that consistency is better than intensity. Speak of patience, small daily steps, and the power of compound changes. Create a sense of calm and reassurance.",
    "CEO Mode": "Treat their life as a high-growth startup. Focus on execution, high-leverage activities, ruthlessly eliminating low-value tasks, and systemizing habits. Be objective, strategic, and metrics-oriented. Speak of ROI, scaling, and operational efficiency."
};

const geminiService = {
    // Generate the initial FutureMe payload
    async generateFutureMe(name, age, goal, struggle, futureVision, tone, memoryContext = '') {
        const tonePrompt = TONE_TEMPLATES[tone] || TONE_TEMPLATES["Calm Mentor"];
        
        const systemInstruction = `You are the Future self of ${name} (who is currently ${age} years old).
You have successfully achieved the goal of: "${goal}".
You struggled with: "${struggle}", but overcame it.
You are now living the 1-year vision: "${futureVision}".

Tone:
${tonePrompt}

Memory context (use this historical info to show you remember their past details):
${memoryContext || 'No previous sessions registered yet.'}

Format guidelines:
Write a personal, emotional, and practical response. You must reply strictly in JSON format matching the schema:
{
  "message": "A personalized letter/message from your future self of about 2-3 paragraphs, discussing the struggles and how they were solved.",
  "futureIdentity": "A bold identity title (e.g. 'The Disciplined Creator' or 'The Balanced Founder')",
  "nextMoves": ["Actionable step 1", "Actionable step 2", "Actionable step 3"],
  "habit": "One precise micro-habit to start today (e.g., 'Write 200 words every morning at 7am')"
}
Do NOT include markdown syntax (like \`\`\`json) in the raw output if possible, just return valid JSON.`;

        if (!ai) {
            // Fallback mock generation
            return this.getMockGeneration(name, age, goal, struggle, futureVision, tone);
        }

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: 'Generate my FutureMe guidance.',
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: 'OBJECT',
                        properties: {
                            message: { type: 'STRING' },
                            futureIdentity: { type: 'STRING' },
                            nextMoves: {
                                type: 'ARRAY',
                                items: { type: 'STRING' }
                            },
                            habit: { type: 'STRING' }
                        },
                        required: ['message', 'futureIdentity', 'nextMoves', 'habit']
                    }
                }
            });

            const text = response.text;
            return JSON.parse(text);
        } catch (e) {
            console.error('Gemini generateFutureMe API error, falling back to mock:', e.message);
            return this.getMockGeneration(name, age, goal, struggle, futureVision, tone);
        }
    },

    // Chat with FutureMe context
    async chatWithFutureMe(session, chatHistory, userMessage) {
        const { name, age, goal, struggle, future_vision, tone, ai_response } = session;
        const tonePrompt = TONE_TEMPLATES[tone] || TONE_TEMPLATES["Calm Mentor"];

        const systemInstruction = `You are the Future self of ${name} (age ${age}), speaking from the future where you achieved: "${goal}".
You overcame: "${struggle}" and are now living as "${ai_response.futureIdentity || 'the best version of you'}".
Keep the persona consistent with the tone: ${tonePrompt}.

Here is the conversation history:
${chatHistory.map(h => `${h.role === 'user' ? 'User' : 'Future Me'}: ${h.content}`).join('\n')}

Response constraints:
- Speak directly as their future self.
- Be supportive but align with your designated tone.
- Keep responses relatively brief (1-2 paragraphs max) and conversational.
- Focus on practical, reflective, and mindset guidance.`;

        if (!ai) {
            return this.getMockChatResponse(tone, userMessage);
        }

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: userMessage,
                config: {
                    systemInstruction: systemInstruction
                }
            });
            return response.text;
        } catch (e) {
            console.error('Gemini chat API error, falling back to mock:', e.message);
            return this.getMockChatResponse(tone, userMessage);
        }
    },

    // Generate weekly future letter
    async generateWeeklyLetter(name, goal, struggle, habits, recentMessages = []) {
        const systemInstruction = `You are the future self of ${name}.
Your current goal you're striving for: "${goal}".
Your current struggle: "${struggle}".
Current habits you are trying to implement: ${JSON.stringify(habits)}.
Recent reflections: ${JSON.stringify(recentMessages)}.

Write a weekly update letter from the future self.
It should feel like a letter received in the mail. Start with a warm, personal greeting and end with a signature from 'Future ${name}'.
Reflect on their week, provide advice on their current struggle, and keep them motivated.
Return JSON matching:
{
  "subject": "A compelling email subject line (e.g. 'A quick note from next year, ${name}')",
  "content": "Full letter text, including paragraphs, greeting, and sign-off."
}`;

        if (!ai) {
            return {
                subject: `A quick note from next year, ${name}`,
                content: `Dear ${name},\n\nI wanted to reach out because I know this week was a bit of a grind. You've been working hard on "${goal}", and I can see the moments where "${struggle}" made you want to take a step back. But I'm writing to tell you: it's worth it.\n\nThe habits you're building today are the foundation of everything we have here in the future. Keep going. I'm waiting for you.\n\nWith love,\nFuture ${name}`
            };
        }

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: 'Write my weekly letter.',
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: 'OBJECT',
                        properties: {
                            subject: { type: 'STRING' },
                            content: { type: 'STRING' }
                        },
                        required: ['subject', 'content']
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (e) {
            console.error('Gemini weekly letter error:', e.message);
            return {
                subject: `A quick note from next year, ${name}`,
                content: `Dear ${name},\n\nI wanted to reach out because I know this week was a bit of a grind. You've been working hard on "${goal}", and I can see the moments where "${struggle}" made you want to take a step back. But I'm writing to tell you: it's worth it.\n\nThe habits you're building today are the foundation of everything we have here in the future. Keep going. I'm waiting for you.\n\nWith love,\nFuture ${name}`
            };
        }
    },

    // Extract user memory insights
    async extractMemory(name, goal, struggle, futureVision, aiResponse, currentMemory = null) {
        if (!ai) {
            return {
                goals: Array.from(new Set([...(currentMemory?.goals || []), goal])),
                fears: Array.from(new Set([...(currentMemory?.fears || []), struggle])),
                habits: Array.from(new Set([...(currentMemory?.habits || []), aiResponse.habit])),
                recurring_challenges: Array.from(new Set([...(currentMemory?.recurring_challenges || []), struggle]))
            };
        }

        const systemInstruction = `You are a memory extractor. Analyze the user's latest inputs and the AI response, and merge them into their existing memory profile.
Ensure we keep lists unique, focused, and concise (max 5 items each).

Existing Memory Profile:
${JSON.stringify(currentMemory || {})}

Latest inputs:
Goal: "${goal}"
Struggle: "${struggle}"
Vision: "${futureVision}"
Recommended Habit: "${aiResponse.habit}"

Return JSON matching:
{
  "goals": ["Goal 1", "Goal 2"],
  "fears": ["Fear/Struggle 1", "Fear/Struggle 2"],
  "habits": ["Habit 1", "Habit 2"],
  "recurring_challenges": ["Challenge 1", "Challenge 2"]
}`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: 'Extract memory.',
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: 'OBJECT',
                        properties: {
                            goals: { type: 'ARRAY', items: { type: 'STRING' } },
                            fears: { type: 'ARRAY', items: { type: 'STRING' } },
                            habits: { type: 'ARRAY', items: { type: 'STRING' } },
                            recurring_challenges: { type: 'ARRAY', items: { type: 'STRING' } }
                        },
                        required: ['goals', 'fears', 'habits', 'recurring_challenges']
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (e) {
            console.error('Gemini memory extraction error, falling back to manual merge:', e.message);
            return {
                goals: Array.from(new Set([...(currentMemory?.goals || []), goal])),
                fears: Array.from(new Set([...(currentMemory?.fears || []), struggle])),
                habits: Array.from(new Set([...(currentMemory?.habits || []), aiResponse.habit])),
                recurring_challenges: Array.from(new Set([...(currentMemory?.recurring_challenges || []), struggle]))
            };
        }
    },

    // Fallback Mock data generators
    getMockGeneration(name, age, goal, struggle, futureVision, tone) {
        let message = '';
        let futureIdentity = '';
        let nextMoves = [];
        let habit = '';

        if (tone === "Motivational") {
            message = `Hey ${name}, I am the version of you who stayed committed long enough to see the results. The dream of "${goal}" became reality because you kept moving when progress felt invisible. Yes, struggling with "${struggle}" was tough at age ${age}, but it was the exact training ground you needed to build the grit that defines us now. Don't slow down!`;
            futureIdentity = "The Unstoppable Creator";
            nextMoves = [
                `Turn "${goal}" into a measurable weekly target.`,
                `Dedicate 1 hour every morning to building visible proof of your progress.`,
                `Surround yourself with people who talk about the future, not the past.`
            ];
            habit = "Perform 15 minutes of visualization and goal-setting before opening your phone every morning.";
        } else if (tone === "Brutally Honest") {
            message = `Hey ${name}, your biggest obstacle was never "${struggle}". It was waiting for certainty and looking for excuses. The future you wanted only arrived when excuses stopped receiving attention. If you want to achieve "${goal}", stop talking about it and start executing. Your current routine is actively pushing us away from "${futureVision}". Change it.`;
            futureIdentity = "The Disciplined Operator";
            nextMoves = [
                `Audit your daily screen time and delete the top 2 distractions today.`,
                `Write down exactly what you did today to get closer to "${goal}". If it's zero, own it.`,
                `Stop planning and ship one small feature or piece of work by tomorrow.`
            ];
            habit = "Log every hour of your day in a spreadsheet to eliminate procrastination.";
        } else if (tone === "Calm Mentor") {
            message = `Hello ${name}. The path toward "${goal}" became clearer once you focused on consistency instead of intensity. At age ${age}, "${struggle}" felt overwhelming, but progress is quieter than you expected. You don't need to conquer the mountain today—just focus on today's steps. Be kind to yourself; you are doing better than you think.`;
            futureIdentity = "The Centered Guide";
            nextMoves = [
                `Establish a calm, distraction-free evening routine to recover your energy.`,
                `Identify the single highest-impact action for "${goal}" and do it slowly and deeply.`,
                `Take a 10-minute quiet walk every day to let your mind process creative ideas.`
            ];
            habit = "Meditate for 10 minutes at start of day to set a calm, intentional state.";
        } else { // CEO Mode
            message = `${name}, execution changed everything. The vision of "${goal}" was achieved because you learned to prioritize high-leverage actions and eliminate noise. Wrestling with "${struggle}" was a resource bottleneck, but we optimized our focus and automated the rest. View your life as an enterprise: cut the losses, scale the wins.`;
            futureIdentity = "The Chief Executive";
            nextMoves = [
                `Create a weekly dashboard tracking key metrics relating to "${goal}".`,
                `Outsource, delegate, or automate the routine tasks draining your energy.`,
                `Schedule a weekly 1-hour strategic review to pivot your approach where needed.`
            ];
            habit = "Write your top 3 needle-moving priorities every night for the next day.";
        }

        return { message, futureIdentity, nextMoves, habit };
    },

    getMockChatResponse(tone, userMessage) {
        const responses = {
            "Motivational": [
                "Keep that energy! Remember, every rep counts. The version of you in the future is proud of this exact effort.",
                "Yes! You are closer than you think. Double down on what worked today, and don't let temporary setbacks slow you down."
            ],
            "Brutally Honest": [
                "Is that an actual obstacle, or are you just negotiating with your goals? You know what needs to be done. Do it.",
                "Let's cut the fluff. If you spent as much time executing as you do analyzing, you'd already be here."
            ],
            "Calm Mentor": [
                "Breathe. It is okay if today was slow. The important thing is you showed up. Compound growth works in silence.",
                "Take a step back. What is the smallest, easiest thing you can do right now to move forward by just 1%?"
            ],
            "CEO Mode": [
                "Let's look at the metrics. What is the return on investment for this task? If it's not moving the needle, delegate or drop it.",
                "Understood. We need to optimize our daily workflow. Let's list the top blockers and create action items for each."
            ]
        };

        const list = responses[tone] || responses["Calm Mentor"];
        return list[Math.floor(Math.random() * list.length)];
    }
};

module.exports = geminiService;
