const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Category name cannot be empty' },
    },
  },
  color: {
    type: DataTypes.STRING(7),
    defaultValue: '#6366f1',
    validate: {
      is: /^#[0-9A-Fa-f]{6}$/,  // must be valid hex color
    },
  },
  icon: {
    type: DataTypes.STRING(50),
    defaultValue: 'calendar',
  },
}, {
  tableName: 'categories',
  timestamps: false,  // categories table has no timestamps
});

module.exports = Category;