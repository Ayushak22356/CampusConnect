import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { format } from 'date-fns';

const HomePage = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get('/events?upcoming=true&status=published').then(r => setEvents(r.data.data.slice(0, 3)));
  }, []);

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">🎓 University Event Platform</div>
          <h1 className="hero-title">
            Connect. Organize.<br />
            <span className="hero-accent">Celebrate Campus Life.</span>
          </h1>
          <p className="hero-sub">
            Discover events, RSVP in seconds, and organize unforgettable university experiences — all in one place.
          </p>
          <div className="hero-actions">
            <Link to="/events" className="btn-hero-primary">Browse Events →</Link>
            <Link to="/register" className="btn-hero-outline">Get Started Free</Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-card-stack">
            <div className="hero-card hc-1">🎤 Annual Tech Talk<br/><small>50 attending</small></div>
            <div className="hero-card hc-2">🏆 Sports Day 2025<br/><small>120 attending</small></div>
            <div className="hero-card hc-3">🎨 Cultural Fest<br/><small>200 attending</small></div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <h2>Everything you need</h2>
        <div className="features-grid">
          {[
            { icon: '📅', title: 'Create Events', desc: 'Publish events with agenda, venue, capacity and registration deadlines.' },
            { icon: '🎟️', title: 'RSVP Tracking', desc: 'Students register with one click. Track attendance in real time.' },
            { icon: '🔍', title: 'Discover & Filter', desc: 'Search by category, date, or keyword to find the perfect event.' },
            { icon: '👥', title: 'Attendee Management', desc: 'View registrations, mark attendance, and send announcements.' },
          ].map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Events Preview */}
      {events.length > 0 && (
        <section className="preview-section">
          <div className="section-header">
            <h2>Upcoming Events</h2>
            <Link to="/events">View all →</Link>
          </div>
          <div className="preview-events-grid">
            {events.map(e => (
              <Link to={`/events/${e.id}`} key={e.id} className="preview-event-card">
                <div className="pec-top" style={{ background: e.category_color || '#6366f1' }}>
                  <span>{format(new Date(e.event_date), 'dd MMM')}</span>
                </div>
                <div className="pec-body">
                  <div className="pec-title">{e.title}</div>
                  <div className="pec-venue">📍 {e.venue}</div>
                  <div className="pec-rsvp">{e.rsvp_count} registered</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="cta-section">
        <h2>Ready to get started?</h2>
        <p>Join hundreds of students and organizers already on Campus Connect.</p>
        <div className="hero-actions">
          <Link to="/register" className="btn-hero-primary">Create Your Account →</Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;