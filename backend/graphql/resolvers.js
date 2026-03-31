const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { Op }  = require('sequelize');
const { PubSub } = require('graphql-subscriptions');

const { User, Event, Category, Registration, AgendaItem } = require('../models');

// PubSub is the engine that powers Subscriptions (real-time events)
const pubsub = new PubSub();

// Subscription event names
const RSVP_UPDATED          = 'RSVP_UPDATED';
const EVENT_CREATED         = 'EVENT_CREATED';
const EVENT_STATUS_CHANGED  = 'EVENT_STATUS_CHANGED';

// Helper: generate JWT token
const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// Helper: get authenticated user from context (throws if not logged in)
const requireAuth = (context) => {
  if (!context.user) throw new Error('Authentication required. Please log in.');
  return context.user;
};

// Helper: check if user is organizer/admin
const requireOrganizer = (context) => {
  const user = requireAuth(context);
  if (!['organizer', 'faculty', 'admin'].includes(user.role))
    throw new Error('Only organizers can perform this action.');
  return user;
};

const resolvers = {

  // ── Query Resolvers ─────────────────────────────────────────────────────────

  Query: {

    // Get currently logged-in user
    me: async (_, __, context) => {
      const authUser = requireAuth(context);
      return await User.findByPk(authUser.id, {
        attributes: { exclude: ['password_hash'] },
      });
    },

    // Get any user by ID
    user: async (_, { id }) => {
      return await User.findByPk(id, {
        attributes: { exclude: ['password_hash'] },
      });
    },

    // Get all users (admin only in real app)
    users: async () => {
      return await User.findAll({
        attributes: { exclude: ['password_hash'] },
        where: { is_active: true },
      });
    },

    // Get all events with optional filters
    events: async (_, { search, category, status, upcoming }) => {
      const where = { is_public: true };

      if (status)   where.status   = status;
      if (category) where.category_id = category;
      if (upcoming) where.event_date  = { [Op.gte]: new Date() };
      if (search)   where[Op.or]   = [
        { title:       { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];

      return await Event.findAll({
        where,
        include: [
          { model: User,     as: 'organizer',  attributes: ['id','name','email','department'] },
          { model: Category, as: 'category',   attributes: ['id','name','color','icon'] },
          { model: AgendaItem, as: 'agendaItems', order: [['order_index','ASC']] },
        ],
        order: [['event_date', 'ASC']],
      });
    },

    // Get single event by ID
    event: async (_, { id }) => {
      return await Event.findByPk(id, {
        include: [
          { model: User,      as: 'organizer',   attributes: ['id','name','email'] },
          { model: Category,  as: 'category' },
          { model: AgendaItem, as: 'agendaItems', order: [['order_index','ASC']] },
          {
            model: Registration, as: 'registrations',
            include: [{ model: User, as: 'user', attributes: ['id','name','email'] }],
          },
        ],
      });
    },

    // Get events created by logged-in organizer
    myEvents: async (_, __, context) => {
      const authUser = requireAuth(context);
      return await Event.findAll({
        where: { organizer_id: authUser.id },
        include: [
          { model: Category, as: 'category' },
          { model: Registration, as: 'registrations' },
        ],
        order: [['event_date', 'DESC']],
      });
    },

    // Get all categories
    categories: async () => {
      return await Category.findAll({ order: [['name', 'ASC']] });
    },

    // Get single category
    category: async (_, { id }) => {
      return await Category.findByPk(id, {
        include: [{ model: Event, as: 'events' }],
      });
    },

    // Get all events the logged-in user registered for
    myRegistrations: async (_, __, context) => {
      const authUser = requireAuth(context);
      return await Registration.findAll({
        where: { user_id: authUser.id },
        include: [
          {
            model: Event, as: 'event',
            include: [{ model: Category, as: 'category' }],
          },
        ],
        order: [['registered_at', 'DESC']],
      });
    },

    // Get attendees for a specific event (organizer only)
    eventAttendees: async (_, { eventId }, context) => {
      const authUser = requireAuth(context);
      const event = await Event.findByPk(eventId);
      if (!event) throw new Error('Event not found');
      if (event.organizer_id !== authUser.id && authUser.role !== 'admin')
        throw new Error('Not authorized to view attendees');

      return await Registration.findAll({
        where: { event_id: eventId },
        include: [{ model: User, as: 'user', attributes: ['id','name','email','department','role'] }],
        order: [['registered_at', 'DESC']],
      });
    },
  },

  // ── Mutation Resolvers ──────────────────────────────────────────────────────

  Mutation: {

    // Register a new user
    register: async (_, { name, email, password, role = 'student', department }) => {
      const existing = await User.findOne({ where: { email } });
      if (existing) throw new Error('Email already registered');

      const password_hash = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, password_hash, role, department });

      return { token: generateToken(user), user };
    },

    // Login
    login: async (_, { email, password }) => {
      const user = await User.findOne({ where: { email, is_active: true } });
      if (!user) throw new Error('Invalid email or password');

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) throw new Error('Invalid email or password');

      return { token: generateToken(user), user };
    },

    // Update user profile
    updateProfile: async (_, { name, department }, context) => {
      const authUser = requireAuth(context);
      await User.update({ name, department }, { where: { id: authUser.id } });
      return await User.findByPk(authUser.id, { attributes: { exclude: ['password_hash'] } });
    },

    // Create a new event
    createEvent: async (_, args, context) => {
      const authUser = requireOrganizer(context);

      const event = await Event.create({
        ...args,
        organizer_id: authUser.id,
        status: args.status || 'published',
      });

      // Fetch full event with associations
      const fullEvent = await Event.findByPk(event.id, {
        include: [
          { model: User,     as: 'organizer' },
          { model: Category, as: 'category'  },
        ],
      });

      // Publish to GraphQL Subscription — all subscribers get notified
      pubsub.publish(EVENT_CREATED, { eventCreated: fullEvent });

      return fullEvent;
    },

    // Update an existing event
    updateEvent: async (_, { id, ...updates }, context) => {
      const authUser = requireAuth(context);
      const event = await Event.findByPk(id);
      if (!event) throw new Error('Event not found');
      if (event.organizer_id !== authUser.id && authUser.role !== 'admin')
        throw new Error('Not authorized to update this event');

      await event.update(updates);

      // Publish status change subscription if status was updated
      if (updates.status) {
        pubsub.publish(EVENT_STATUS_CHANGED, { eventStatusChanged: event, eventId: id });
      }

      return await Event.findByPk(id, {
        include: [
          { model: User,     as: 'organizer' },
          { model: Category, as: 'category'  },
        ],
      });
    },

    // Delete an event
    deleteEvent: async (_, { id }, context) => {
      const authUser = requireAuth(context);
      const event = await Event.findByPk(id);
      if (!event) throw new Error('Event not found');
      if (event.organizer_id !== authUser.id && authUser.role !== 'admin')
        throw new Error('Not authorized to delete this event');

      await event.destroy();
      return { success: true, message: 'Event deleted successfully' };
    },

    // RSVP to an event
    rsvpEvent: async (_, { eventId }, context) => {
      const authUser = requireAuth(context);

      const event = await Event.findByPk(eventId);
      if (!event || event.status !== 'published')
        throw new Error('Event not available for registration');

      // Check deadline
      if (event.registration_deadline && new Date() > new Date(event.registration_deadline))
        throw new Error('Registration deadline has passed');

      // Check capacity
      const count = await Registration.count({
        where: { event_id: eventId, status: 'registered' },
      });
      if (count >= event.max_capacity) throw new Error('Event is at full capacity');

      // Check existing registration
      const existing = await Registration.findOne({
        where: { event_id: eventId, user_id: authUser.id },
      });

      let registration;
      if (existing) {
        if (existing.status === 'registered')
          throw new Error('Already registered for this event');
        await existing.update({ status: 'registered' });
        registration = existing;
      } else {
        registration = await Registration.create({
          event_id: eventId,
          user_id:  authUser.id,
          status:   'registered',
        });
      }

      // Publish rsvpUpdated subscription — live RSVP counter update
      const updatedEvent = await Event.findByPk(eventId);
      pubsub.publish(RSVP_UPDATED, { rsvpUpdated: updatedEvent, eventId });

      return await Registration.findByPk(registration.id, {
        include: [
          { model: User,  as: 'user'  },
          { model: Event, as: 'event' },
        ],
      });
    },

    // Cancel RSVP
    cancelRsvp: async (_, { eventId }, context) => {
      const authUser = requireAuth(context);
      const registration = await Registration.findOne({
        where: { event_id: eventId, user_id: authUser.id, status: 'registered' },
      });

      if (!registration) throw new Error('No active registration found');
      await registration.update({ status: 'cancelled' });

      // Publish real-time update
      const updatedEvent = await Event.findByPk(eventId);
      pubsub.publish(RSVP_UPDATED, { rsvpUpdated: updatedEvent, eventId });

      return { success: true, message: 'Registration cancelled successfully' };
    },

    // Mark attendee as attended
    markAttended: async (_, { eventId, userId }, context) => {
      const authUser = requireAuth(context);
      const event = await Event.findByPk(eventId);
      if (!event) throw new Error('Event not found');
      if (event.organizer_id !== authUser.id && authUser.role !== 'admin')
        throw new Error('Not authorized');

      const registration = await Registration.findOne({
        where: { event_id: eventId, user_id: userId },
      });
      if (!registration) throw new Error('Registration not found');

      await registration.update({ status: 'attended' });
      return await Registration.findByPk(registration.id, {
        include: [
          { model: User,  as: 'user'  },
          { model: Event, as: 'event' },
        ],
      });
    },

    // Create category (admin only)
    createCategory: async (_, { name, color, icon }, context) => {
      const authUser = requireAuth(context);
      if (authUser.role !== 'admin') throw new Error('Only admins can create categories');
      return await Category.create({ name, color: color || '#6366f1', icon: icon || 'calendar' });
    },
  },

  // ── Subscription Resolvers ──────────────────────────────────────────────────
  // These power real-time features via WebSocket

  Subscription: {

    // Fires when anyone RSVPs or cancels for a specific event
    rsvpUpdated: {
      subscribe: (_, { eventId }) =>
        pubsub.asyncIterator([RSVP_UPDATED]),
      resolve: (payload) => payload.rsvpUpdated,
    },

    // Fires when any new event is published
    eventCreated: {
      subscribe: () => pubsub.asyncIterator([EVENT_CREATED]),
      resolve: (payload) => payload.eventCreated,
    },

    // Fires when a specific event's status changes
    eventStatusChanged: {
      subscribe: (_, { eventId }) =>
        pubsub.asyncIterator([EVENT_STATUS_CHANGED]),
      resolve: (payload) => payload.eventStatusChanged,
    },
  },

  // ── Field Resolvers ─────────────────────────────────────────────────────────
  // These compute derived fields on types

  Event: {
    // Compute live RSVP count from registrations
    rsvp_count: async (event) => {
      return await Registration.count({
        where: { event_id: event.id, status: 'registered' },
      });
    },
  },
};

module.exports = { resolvers, pubsub };