import React, { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

// ── 1. AI Description Generator Button ────────────────────────────────────
// Drop this inside CreateEditEvent.jsx next to the description textarea
export const AIDescriptionGenerator = ({ formData, onGenerated }) => {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!formData.title) {
      toast.error('Enter an event title first.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/ai/generate', {
        title:    formData.title,
        category: formData.category_id,
        venue:    formData.venue,
        date:     formData.event_date,
        tags:     formData.tags,
      });
      onGenerated(res.data.description);
      toast.success('AI description generated!');
    } catch {
      toast.error('AI generation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" className="btn-ai" onClick={generate} disabled={loading}>
      {loading ? '⏳ Generating…' : '✨ Generate with AI'}
    </button>
  );
};

// ── 2. Campus AI Chatbot Widget ────────────────────────────────────────────
export const CampusChatbot = () => {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '👋 Hi! I\'m your Campus Connect assistant. Ask me anything about events!' }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: userMsg,
        conversationHistory: history,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
      setHistory(res.data.updatedHistory);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I ran into an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <>
      {/* Floating button */}
      <button className="chatbot-fab" onClick={() => setOpen(!open)}>
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <span>🎓 Campus Assistant</span>
            <button onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {loading && <div className="chat-msg assistant">⏳ Thinking…</div>}
          </div>

          <div className="chatbot-input">
            <input
              type="text"
              placeholder="Ask about events…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button onClick={send} disabled={loading}>Send</button>
          </div>
        </div>
      )}
    </>
  );
};

// ── 3. AI Event Recommendations ────────────────────────────────────────────
export const AIRecommendations = () => {
  const [recs, setRecs]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchRecs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/recommend');
      setRecs(res.data.recommendations);
      setFetched(true);
    } catch {
      toast.error('Could not fetch recommendations.');
    } finally {
      setLoading(false);
    }
  };

  if (!fetched) {
    return (
      <div className="ai-rec-banner">
        <span>✨ Get AI-powered event recommendations based on your interests</span>
        <button className="btn-ai" onClick={fetchRecs} disabled={loading}>
          {loading ? 'Finding events…' : 'Recommend for me'}
        </button>
      </div>
    );
  }

  if (recs.length === 0) return null;

  return (
    <div className="ai-rec-section">
      <h3>✨ Recommended for You</h3>
      <div className="ai-rec-grid">
        {recs.map(event => (
          <a key={event.id} href={`/events/${event.id}`} className="ai-rec-card">
            <div className="ai-rec-title">{event.title}</div>
            <div className="ai-rec-reason">🤖 {event.reason}</div>
            <div className="ai-rec-meta">📅 {event.event_date} · 📍 {event.venue}</div>
          </a>
        ))}
      </div>
    </div>
  );
};

// ── 4. AI Announcement Writer ──────────────────────────────────────────────
export const AIAnnouncementWriter = ({ eventId, eventTitle, eventDate, eventVenue }) => {
  const [type, setType]       = useState('reminder');
  const [note, setNote]       = useState('');
  const [result, setResult]   = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/ai/announce', {
        eventTitle,
        eventDate,
        eventVenue,
        updateType: type,
        customNote: note,
      });
      setResult(res.data.announcement);
      toast.success('Announcement generated!');
    } catch {
      toast.error('Failed to generate announcement.');
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="ai-announce-box">
      <h4>✨ AI Announcement Writer</h4>
      <div className="form-row">
        <div className="form-group">
          <label>Type</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="reminder">Reminder</option>
            <option value="update">Update</option>
            <option value="cancelled">Cancellation</option>
            <option value="thankyou">Thank You</option>
          </select>
        </div>
        <div className="form-group">
          <label>Additional Note (optional)</label>
          <input type="text" placeholder="e.g. Venue changed to Room 202"
            value={note} onChange={e => setNote(e.target.value)} />
        </div>
      </div>
      <button className="btn-ai" onClick={generate} disabled={loading}>
        {loading ? '⏳ Writing…' : '✨ Generate Announcement'}
      </button>

      {result && (
        <div className="ai-result">
          <p>{result}</p>
          <button className="btn-outline" onClick={copy}>📋 Copy Text</button>
        </div>
      )}
    </div>
  );
};