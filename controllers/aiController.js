const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── 1. AI Event Description Generator ─────────────────────────────────────
const generateDescription = async (req, res) => {
  try {
    const { title, category, venue, date, tags } = req.body;

    if (!title) return res.status(400).json({ success: false, message: 'Event title is required.' });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Write an engaging event description for a university event with these details:
Title: ${title}
Category: ${category || 'General'}
Venue: ${venue || 'University Campus'}
Date: ${date || 'Upcoming'}
Tags: ${tags || 'university, campus'}

Write 3-4 sentences. Be enthusiastic, informative, and student-friendly. Do not use bullet points. Just write the paragraph directly.`
      }]
    });

    const description = message.content[0].text;
    res.json({ success: true, description });

  } catch (err) {
    console.error('AI generate error:', err);
    res.status(500).json({ success: false, message: 'AI generation failed.' });
  }
};

// ── 2. Campus AI Chatbot ───────────────────────────────────────────────────
const chatbot = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) return res.status(400).json({ success: false, message: 'Message is required.' });

    const messages = [
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: `You are a helpful campus assistant for Campus Connect, a university event management platform. 
You help students and faculty with:
- Finding and discovering campus events
- How to RSVP and register for events
- How to create and organize events (for organizers)
- General university event FAQs
- Tips for organizing successful university events

Keep responses concise, friendly, and helpful. If asked about something unrelated to campus events, politely redirect to your area of expertise.`,
      messages
    });

    const reply = response.content[0].text;
    res.json({
      success: true,
      reply,
      updatedHistory: [...messages, { role: 'assistant', content: reply }]
    });

  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ success: false, message: 'Chatbot failed.' });
  }
};

// ── 3. Smart Event Recommendations ────────────────────────────────────────
const getRecommendations = async (req, res) => {
  try {
    const db = require('../config/db');
    const userId = req.user.id;

    // Get user's registration history
    const [history] = await db.query(`
      SELECT e.title, e.tags, c.name as category
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE r.user_id = ? AND r.status IN ('registered','attended')
      ORDER BY r.registered_at DESC LIMIT 10
    `, [userId]);

    // Get upcoming events not yet registered for
    const [upcoming] = await db.query(`
      SELECT e.id, e.title, e.description, e.tags, c.name as category,
             e.event_date, e.venue
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.status = 'published'
        AND e.event_date >= CURDATE()
        AND e.id NOT IN (
          SELECT event_id FROM registrations
          WHERE user_id = ? AND status = 'registered'
        )
      ORDER BY e.event_date ASC LIMIT 20
    `, [userId]);

    if (upcoming.length === 0)
      return res.json({ success: true, recommendations: [], reason: 'No upcoming events available.' });

    const historyText = history.length > 0
      ? history.map(e => `- ${e.title} (${e.category || 'General'})`).join('\n')
      : 'No previous event history.';

    const upcomingText = upcoming.map(e =>
      `ID:${e.id} | ${e.title} | ${e.category || 'General'} | ${e.event_date}`
    ).join('\n');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Based on a student's event history, recommend 3 upcoming events they'd enjoy.

Student's past events:
${historyText}

Upcoming events:
${upcomingText}

Reply ONLY with a JSON array of 3 event IDs and one-line reasons, like:
[{"id": 1, "reason": "Matches your interest in tech events"},{"id": 2, "reason": "Similar to workshops you attended"},{"id": 3, "reason": "Popular cultural event on campus"}]`
      }]
    });

    let recommendations = [];
    try {
      const text = response.content[0].text;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        recommendations = parsed.map(rec => {
          const event = upcoming.find(e => e.id === rec.id);
          return event ? { ...event, reason: rec.reason } : null;
        }).filter(Boolean);
      }
    } catch (parseErr) {
      recommendations = upcoming.slice(0, 3).map(e => ({
        ...e, reason: 'Upcoming event you might enjoy'
      }));
    }

    res.json({ success: true, recommendations });

  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ success: false, message: 'Recommendation failed.' });
  }
};

// ── 4. AI Announcement Writer ──────────────────────────────────────────────
const generateAnnouncement = async (req, res) => {
  try {
    const { eventTitle, eventDate, eventVenue, updateType, customNote } = req.body;

    if (!eventTitle) return res.status(400).json({ success: false, message: 'Event title is required.' });

    const typePrompts = {
      reminder:  'Write a friendly reminder announcement',
      update:    'Write an important update announcement',
      cancelled: 'Write a polite event cancellation announcement',
      thankyou:  'Write a warm thank-you message to attendees after the event',
    };

    const prompt = typePrompts[updateType] || 'Write a general announcement';

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `${prompt} for this university event:
Event: ${eventTitle}
Date: ${eventDate || 'Upcoming'}
Venue: ${eventVenue || 'Campus'}
Additional note: ${customNote || 'None'}

Write 2-3 sentences. Be clear, professional, and friendly. Write the announcement directly without any intro.`
      }]
    });

    const announcement = message.content[0].text;
    res.json({ success: true, announcement });

  } catch (err) {
    console.error('Announcement error:', err);
    res.status(500).json({ success: false, message: 'Announcement generation failed.' });
  }
};

module.exports = {
  generateDescription,
  chatbot,
  getRecommendations,
  generateAnnouncement
};