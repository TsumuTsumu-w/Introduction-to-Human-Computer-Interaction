-- GestureFlow database policy:
-- The backend drops and recreates the whole database on every backend start.
-- MySQL keeps only one persistent table: users.
-- Game state and gesture records are runtime memory only.

DROP DATABASE IF EXISTS gestureflow_hci;
CREATE DATABASE gestureflow_hci DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gestureflow_hci;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(220) NOT NULL,
  display_name VARCHAR(80) NOT NULL DEFAULT '',
  role VARCHAR(32) NOT NULL DEFAULT 'student',
  avatar_color VARCHAR(32) NOT NULL DEFAULT '#e5875f',
  status TINYINT NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
