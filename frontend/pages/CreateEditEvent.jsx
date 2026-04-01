import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { AIDescriptionGenerator } from '../components/AIComponents';

const emptyAgendaItem = () => ({
  title: '', speaker: '', description: '', start_time: '', end_time: ''
});

const CreateEditEvent = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = Boolean(id);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [agenda, setAgenda]         = useState([]);
  const [form, setForm]             = useState({
    title: '', description: '', category_id: '', venue: '',
    event_date: '', start_time: '', end_time: '', max_capacity: 100,
    registration_deadline: '', is_public: true, tags: '', status: 'published',
  });

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.data));
    if (isEdit) {
      api.get(`/events/${id}`).then(r => {
        const e = r.data.data;
        setForm({
          title:                 e.title,
          description:           e.description,
          category_id:           e.category_id || '',
          venue:                 e.venue,
          event_date:            e.event_date?.slice(0, 10),
          start_time:            e.start_time?.slice(0, 5),
          end_time:              e.end_time?.slice(0, 5),
          max_capacity:          e.max_capacity,
          registration_deadline: e.registration_deadline?.slice(0, 10) || '',
          is_public:             e.is_public,
          tags:                  e.tags || '',
          status:                e.status,
        });
        if (e.agenda) setAgenda(e.agenda);
      });
    }
  }, [id, isEdit]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const updateAgenda = (idx, key, val) => {
    const updated = [...agenda];
    updated[idx] = { ...updated[idx], [key]: val };
    setAgenda(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, agenda };
      if (isEdit) {
        await api.put(`/events/${id}`, payload);
        toast.success('Event updated!');
        navigate(`/events/${id}`);
      } else {
        const res = await api.post('/events', payload);
        toast.success('Event created successfully!');
        navigate(`/events/${res.data.eventId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{isEdit ? '✏️ Edit Event' : '🎉 Create New Event'}</h1>
          <p className="text-muted">
            {isEdit ? 'Update your event details' : 'Fill in the details to publish your event'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="event-form">

        {/* ── Section 1: Basic Info ─────────────────────────────────── */}
        <div className="form-section">
          <h3>📋 Basic Information</h3>

          <div className="form-group">
            <label>Event Title *</label>
            <input
              type="text" required
              placeholder="e.g. Annual Tech Hackathon 2025"
              value={form.title}
              onChange={set('title')}
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <div className="ai-desc-bar">
              <span className="text-muted" style={{ fontSize: '.82rem' }}>
                Write manually or generate with AI
              </span>
              <AIDescriptionGenerator
                formData={form}
                onGenerated={(text) => setForm({ ...form, description: text })}
              />
            </div>
            <textarea
              required rows={5}
              placeholder="Describe your event in detail… or click ✨ Generate with AI above"
              value={form.description}
              onChange={set('description')}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={form.category_id} onChange={set('category_id')}>
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Tags (comma separated)</label>
              <input
                type="text" placeholder="hackathon, coding, prizes"
                value={form.tags} onChange={set('tags')}
              />
            </div>
          </div>
        </div>

        {/* ── Section 2: Date, Time & Venue ────────────────────────── */}
        <div className="form-section">
          <h3>📅 Date, Time & Venue</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Event Date *</label>
              <input type="date" required value={form.event_date} onChange={set('event_date')} />
            </div>
            <div className="form-group">
              <label>Start Time *</label>
              <input type="time" required value={form.start_time} onChange={set('start_time')} />
            </div>
            <div className="form-group">
              <label>End Time *</label>
              <input type="time" required value={form.end_time} onChange={set('end_time')} />
            </div>
          </div>
          <div className="form-group">
            <label>Venue / Location *</label>
            <input
              type="text" required
              placeholder="e.g. Main Auditorium, Block A, Room 101"
              value={form.venue} onChange={set('venue')}
            />
          </div>
        </div>

        {/* ── Section 3: Registration Settings ─────────────────────── */}
        <div className="form-section">
          <h3>⚙️ Registration Settings</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Max Capacity</label>
              <input type="number" min={1} value={form.max_capacity}
                onChange={set('max_capacity')} />
            </div>
            <div className="form-group">
              <label>Registration Deadline</label>
              <input type="date" value={form.registration_deadline}
                onChange={set('registration_deadline')} />
            </div>
            <div className="form-group">
              <label>Visibility</label>
              <select
                value={form.is_public}
                onChange={e => setForm({ ...form, is_public: e.target.value === 'true' })}>
                <option value="true">Public</option>
                <option value="false">Private</option>
              </select>
            </div>
          </div>

          {isEdit && (
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={set('status')}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}
        </div>

        {/* ── Section 4: Agenda ─────────────────────────────────────── */}
        <div className="form-section">
          <div className="section-header">
            <h3>📌 Event Schedule / Agenda</h3>
            <button
              type="button" className="btn-outline"
              onClick={() => setAgenda([...agenda, emptyAgendaItem()])}>
              + Add Item
            </button>
          </div>

          {agenda.length === 0 && (
            <p className="text-muted">
              No agenda items yet. Click "+ Add Item" to build your schedule.
            </p>
          )}

          {agenda.map((item, idx) => (
            <div key={idx} className="agenda-form-item">
              <div className="agenda-form-header">
                <span>Session {idx + 1}</span>
                <button
                  type="button" className="btn-icon-danger"
                  onClick={() => setAgenda(agenda.filter((_, i) => i !== idx))}>
                  ✕
                </button>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Title *</label>
                  <input type="text" placeholder="Opening Ceremony" value={item.title}
                    onChange={e => updateAgenda(idx, 'title', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Speaker</label>
                  <input type="text" placeholder="Dr. Jane Smith" value={item.speaker}
                    onChange={e => updateAgenda(idx, 'speaker', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input type="time" value={item.start_time}
                    onChange={e => updateAgenda(idx, 'start_time', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input type="time" value={item.end_time}
                    onChange={e => updateAgenda(idx, 'end_time', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input type="text" placeholder="Additional details…"
                  value={item.description}
                  onChange={e => updateAgenda(idx, 'description', e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button type="button" className="btn-outline" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : isEdit ? '💾 Save Changes' : '🚀 Publish Event'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEditEvent;