// ─── models/index.js ─────────────────────────────────────────────────────────
// Imports all models and defines their associations (relationships)

const sequelize    = require('../config/sequelize');
const User         = require('./User');
const Event        = require('./Event');
const Category     = require('./Category');
const Registration = require('./Registration');
const AgendaItem   = require('./AgendaItem');

// ── Associations ──────────────────────────────────────────────────────────────

// A User can organize MANY Events
User.hasMany(Event, { foreignKey: 'organizer_id', as: 'organizedEvents' });
Event.belongsTo(User, { foreignKey: 'organizer_id', as: 'organizer' });

// A Category can have MANY Events
Category.hasMany(Event, { foreignKey: 'category_id', as: 'events' });
Event.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// An Event has MANY AgendaItems
Event.hasMany(AgendaItem, { foreignKey: 'event_id', as: 'agendaItems', onDelete: 'CASCADE' });
AgendaItem.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

// Many-to-Many: Users register for many Events, Events have many registered Users
// The "through" table is Registration
User.belongsToMany(Event, {
  through: Registration,
  foreignKey: 'user_id',
  otherKey: 'event_id',
  as: 'registeredEvents',
});
Event.belongsToMany(User, {
  through: Registration,
  foreignKey: 'event_id',
  otherKey: 'user_id',
  as: 'attendees',
});

// Registration also has direct associations for querying
Registration.belongsTo(User,  { foreignKey: 'user_id',  as: 'user'  });
Registration.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
User.hasMany(Registration,    { foreignKey: 'user_id',  as: 'registrations' });
Event.hasMany(Registration,   { foreignKey: 'event_id', as: 'registrations' });

module.exports = { sequelize, User, Event, Category, Registration, AgendaItem };