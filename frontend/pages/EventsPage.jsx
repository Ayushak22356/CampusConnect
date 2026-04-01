import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { AIRecommendations } from '../components/AIComponents';
import { useEventSocket } from '../hooks/useSocket';

// ─── Events List Page ─────────────────────────────────────────────────────────
export const EventsPage = () => {
  const [events, setEvents]         = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters]       = useState({ search: '', category: '', upcoming: true });
  const [loading, setLoading]       = useState(true);
  const { user, isOrganizer }       = useAuth();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search)   params.append('search',   filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.upcoming) params.append('upcoming', 'true');
      params.append('status', 'published');
      const res = await api.get(`/events?${params}`);
      setEvents(res.data.data);
    } catch {
      toast.error('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.data));
  }, []);

  useEffect(() => { fetchEvents(); }, [filters]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Campus Events</h1>
          <p className="text-muted">Discover what's happening on campus</p>
        </div>
        {isOrganizer && (
          <Link to="/events/create" className="btn-primary">+ Create Event</Link>
        )}
      </div>

      {/* AI Recommendations — shown only when logged in */}
      {user && <AIRecommendations />}

      {/* Filters */}
      <div className="filters-bar">
        <input
          type="text" className="search-input"
          placeholder="🔍 Search events…"
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          className="filter-select"
          value={filters.category}
          onChange={e => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <label className="toggle-label">
          <input
            type="checkbox" checked={filters.upcoming}
            onChange={e => setFilters({ ...filters, upcoming: e.target.checked })}
          />
          Upcoming only
        </label>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="loading-grid">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton-card" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state-full">
          <div style={{ fontSize: 48 }}>📭</div>
          <h3>No events found</h3>
          <p>Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div className="events-grid">
          {events.map(event => <EventCard key={event.id} event={event} />)}
        </div>
      )}
    </div>
  );
};

// ─── Event Card ───────────────────────────────────────────────────────────────
const EventCard = ({ event }) => {
  const spotsLeft = event.max_capacity - event.rsvp_count;

  return (
    <Link to={`/events/${event.id}`} className="event-card">
      <div className="ec-header" style={{ background: event.category_color || '#6366f1' }}>
        <div className="ec-date">{format(new Date(event.event_date), 'dd MMM')}</div>
        {event.category_name && (
          <span className="ec-category">{event.category_name}</span>
        )}
      </div>
      <div className="ec-body">
        <h3 className="ec-title">{event.title}</h3>
        <p className="ec-desc">{event.description.substring(0, 100)}…</p>
        <div className="ec-meta">
          <span>📍 {event.venue}</span>
          <span>⏰ {event.start_time?.slice(0, 5)}</span>
        </div>
        <div className="ec-footer">
          <span className="ec-organizer">by {event.organizer_name}</span>
          <span className={`spots-badge ${spotsLeft < 10 ? 'urgent' : ''}`}>
            {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}
          </span>
        </div>
      </div>
    </Link>
  );
};

