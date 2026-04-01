import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';
import { useDashboardSocket } from '../hooks/useSocket';

const StatCard = ({ label, value, icon, color }) => (
  <div className="stat-card" style={{ borderLeftColor: color }}>
    <div className="stat-icon" style={{ background: color + '20', color }}>{icon}</div>
    <div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

const EventCard = ({ event }) => (
  <Link to={`/events/${event.id}`} className="event-card-mini">
    <div className="ecm-date">
      <span>{format(new Date(event.event_date), 'dd')}</span>
      <small>{format(new Date(event.event_date), 'MMM')}</small>
    </div>
    <div className="ecm-info">
      <div className="ecm-title">{event.title}</div>
      <div className="ecm-meta">📍 {event.venue}</div>
      {event.category_name && (
        <span className="badge" style={{ background: event.category_color + '25', color: event.category_color }}>
          {event.category_name}
        </span>
      )}
    </div>
    <div className="ecm-count">{event.rsvp_count} 👤</div>
  </Link>
);

const Dashboard = () => {
  const { user, isOrganizer } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [myRsvps, setMyRsvps] = useState([]);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, attended: 0 });

  useEffect(() => {
    api.get('/events?upcoming=true&status=published').then(r => setUpcomingEvents(r.data.data.slice(0, 5)));
    api.get('/registrations/my-events').then(r => {
      const regs = r.data.data;
      setMyRsvps(regs.filter(e => e.rsvp_status === 'registered').slice(0, 4));
      setStats({
        total: regs.length,
        upcoming: regs.filter(e => new Date(e.event_date) >= new Date() && e.rsvp_status === 'registered').length,
        attended: regs.filter(e => e.rsvp_status === 'attended').length,
      });
    });
    if (isOrganizer) {
      api.get('/events/my').then(r => setMyEvents(r.data.data.slice(0, 4)));
    }
  }, [isOrganizer]);

  useDashboardSocket((data) => {
  console.log('New RSVP:', data);
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-muted">{user?.department || 'Campus Connect'} · {user?.role}</p>
        </div>
        {isOrganizer && (
          <Link to="/events/create" className="btn-primary">+ Create Event</Link>
        )}
      </div>

      <div className="stats-grid">
        <StatCard label="Events Registered" value={stats.total}    icon="🎟️" color="#6366f1" />
        <StatCard label="Upcoming Events"    value={stats.upcoming} icon="📅" color="#f59e0b" />
        <StatCard label="Events Attended"    value={stats.attended} icon="✅" color="#10b981" />
        <StatCard label="Role"               value={user?.role}     icon="👤" color="#3b82f6" />
      </div>

      <div className="dashboard-grid">
        <section className="dash-section">
          <div className="section-header">
            <h2>Upcoming Events</h2>
            <Link to="/events">View all →</Link>
          </div>
          {upcomingEvents.length === 0
            ? <p className="empty-state">No upcoming events.</p>
            : upcomingEvents.map(e => <EventCard key={e.id} event={e} />)
          }
        </section>

        <section className="dash-section">
          <div className="section-header">
            <h2>My RSVPs</h2>
            <Link to="/my-events">View all →</Link>
          </div>
          {myRsvps.length === 0
            ? <p className="empty-state">You haven't RSVP'd to any events yet.</p>
            : myRsvps.map(e => <EventCard key={e.id} event={e} />)
          }
        </section>
      </div>

      {isOrganizer && (
        <section className="dash-section mt-4">
          <div className="section-header">
            <h2>My Organized Events</h2>
            <Link to="/my-events">Manage →</Link>
          </div>
          <div className="events-grid">
            {myEvents.length === 0
              ? <p className="empty-state">You haven't created any events yet.</p>
              : myEvents.map(e => <EventCard key={e.id} event={e} />)
            }
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;