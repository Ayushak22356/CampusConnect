-- Campus Connect Database Schema
-- Run this file once to set up the database

CREATE DATABASE IF NOT EXISTS campus_connect;
USE campus_connect;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'faculty', 'organizer', 'admin') DEFAULT 'student',
  department VARCHAR(100),
  avatar_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#6366f1',
  icon VARCHAR(50) DEFAULT 'calendar'
);

-- EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category_id INT,
  organizer_id INT NOT NULL,
  venue VARCHAR(200) NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_capacity INT DEFAULT 100,
  registration_deadline DATE,
  is_public BOOLEAN DEFAULT TRUE,
  status ENUM('draft', 'published', 'cancelled', 'completed') DEFAULT 'draft',
  banner_url VARCHAR(255),
  tags VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- RSVP / ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('registered', 'attended', 'cancelled') DEFAULT 'registered',
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_registration (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- EVENT AGENDA / SCHEDULE TABLE
CREATE TABLE IF NOT EXISTS agenda_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  speaker VARCHAR(100),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  order_index INT DEFAULT 0,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  organizer_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- SEED: Default Categories
INSERT IGNORE INTO categories (name, color, icon) VALUES
  ('Academic', '#6366f1', 'book'),
  ('Cultural', '#f59e0b', 'music'),
  ('Sports', '#10b981', 'trophy'),
  ('Tech', '#3b82f6', 'cpu'),
  ('Workshop', '#ec4899', 'tool'),
  ('Social', '#8b5cf6', 'users'),
  ('Career', '#14b8a6', 'briefcase');

-- SEED: Admin User (password: Admin@123)
INSERT IGNORE INTO users (name, email, password_hash, role) VALUES
  ('Campus Admin', 'admin@campus.edu', '$2b$10$rQZ9N1k2mL8P4xVbT7wYuOQ3sJ6dF0gH5cI2eA1nM9oK4pR7vX8Wy', 'admin');