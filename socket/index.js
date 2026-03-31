// ─── socket/index.js ─────────────────────────────────────────────────────────
// All WebSocket real-time logic for Campus Connect

const jwt = require('jsonwebtoken');

const setupSocket = (io) => {

  // ── Auth Middleware for Sockets ─────────────────────────────────────────────
  // Every socket connection must provide a valid JWT token
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token ||
                  socket.handshake.headers?.authorization?.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;  // attach user to socket
      } catch {
        // Invalid token — allow connection but socket.user will be undefined
        socket.user = null;
      }
    } else {
      socket.user = null;
    }
    next();
  });

  // ── Connection Handler ──────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.user?.id || 'guest';
    console.log(`🔌 Socket connected: ${socket.id} (user: ${userId})`);

    // ── Room: Join an Event Room ──────────────────────────────────────────────
    // When a user opens an event detail page, they join that event's room
    // So only users viewing that event get real-time updates for it
    socket.on('join_event', (eventId) => {
      socket.join(`event_${eventId}`);
      console.log(`👤 Socket ${socket.id} joined event room: event_${eventId}`);
    });

    // Leave event room when user navigates away
    socket.on('leave_event', (eventId) => {
      socket.leave(`event_${eventId}`);
      console.log(`👤 Socket ${socket.id} left event room: event_${eventId}`);
    });

    // ── Room: Join Dashboard Room ─────────────────────────────────────────────
    // Organizers join their dashboard room for management updates
    socket.on('join_dashboard', () => {
      if (socket.user && ['organizer', 'faculty', 'admin'].includes(socket.user.role)) {
        socket.join(`dashboard_${socket.user.id}`);
        console.log(`📊 Organizer ${socket.user.id} joined dashboard room`);
      }
    });

    // ── Event: New RSVP ───────────────────────────────────────────────────────
    // Emitted by backend after successful RSVP
    // Broadcasts updated RSVP count to all users viewing that event
    socket.on('rsvp_registered', ({ eventId, rsvpCount, userName }) => {
      // Broadcast to everyone in the event room EXCEPT the sender
      socket.to(`event_${eventId}`).emit('rsvp_count_updated', {
        eventId,
        rsvpCount,
        message: `${userName} just registered!`,
      });

      // Also notify the organizer's dashboard
      io.to(`dashboard_${socket.user?.id}`).emit('new_rsvp_notification', {
        eventId,
        userName,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Event: RSVP Cancelled ─────────────────────────────────────────────────
    socket.on('rsvp_cancelled', ({ eventId, rsvpCount }) => {
      socket.to(`event_${eventId}`).emit('rsvp_count_updated', {
        eventId,
        rsvpCount,
        message: 'A spot just opened up!',
      });
    });

    // ── Event: New Event Created ──────────────────────────────────────────────
    // Broadcast to ALL connected users that a new event exists
    socket.on('event_published', (eventData) => {
      if (socket.user && ['organizer', 'faculty', 'admin'].includes(socket.user.role)) {
        io.emit('new_event_available', {
          id:         eventData.id,
          title:      eventData.title,
          venue:      eventData.venue,
          event_date: eventData.event_date,
          category:   eventData.category,
        });
        console.log(`📢 New event broadcast: ${eventData.title}`);
      }
    });

    // ── Event: Organizer sends Announcement ──────────────────────────────────
    socket.on('send_announcement', ({ eventId, message }) => {
      if (!socket.user) return;

      // Send announcement to all users in the event room
      io.to(`event_${eventId}`).emit('announcement_received', {
        eventId,
        message,
        from:      socket.user.name,
        timestamp: new Date().toISOString(),
      });
      console.log(`📣 Announcement for event ${eventId}: ${message}`);
    });

    // ── Event: Live Attendance Marking ────────────────────────────────────────
    socket.on('mark_attended', ({ eventId, userId, userName }) => {
      // Notify the specific user that they've been marked as attended
      io.to(`user_${userId}`).emit('attendance_confirmed', {
        eventId,
        message: 'Your attendance has been marked! ✅',
      });

      // Update the attendees list for organizer dashboard
      io.to(`dashboard_${socket.user?.id}`).emit('attendance_updated', {
        eventId, userId, userName,
      });
    });

    // ── Event: User joins personal room ──────────────────────────────────────
    // Allows sending targeted notifications to a specific user
    socket.on('join_user_room', () => {
      if (socket.user) {
        socket.join(`user_${socket.user.id}`);
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (reason: ${reason})`);
    });
  });

  console.log('✅ Socket.io initialized');
};

module.exports = setupSocket;