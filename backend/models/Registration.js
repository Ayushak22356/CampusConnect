const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Registration = sequelize.define('Registration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'events', key: 'id' },
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  status: {
    type: DataTypes.ENUM('registered', 'attended', 'cancelled'),
    defaultValue: 'registered',
  },
  registered_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'registrations',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['event_id', 'user_id'],  // prevents duplicate registrations
    },
  ],
});

module.exports = Registration;