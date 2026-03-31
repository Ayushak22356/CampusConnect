const { gql } = require('apollo-server-express');

const typeDefs = gql`

  # ── Scalar Types ─────────────────────────────────────────────────────────────
  scalar Date

  # ── Object Types ─────────────────────────────────────────────────────────────

  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    department: String
    avatar_url: String
    is_active: Boolean
    created_at: String
    organizedEvents: [Event]
    registrations: [Registration]
  }

  type Category {
    id: ID!
    name: String!
    color: String
    icon: String
    events: [Event]
  }

  type Event {
    id: ID!
    title: String!
    description: String!
    venue: String!
    event_date: String!
    start_time: String!
    end_time: String!
    max_capacity: Int
    registration_deadline: String
    is_public: Boolean
    status: String!
    tags: String
    banner_url: String
    created_at: String
    organizer: User
    category: Category
    agendaItems: [AgendaItem]
    registrations: [Registration]
    rsvp_count: Int
  }

  type AgendaItem {
    id: ID!
    title: String!
    description: String
    speaker: String
    start_time: String!
    end_time: String!
    order_index: Int
    event: Event
  }

  type Registration {
    id: ID!
    status: String!
    registered_at: String
    user: User
    event: Event
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type DeleteResult {
    success: Boolean!
    message: String!
  }

  # ── Query Type ───────────────────────────────────────────────────────────────
  # All READ operations

  type Query {
    # Users
    me: User
    user(id: ID!): User
    users: [User]

    # Events
    events(
      search: String
      category: ID
      status: String
      upcoming: Boolean
    ): [Event]
    event(id: ID!): Event
    myEvents: [Event]

    # Categories
    categories: [Category]
    category(id: ID!): Category

    # Registrations
    myRegistrations: [Registration]
    eventAttendees(eventId: ID!): [Registration]
  }

  # ── Mutation Type ────────────────────────────────────────────────────────────
  # All CREATE / UPDATE / DELETE operations

  type Mutation {
    # Auth
    register(
      name: String!
      email: String!
      password: String!
      role: String
      department: String
    ): AuthPayload!

    login(
      email: String!
      password: String!
    ): AuthPayload!

    updateProfile(
      name: String
      department: String
    ): User!

    # Events
    createEvent(
      title: String!
      description: String!
      category_id: ID
      venue: String!
      event_date: String!
      start_time: String!
      end_time: String!
      max_capacity: Int
      registration_deadline: String
      is_public: Boolean
      tags: String
      status: String
    ): Event!

    updateEvent(
      id: ID!
      title: String
      description: String
      venue: String
      event_date: String
      start_time: String
      end_time: String
      max_capacity: Int
      status: String
      tags: String
    ): Event!

    deleteEvent(id: ID!): DeleteResult!

    # RSVP
    rsvpEvent(eventId: ID!): Registration!
    cancelRsvp(eventId: ID!): DeleteResult!
    markAttended(eventId: ID!, userId: ID!): Registration!

    # Categories (admin only)
    createCategory(name: String!, color: String, icon: String): Category!
  }

  # ── Subscription Type ────────────────────────────────────────────────────────
  # Real-time updates via WebSocket

  type Subscription {
    rsvpUpdated(eventId: ID!): Event
    eventCreated: Event
    eventStatusChanged(eventId: ID!): Event
  }
`;

module.exports = typeDefs;