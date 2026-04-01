import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { user, logout, isOrganizer } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out.');
    navigate('/');
  };

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-brand">🎓 Campus Connect</Link>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/events" className={isActive('/events')}>Events</Link>
          {user && <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>}
          {user && <Link to="/my-events" className={isActive('/my-events')}>My Events</Link>}
          {isOrganizer && <Link to="/events/create" className={isActive('/events/create')}>Create Event</Link>}
        </div>

        <div className="nav-actions">
          {user ? (
            <div className="user-menu">
              <button className="user-avatar-btn" onClick={() => setMenuOpen(!menuOpen)}>
                <div className="avatar">{user.name?.charAt(0).toUpperCase()}</div>
                <span>{user.name?.split(' ')[0]}</span>
                <span className="role-chip">{user.role}</span>
                <span className="chevron">▾</span>
              </button>
              {menuOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                  </div>
                  <Link to="/dashboard" className="dropdown-item" onClick={() => setMenuOpen(false)}>📊 Dashboard</Link>
                  <Link to="/my-events" className="dropdown-item" onClick={() => setMenuOpen(false)}>🎟️ My Events</Link>
                  <hr />
                  <button className="dropdown-item danger" onClick={handleLogout}>🚪 Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-nav-btns">
              <Link to="/login"    className="btn-outline-sm">Sign In</Link>
              <Link to="/register" className="btn-primary-sm">Register</Link>
            </div>
          )}
        </div>

        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;