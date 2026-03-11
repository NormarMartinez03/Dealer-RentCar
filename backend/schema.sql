PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK(role IN ('admin','customer','agent')) DEFAULT 'customer',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  category TEXT NOT NULL,
  transmission TEXT NOT NULL,
  fuel TEXT NOT NULL,
  seats INTEGER NOT NULL,
  luggage INTEGER NOT NULL,
  location TEXT NOT NULL,
  price_per_day REAL NOT NULL,
  rating REAL NOT NULL,
  image TEXT,
  description TEXT,
  features TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  car_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days INTEGER NOT NULL,
  subtotal REAL NOT NULL,
  service_fee REAL NOT NULL,
  taxes REAL NOT NULL,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmada',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(car_id) REFERENCES cars(id)
);

CREATE TABLE inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
