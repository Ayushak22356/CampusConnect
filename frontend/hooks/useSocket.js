import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

// Singleton socket instance — shared across all components
let socketInstance = null;

const getSocket = (token) => {
  if (!socketInstance) {
    socketInstance = io('http://localhost:5000', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
};

// ── useSocket Hook ────────────────────────────────────────────────────────────
// Usage: const { socket, joinEvent, leaveEvent } = useSocket();
export const useSocket = () => {
  const token = localStorage.getItem('cc_token');
  const socket = getSocket(token);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      // Auto-join personal user room for targeted notifications
      socket.emit('join_user_room');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    // Global: listen for new events being published
    socket.on('new_event_available', (event) => {
      toast(`🎉 New event: ${event.title}`, {
        icon: '📅',
        duration: 5000,
      });
    });

    // Global: listen for personal attendance confirmation
    socket.on('attendance_confirmed', ({ message }) => {
      toast.success(message);
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('new_event_available');
      socket.off('attendance_confirmed');
    };
  }, []);

  // Join a specific event's real-time room
  const joinEvent = useCallback((eventId) => {
    socket.emit('join_event', eventId);
  }, []);

  // Leave event room
  const leaveEvent = useCallback((eventId) => {
    socket.emit('leave_event', eventId);
  }, []);

  // Join organizer dashboard room
  const joinDashboard = useCallback(() => {
    socket.emit('join_dashboard');
  }, []);

  // Emit RSVP registered event
  const emitRsvp = useCallback((eventId, rsvpCount, userName) => {
    socket.emit('rsvp_registered', { eventId, rsvpCount, userName });
  }, []);

  // Emit RSVP cancelled
  const emitCancelRsvp = useCallback((eventId, rsvpCount) => {
    socket.emit('rsvp_cancelled', { eventId, rsvpCount });
  }, []);

  // Emit new event published
  const emitEventPublished = useCallback((eventData) => {
    socket.emit('event_published', eventData);
  }, []);

  // Emit announcement
  const sendAnnouncement = useCallback((eventId, message) => {
    socket.emit('send_announcement', { eventId, message });
  }, []);

  return {
    socket,
    joinEvent,
    leaveEvent,
    joinDashboard,
    emitRsvp,
    emitCancelRsvp,
    emitEventPublished,
    sendAnnouncement,
  };
};

// ── useEventSocket Hook ───────────────────────────────────────────────────────
// Usage inside EventDetailPage — listens for live RSVP count updates
// const { liveRsvpCount } = useEventSocket(eventId, initialCount);
export const useEventSocket = (eventId, initialCount) => {
  const { socket, joinEvent, leaveEvent } = useSocket();
  const countRef = useRef(initialCount);

  useEffect(() => {
    if (!eventId) return;

    joinEvent(eventId);

    // Listen for live RSVP count changes
    socket.on('rsvp_count_updated', ({ eventId: eid, rsvpCount, message }) => {
      if (String(eid) === String(eventId)) {
        countRef.current = rsvpCount;
        if (message) toast(message, { icon: '👥', duration: 3000 });
      }
    });

    // Listen for announcements from organizer
    socket.on('announcement_received', ({ eventId: eid, message, from }) => {
      if (String(eid) === String(eventId)) {
        toast(`📣 ${from}: ${message}`, { duration: 8000 });
      }
    });

    return () => {
      leaveEvent(eventId);
      socket.off('rsvp_count_updated');
      socket.off('announcement_received');
    };
  }, [eventId]);

  return { liveRsvpCount: countRef.current };
};

// ── useDashboardSocket Hook ───────────────────────────────────────────────────
// Usage inside Dashboard for organizers — gets live RSVP notifications
export const useDashboardSocket = (onNewRsvp) => {
  const { socket, joinDashboard } = useSocket();

  useEffect(() => {
    joinDashboard();

    socket.on('new_rsvp_notification', ({ eventId, userName, timestamp }) => {
      toast(`🎟️ ${userName} just RSVP'd!`, { icon: '✅', duration: 4000 });
      if (onNewRsvp) onNewRsvp({ eventId, userName, timestamp });
    });

    socket.on('attendance_updated', ({ userName }) => {
      toast(`✅ ${userName} marked as attended`, { duration: 3000 });
    });

    return () => {
      socket.off('new_rsvp_notification');
      socket.off('attendance_updated');
    };
  }, []);
};