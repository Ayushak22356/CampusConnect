import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { CampusChatbot } from './components/AIComponents';

import HomePage        from './pages/HomePage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import Dashboard       from './pages/Dashboard';
import { EventsPage, EventDetailPage } from './pages/EventsPage';
import CreateEditEvent from './pages/CreateEditEvent';
import { MyEventsPage, AttendeesPage } from './pages/MyEventsPage';

import './App.css';
import './ai-styles.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/"        element={<HomePage />} />
            <Route path="/login"   element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/events"  element={<EventsPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />

            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/my-events" element={
              <ProtectedRoute><MyEventsPage /></ProtectedRoute>
            } />
            <Route path="/events/create" element={
              <ProtectedRoute roles={['organizer', 'faculty', 'admin']}>
                <CreateEditEvent />
              </ProtectedRoute>
            } />
            <Route path="/events/:id/edit" element={
              <ProtectedRoute><CreateEditEvent /></ProtectedRoute>
            } />
            <Route path="/events/:id/attendees" element={
              <ProtectedRoute><AttendeesPage /></ProtectedRoute>
            } />

            <Route path="*" element={
              <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
                <div style={{ fontSize: 64 }}>404</div>
                <h2>Page Not Found</h2>
              </div>
            } />
          </Routes>
        </main>
        {/* AI Chatbot — visible on every page */}
        <CampusChatbot />

        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;