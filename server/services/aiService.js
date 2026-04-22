const Groq = require('groq-sdk');
const { DateTime } = require('luxon'); // ← import luxon

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

async function callGroq(systemPrompt, userMessage) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 1024,
  });
  return response.choices[0].message.content;
}

async function parseTaskFromPrompt(userPrompt, timezone = 'Asia/Kolkata') {
  // Get the current local time properly using luxon
  const localNow = DateTime.now().setZone(timezone);

  const systemPrompt = `You are a task extraction assistant.
When given a user's message, extract task information and return ONLY a valid JSON object.
No extra text, no markdown, no explanation — just raw JSON.

CURRENT TIME INFO:
- User's current local time: ${localNow.toFormat('cccc, LLLL d, yyyy, hh:mm a')} (${timezone})
- User's current date: ${localNow.toFormat('yyyy-MM-dd')}

CRITICAL RULES FOR DATES:
- Output ALL dates and times in the user's LOCAL timezone, NOT in UTC
- Use ISO 8601 format but in LOCAL time: "yyyy-MM-ddTHH:mm:ss"
- Do NOT convert to UTC. Do NOT add or subtract any hours.
- "today" means ${localNow.toFormat('yyyy-MM-dd')}
- "tomorrow" means ${localNow.plus({ days: 1 }).toFormat('yyyy-MM-dd')}
- "tonight" means today after 6pm: ${localNow.toFormat('yyyy-MM-dd')}T18:00:00

The JSON must have these exact fields:
- title (string, required): short task name
- description (string): more detail if mentioned, else empty string
- priority (string): "low", "medium", or "high"
- dueDate (string or null): LOCAL time ISO string, null if no date mentioned
- notifyAt (string or null): LOCAL time ISO string for notification
    Rules:
    - "notify/remind me X mins/hours before" → subtract from dueDate
    - "remind me at [specific time]" → use that exact local time
    - dueDate exists but no notify mentioned → set SAME as dueDate
    - no dueDate → null
- tags (array of strings): e.g. ["work", "personal"]
- status (string): always "pending"

Example — user says "wake me up at 4:50 am today" in Asia/Kolkata timezone:
{"title":"Wake Up","description":"","priority":"high","dueDate":"${localNow.toFormat('yyyy-MM-dd')}T04:50:00","notifyAt":"${localNow.toFormat('yyyy-MM-dd')}T04:50:00","tags":[],"status":"pending"}`;

  const rawText = await callGroq(systemPrompt, userPrompt);
  const cleaned = rawText.replace(/```json|```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);

    // ── Server-side conversion: local time → UTC using luxon ──────────────
    // This is reliable, unlike asking the AI to do it
    if (parsed.dueDate) {
      parsed.dueDate = DateTime.fromISO(parsed.dueDate, { zone: timezone })
        .toUTC()
        .toISO();
    }
    if (parsed.notifyAt) {
      parsed.notifyAt = DateTime.fromISO(parsed.notifyAt, { zone: timezone })
        .toUTC()
        .toISO();
    }

    return parsed;
  } catch (err) {
    throw new Error('AI returned invalid JSON: ' + cleaned);
  }
}

async function findTasksWithAI(userQuery, allTasks) {
  const systemPrompt = `You are a task search assistant.
Return ONLY a JSON array of matching task _id strings. No markdown, no explanation.
Think semantically — "urgent" = high priority, "done" = completed status, "recent" = newest.
Return [] if nothing matches.`;

  const userMessage = `Search query: "${userQuery}"\n\nTasks:\n${JSON.stringify(allTasks, null, 2)}`;
  const rawText = await callGroq(systemPrompt, userMessage);
  const cleaned = rawText.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error('AI returned invalid JSON: ' + cleaned);
  }
}

module.exports = { parseTaskFromPrompt, findTasksWithAI };