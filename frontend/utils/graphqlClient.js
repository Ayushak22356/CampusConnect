// ─── utils/graphqlClient.js ───────────────────────────────────────────────────
// A simple GraphQL client using fetch
// Alternative to Apollo Client — works without extra libraries

const GRAPHQL_URL = 'http://localhost:5000/graphql';

// Core request function
const gqlRequest = async (query, variables = {}) => {
  const token = localStorage.getItem('cc_token');

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json();

  if (json.errors) {
    throw new Error(json.errors[0]?.message || 'GraphQL error');
  }

  return json.data;
};

export default gqlRequest;

// ── All GraphQL Queries ───────────────────────────────────────────────────────

export const GET_EVENTS = `
  query GetEvents($search: String, $category: ID, $status: String, $upcoming: Boolean) {
    events(search: $search, category: $category, status: $status, upcoming: $upcoming) {
      id
      title
      description
      venue
      event_date
      start_time
      end_time
      max_capacity
      status
      tags
      rsvp_count
      organizer {
        id
        name
        department
      }
      category {
        id
        name
        color
        icon
      }
    }
  }
`;

export const GET_EVENT = `
  query GetEvent($id: ID!) {
    event(id: $id) {
      id
      title
      description
      venue
      event_date
      start_time
      end_time
      max_capacity
      registration_deadline
      is_public
      status
      tags
      rsvp_count
      organizer {
        id
        name
        email
        department
      }
      category {
        id
        name
        color
      }
      agendaItems {
        id
        title
        description
        speaker
        start_time
        end_time
        order_index
      }
    }
  }
`;

export const GET_CATEGORIES = `
  query GetCategories {
    categories {
      id
      name
      color
      icon
    }
  }
`;

export const GET_ME = `
  query GetMe {
    me {
      id
      name
      email
      role
      department
      avatar_url
      created_at
    }
  }
`;

export const GET_MY_EVENTS = `
  query GetMyEvents {
    myEvents {
      id
      title
      venue
      event_date
      start_time
      status
      rsvp_count
      max_capacity
      category {
        name
        color
      }
    }
  }
`;

export const GET_MY_REGISTRATIONS = `
  query GetMyRegistrations {
    myRegistrations {
      id
      status
      registered_at
      event {
        id
        title
        venue
        event_date
        start_time
        end_time
        status
        category {
          name
          color
        }
      }
    }
  }
`;

export const GET_EVENT_ATTENDEES = `
  query GetEventAttendees($eventId: ID!) {
    eventAttendees(eventId: $eventId) {
      id
      status
      registered_at
      user {
        id
        name
        email
        department
        role
      }
    }
  }
`;

// ── All GraphQL Mutations ─────────────────────────────────────────────────────

export const REGISTER_MUTATION = `
  mutation Register($name: String!, $email: String!, $password: String!, $role: String, $department: String) {
    register(name: $name, email: $email, password: $password, role: $role, department: $department) {
      token
      user {
        id
        name
        email
        role
        department
      }
    }
  }
`;

export const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        role
        department
      }
    }
  }
`;

export const CREATE_EVENT_MUTATION = `
  mutation CreateEvent(
    $title: String!, $description: String!, $venue: String!,
    $event_date: String!, $start_time: String!, $end_time: String!,
    $category_id: ID, $max_capacity: Int, $registration_deadline: String,
    $is_public: Boolean, $tags: String, $status: String
  ) {
    createEvent(
      title: $title, description: $description, venue: $venue,
      event_date: $event_date, start_time: $start_time, end_time: $end_time,
      category_id: $category_id, max_capacity: $max_capacity,
      registration_deadline: $registration_deadline, is_public: $is_public,
      tags: $tags, status: $status
    ) {
      id
      title
      status
    }
  }
`;

export const RSVP_MUTATION = `
  mutation RsvpEvent($eventId: ID!) {
    rsvpEvent(eventId: $eventId) {
      id
      status
      registered_at
    }
  }
`;

export const CANCEL_RSVP_MUTATION = `
  mutation CancelRsvp($eventId: ID!) {
    cancelRsvp(eventId: $eventId) {
      success
      message
    }
  }
`;

export const MARK_ATTENDED_MUTATION = `
  mutation MarkAttended($eventId: ID!, $userId: ID!) {
    markAttended(eventId: $eventId, userId: $userId) {
      id
      status
    }
  }
`;

export const DELETE_EVENT_MUTATION = `
  mutation DeleteEvent($id: ID!) {
    deleteEvent(id: $id) {
      success
      message
    }
  }
`;

// ── React Hook: useGraphQL ────────────────────────────────────────────────────
// Convenient hook for running GraphQL operations in components
import { useState, useCallback } from 'react';

export const useGraphQL = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const execute = useCallback(async (query, variables = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await gqlRequest(query, variables);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
};