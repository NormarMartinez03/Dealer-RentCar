const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rentcar-secret-change-me';
const DB_PATH = path.join(__dirname, 'rentcar.sqlite');

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '1mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 35,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta más tarde.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

let db;

function sanitizeUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
}

function calculateBookingTotal(pricePerDay, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.ceil((end - start) / msPerDay);

  if (!Number.isFinite(days) || days <= 0) {
    throw new Error('Rango de fechas inválido.');
  }

  const subtotal = days * pricePerDay;
  const serviceFee = days * 5;
  const taxes = Number(((subtotal + serviceFee) * 0.18).toFixed(2));
  const total = Number((subtotal + serviceFee + taxes).toFixed(2));

  return { days, subtotal, serviceFee, taxes, total };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name, email: user.email }, JWT_SECRET, {
    expiresIn: '8h'
  });
}

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido.' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción.' });
    }
    return next();
  };
}

async function initDatabase() {
  db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL CHECK(role IN ('admin','customer','agent')) DEFAULT 'customer',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cars (
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

    CREATE TABLE IF NOT EXISTS bookings (
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

    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const adminExists = await db.get('SELECT id FROM users WHERE email = ?', ['admin@rentcar.com']);
  if (!adminExists) {
    const hash = await bcrypt.hash('Admin123*', 10);
    await db.run(
      'INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)',
      ['Administrador', 'admin@rentcar.com', hash, '3000000000', 'admin']
    );
  }

  const carCount = await db.get('SELECT COUNT(*) AS total FROM cars');
  if (carCount.total === 0) {
    const seedCars = [
      ['Toyota Corolla', 'Toyota', 'Corolla', 2026, 'economico', 'Automática', 'Gasolina', 5, 2, 'Santo Domingo', 45, 4.7, 'https://media.ed.edmunds-media.com/toyota/corolla/2026/oem/2026_toyota_corolla_sedan_xse_fq_oem_1_600.jpg', 'Excelente para ciudad y viajes cortos.', 'Aire acondicionado,Bluetooth,GPS,Seguro básico'],
      ['Ferrari La Ferrari', 'Ferrari', 'La Ferrari', 2024, 'deportivo', 'Automática', 'Gasolina', 2, 1, 'Santiago', 250, 4.9, 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=80', 'Superdeportivo de lujo.', 'Cámara de reversa,Apple CarPlay,Seguro premium'],
      ['BMW X5', 'BMW', 'X5', 2024, 'lujo', 'Automática', 'Híbrido', 5, 5, 'Bani', 140, 4.9, 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80', 'Vehículo premium para carretera.', 'Asientos en cuero,Sunroof,Sonido premium,Seguro todo riesgo']
    ];

    for (const car of seedCars) {
      await db.run(
        `INSERT INTO cars (name, brand, model, year, category, transmission, fuel, seats, luggage, location, price_per_day, rating, image, description, features)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        car
      );
    }
  }
}

app.post('/api/auth/register', async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Datos inválidos. Verifica nombre/correo/contraseña.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const allowedRole = ['customer', 'agent'].includes(role) ? role : 'customer';
  const existing = await db.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
  if (existing) return res.status(409).json({ error: 'El correo ya está registrado.' });

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await db.run(
    'INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)',
    [name.trim(), cleanEmail, passwordHash, phone || '', allowedRole]
  );

  const user = await db.get('SELECT id, name, email, phone, role FROM users WHERE id = ?', [result.lastID]);
  const token = signToken(user);
  res.status(201).json({ user, token });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña son requeridos.' });

  const user = await db.get('SELECT * FROM users WHERE email = ?', [String(email).trim().toLowerCase()]);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas.' });

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) return res.status(401).json({ error: 'Credenciales inválidas.' });

  const cleanUser = sanitizeUser(user);
  const token = signToken(cleanUser);
  res.json({ user: cleanUser, token });
});

app.get('/api/cars', async (req, res) => {
  const { category = 'todos', location = 'todos', maxPrice = 9999 } = req.query;

  const clauses = ['active = 1'];
  const params = [];

  if (category !== 'todos') {
    clauses.push('category = ?');
    params.push(String(category).toLowerCase());
  }

  if (location !== 'todos') {
    clauses.push('location = ?');
    params.push(location);
  }

  clauses.push('price_per_day <= ?');
  params.push(Number(maxPrice) || 9999);

  const cars = await db.all(
    `SELECT id, name, brand, model, year, category, transmission, fuel, seats, luggage, location,
      price_per_day as pricePerDay, rating, image, description, features
     FROM cars WHERE ${clauses.join(' AND ')} ORDER BY id DESC`,
    params
  );

  const normalized = cars.map((car) => ({ ...car, features: (car.features || '').split(',').filter(Boolean) }));
  res.json(normalized);
});

app.get('/api/cars/:id', async (req, res) => {
  const car = await db.get(
    `SELECT id, name, brand, model, year, category, transmission, fuel, seats, luggage, location,
      price_per_day as pricePerDay, rating, image, description, features
     FROM cars WHERE id = ? AND active = 1`,
    [Number(req.params.id)]
  );
  if (!car) return res.status(404).json({ error: 'Vehículo no encontrado.' });
  res.json({ ...car, features: (car.features || '').split(',').filter(Boolean) });
});

app.post('/api/bookings', authRequired, async (req, res) => {
  const { carId, startDate, endDate } = req.body;
  const car = await db.get('SELECT id, price_per_day FROM cars WHERE id = ? AND active = 1', [carId]);
  if (!car) return res.status(404).json({ error: 'Vehículo no disponible.' });

  try {
    const totals = calculateBookingTotal(car.price_per_day, startDate, endDate);
    const result = await db.run(
      `INSERT INTO bookings (user_id, car_id, start_date, end_date, days, subtotal, service_fee, taxes, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmada')`,
      [req.user.sub, car.id, startDate, endDate, totals.days, totals.subtotal, totals.serviceFee, totals.taxes, totals.total]
    );

    const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [result.lastID]);
    return res.status(201).json(booking);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post('/api/inquiries', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'Todos los campos son requeridos.' });

  await db.run('INSERT INTO inquiries (name, email, message) VALUES (?, ?, ?)', [name.trim(), email.trim(), message.trim()]);
  res.status(201).json({ message: 'Consulta enviada.' });
});

app.get('/api/admin/stats', authRequired, roleRequired('admin'), async (_req, res) => {
  const [users, cars, bookings, inquiries] = await Promise.all([
    db.get('SELECT COUNT(*) as total FROM users'),
    db.get('SELECT COUNT(*) as total FROM cars WHERE active = 1'),
    db.get('SELECT COUNT(*) as total FROM bookings'),
    db.get('SELECT COUNT(*) as total FROM inquiries')
  ]);
  res.json({ users: users.total, cars: cars.total, bookings: bookings.total, inquiries: inquiries.total });
});

app.get('/api/admin/users', authRequired, roleRequired('admin'), async (_req, res) => {
  const users = await db.all('SELECT id, name, email, phone, role, created_at FROM users ORDER BY id DESC');
  res.json(users);
});

app.get('/api/admin/bookings', authRequired, roleRequired('admin'), async (_req, res) => {
  const bookings = await db.all(
    `SELECT b.id, u.name as customer, c.name as car, b.start_date, b.end_date, b.days, b.total, b.status, b.created_at
     FROM bookings b
     JOIN users u ON u.id = b.user_id
     JOIN cars c ON c.id = b.car_id
     ORDER BY b.id DESC`
  );
  res.json(bookings);
});

app.get('/api/admin/inquiries', authRequired, roleRequired('admin'), async (_req, res) => {
  const inquiries = await db.all('SELECT id, name, email, message, created_at FROM inquiries ORDER BY id DESC');
  res.json(inquiries);
});

app.get('/api/me', authRequired, async (req, res) => {
  const user = await db.get('SELECT id, name, email, phone, role FROM users WHERE id = ?', [req.user.sub]);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json(user);
});

app.listen(PORT, async () => {
  await initDatabase();
  console.log(`Backend listo en http://localhost:${PORT}`);
});
