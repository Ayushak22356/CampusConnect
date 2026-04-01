import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { AIAnnouncementWriter } from '../components/AIComponents';

// ─── My Events Page ───────────────────────────────────────────────────────────
export const MyEventsPage = () => {
  const { isOrganizer }   = useAuth();
  const [tab, setTab]     = useState(isOrganizer ? 'organized' : 'registered');
  const [organized, setOrganized]   = useState([]);
  const [registered, setRegistered] = useState([]);

  useEffect(() => {
    api.get('/registrations/my-events').then(r => setRegistered(r.data.data));
    if (isOrganizer) api.get('/events/my').then(r => setOrganized(r.data.data));
  }, [isOrganizer]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;
    try {
      await api.delete(`/events/${id}`);
      toast.success('Event deleted.');
      setOrganized(organized.filter(e => e.id !== id));
    } catch {
      toast.error('Failed to delete event.');
    }
  };

  const statusColors = {
    published: '#10b981',
    draft:     '#f59e0b',
    cancelled: '#ef4444',
    completed: '#6366f1',
  };

  return (
    <div className="page">
      <h1>My Events</h1>

      {isOrganizer && (
        <div className="tab-bar">
          <button
            className={tab === 'organized' ? 'tab active' : 'tab'}
            onClick={() => setTab('organized')}>
            Organized ({organized.length})
          </button>
          <button
            className={tab === 'registered' ? 'tab active' : 'tab'}
            onClick={() => setTab('registered')}>
            Registered ({registered.length})
          </button>
        </div>
      )}

      {/* ── Organized Events Tab ── */}
      {tab === 'organized' && (
        <div className="table-container">
          <div className="table-header">
            <span>{organized.length} events</span>
            <Link to="/events/create" className="btn-primary">+ Create Event</Link>
          </div>

          {organized.length === 0 ? (
            <div className="empty-state-full">
              <div style={{ fontSize: 48 }}>🎪</div>
              <h3>No events created yet</h3>
              <Link to="/events/create" className="btn-primary">Create your first event</Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>RSVPs</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {organized.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div className="table-event-title">{e.title}</div>
                      <div className="table-event-venue">📍 {e.venue}</div>
                    </td>
                    <td>{format(new Date(e.event_date), 'MMM d, yyyy')}</td>
                    <td>
                      <span className="rsvp-pill">{e.rsvp_count} / {e.max_capacity}</span>
                    </td>
                    <td>
                      <span className="status-badge" style={{
                        background: statusColors[e.status] + '25',
                        color: statusColors[e.status],
                      }}>
                        {e.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <Link to={`/events/${e.id}`}            className="btn-icon" title="View">👁️</Link>
                        <Link to={`/events/${e.id}/edit`}       className="btn-icon" title="Edit">✏️</Link>
                        <Link to={`/events/${e.id}/attendees`}  className="btn-icon" title="Attendees">👥</Link>
                        <button className="btn-icon-danger" title="Delete"
                          onClick={() => handleDelete(e.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Registered Events Tab ── */}
      {tab === 'registered' && (
        <div className="table-container">
          {registered.length === 0 ? (
            <div className="empty-state-full">
              <div style={{ fontSize: 48 }}>🎟️</div>
              <h3>No registrations yet</h3>
              <Link to="/events" className="btn-primary">Browse Events</Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>RSVP Status</th>
                  <th>Registered On</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {registered.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div className="table-event-title">{e.title}</div>
                      {e.category_name && (
                        <span className="badge" style={{
                          background: e.category_color + '25',
                          color: e.category_color,
                        }}>
                          {e.category_name}
                        </span>
                      )}
                    </td>
                    <td>{format(new Date(e.event_date), 'MMM d, yyyy')}</td>
                    <td>
                      <span className="status-badge" style={{
                        background:
                          e.rsvp_status === 'attended'  ? '#10b98125' :
                          e.rsvp_status === 'cancelled' ? '#ef444425' : '#6366f125',
                        color:
                          e.rsvp_status === 'attended'  ? '#10b981' :
                          e.rsvp_status === 'cancelled' ? '#ef4444'  : '#6366f1',
                      }}>
                        {e.rsvp_status}
                      </span>
                    </td>
                    <td>{format(new Date(e.registered_at), 'MMM d, yyyy')}</td>
                    <td>
                      <Link to={`/events/${e.id}`} className="btn-icon">👁️</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Attendees Page ───────────────────────────────────────────────────────────
export const AttendeesPage = () => {
  const { id }            = useParams();
  const [attendees, setAttendees] = useState([]);
  const [event, setEvent]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showAI, setShowAI]       = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/events/${id}`),
      api.get(`/registrations/event/${id}`),
    ]).then(([evRes, attRes]) => {
      setEvent(evRes.data.data);
      setAttendees(attRes.data.data);
    }).catch(() => toast.error('Failed to load attendees.'))
      .finally(() => setLoading(false));
  }, [id]);

  const markAttended = async (userId) => {
    try {
      await api.put(`/registrations/attendance/${id}/${userId}`);
      toast.success('Marked as attended!');
      setAttendees(attendees.map(a =>
        a.id === userId ? { ...a, rsvp_status: 'attended' } : a
      ));
    } catch {
      toast.error('Failed to mark attendance.');
    }
  };

  const filtered = attendees.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="page"><div className="loading-spinner" /></div>;

  return (
    <div className="page">
      <Link to={`/events/${id}`} className="back-link">← Back to Event</Link>

      <div className="page-header">
        <div>
          <h1>Attendees</h1>
          <p className="text-muted">{event?.title}</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="attendee-stats">
            <span className="stat-pill">
              {attendees.filter(a => a.rsvp_status === 'registered').length} Registered
            </span>
            <span className="stat-pill green">
              {attendees.filter(a => a.rsvp_status === 'attended').length} Attended
            </span>
          </div>
          {/* Toggle AI Announcement Writer */}
          <button
            className="btn-ai"
            onClick={() => setShowAI(!showAI)}>
            {showAI ? '✕ Close AI Writer' : '✨ AI Announcement'}
          </button>
        </div>
      </div>

      {/* AI Announcement Writer — toggleable */}
      {showAI && event && (
        <AIAnnouncementWriter
          eventTitle={event.title}
          eventDate={event.event_date}
          eventVenue={event.venue}
        />
      )}

      <input
        type="text" className="search-input mb-4"
        placeholder="🔍 Search attendees…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div className="empty-state-full">
          <div style={{ fontSize: 48 }}>👥</div>
          <h3>No attendees yet</h3>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id}>
                <td className="attendee-name">{a.name}</td>
                <td className="text-muted">{a.email}</td>
                <td>{a.department || '—'}</td>
                <td><span className="role-badge">{a.role}</span></td>
                <td>
                  <span className="status-badge" style={{
                    background: a.rsvp_status === 'attended' ? '#10b98125' : '#6366f125',
                    color:      a.rsvp_status === 'attended' ? '#10b981'   : '#6366f1',
                  }}>
                    {a.rsvp_status}
                  </span>
                </td>
                <td>
                  {a.rsvp_status !== 'attended' && (
                    <button className="btn-sm-success" onClick={() => markAttended(a.id)}>
                      ✓ Mark Attended
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};