// ─── Event Detail Page ────────────────────────────────────────────────────────
export const EventDetailPage = () => {
  const { id }             = useParams();
  const { user, isOrganizer } = useAuth();
  const navigate           = useNavigate();
  const [event, setEvent]  = useState(null);
  const [rsvpStatus, setRsvpStatus] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const { liveRsvpCount } = useEventSocket(id, event?.rsvp_count);

  const fetchEvent = async () => {
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.data);
    } catch {
      toast.error('Event not found.');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const checkRsvp = async () => {
    if (!user) return;
    try {
      const res = await api.get('/registrations/my-events');
      const found = res.data.data.find(e => e.id === parseInt(id));
      if (found) setRsvpStatus(found.rsvp_status);
    } catch {}
  };

  useEffect(() => { fetchEvent(); checkRsvp(); }, [id]);

  const handleRsvp = async () => {
    if (!user) return navigate('/login');
    setRsvpLoading(true);
    try {
      await api.post(`/registrations/rsvp/${id}`);
      toast.success("🎉 You're registered!");
      setRsvpStatus('registered');
      fetchEvent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'RSVP failed.');
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleCancel = async () => {
    setRsvpLoading(true);
    try {
      await api.delete(`/registrations/cancel/${id}`);
      toast.success('Registration cancelled.');
      setRsvpStatus(null);
      fetchEvent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed.');
    } finally {
      setRsvpLoading(false);
    }
  };

  if (loading) return <div className="page"><div className="loading-spinner" /></div>;
  if (!event)  return null;

  const spotsLeft = event.max_capacity - event.rsvp_count;
  const isOwner   = user?.id === event.organizer_id || user?.role === 'admin';
  const isPast    = new Date(event.event_date) < new Date();

  return (
    <div className="page">
      <Link to="/events" className="back-link">← Back to Events</Link>

      <div className="event-detail">
        {/* ── Main Column ── */}
        <div className="event-detail-main">

          {/* Hero Banner */}
          <div className="ed-hero" style={{
            background: `linear-gradient(135deg, ${event.category_color || '#6366f1'}, #1e1b4b)`
          }}>
            <div className="ed-hero-content">
              {event.category_name && (
                <span className="ed-category">{event.category_name}</span>
              )}
              <h1>{event.title}</h1>
              <div className="ed-hero-meta">
                <span>📅 {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}</span>
                <span>⏰ {event.start_time?.slice(0,5)} – {event.end_time?.slice(0,5)}</span>
                <span>📍 {event.venue}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="ed-section">
            <h2>About This Event</h2>
            <p>{event.description}</p>
          </div>

          {/* Agenda */}
          {event.agenda?.length > 0 && (
            <div className="ed-section">
              <h2>Event Schedule</h2>
              <div className="agenda-list">
                {event.agenda.map((item, i) => (
                  <div key={i} className="agenda-item">
                    <div className="agenda-time">
                      {item.start_time?.slice(0,5)} – {item.end_time?.slice(0,5)}
                    </div>
                    <div className="agenda-content">
                      <div className="agenda-title">{item.title}</div>
                      {item.speaker && (
                        <div className="agenda-speaker">🎤 {item.speaker}</div>
                      )}
                      {item.description && (
                        <div className="agenda-desc">{item.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="event-detail-sidebar">
          <div className="ed-sidebar-card">

            {/* Capacity Bar */}
            <div className="ed-capacity">
              <div className="cap-bar">
                <div className="cap-fill" style={{
                  width: `${Math.min((event.rsvp_count / event.max_capacity) * 100, 100)}%`
                }} />
              </div>
              <div className="cap-text">
                <span>{event.rsvp_count} registered</span>
                <span>{spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}</span>
              </div>
            </div>

            {/* RSVP Button */}
            {!isPast && !isOwner && (
              rsvpStatus === 'registered' ? (
                <button
                  className="btn-outline-danger w-full"
                  onClick={handleCancel}
                  disabled={rsvpLoading}>
                  {rsvpLoading ? '…' : '✕ Cancel Registration'}
                </button>
              ) : rsvpStatus === 'attended' ? (
                <div className="rsvp-attended">✅ You attended this event</div>
              ) : (
                <button
                  className="btn-primary w-full"
                  onClick={handleRsvp}
                  disabled={rsvpLoading || spotsLeft === 0}>
                  {rsvpLoading ? 'Registering…' : spotsLeft === 0 ? 'Event Full' : '🎟️ RSVP Now'}
                </button>
              )
            )}

            {rsvpStatus === 'registered' && !isPast && (
              <div className="rsvp-badge">✅ You're registered!</div>
            )}

            {/* Info List */}
            <div className="ed-info-list">
              <div className="ed-info-row">
                <span>🗓️ Date</span>
                <span>{format(new Date(event.event_date), 'MMM d, yyyy')}</span>
              </div>
              <div className="ed-info-row">
                <span>⏰ Time</span>
                <span>{event.start_time?.slice(0,5)} – {event.end_time?.slice(0,5)}</span>
              </div>
              <div className="ed-info-row">
                <span>📍 Venue</span>
                <span>{event.venue}</span>
              </div>
              <div className="ed-info-row">
                <span>👤 Organizer</span>
                <span>{event.organizer_name}</span>
              </div>
              {event.registration_deadline && (
                <div className="ed-info-row">
                  <span>⏳ Deadline</span>
                  <span>{format(new Date(event.registration_deadline), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>

            {/* Owner Actions */}
            {isOwner && (
              <div className="owner-actions">
                <Link to={`/events/${id}/edit`} className="btn-secondary w-full">
                  ✏️ Edit Event
                </Link>
                <Link to={`/events/${id}/attendees`} className="btn-outline w-full">
                  👥 View Attendees
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};