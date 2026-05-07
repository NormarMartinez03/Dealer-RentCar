const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'rentcar-secret-change-me';
const DB_PATH = path.join(__dirname, 'rentcar.sqlite');
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:8000';
const PASSWORD_RESET_EXPIRATION_MINUTES = 30;
const DEFAULT_SUPPORT_INBOX_EMAIL = 'normarcampos03@gmail.com';
const DEFAULT_ADMIN_USER_EMAIL = 'normarcampos03@gmail.com';
const DEFAULT_AGENT_USER_EMAIL = 'normarcampos03+agente@gmail.com';
const SUPPORT_INBOX_EMAIL = process.env.SUPPORT_INBOX_EMAIL || DEFAULT_SUPPORT_INBOX_EMAIL;
const ADMIN_USER_EMAIL = process.env.ADMIN_USER_EMAIL || DEFAULT_ADMIN_USER_EMAIL;
const AGENT_USER_EMAIL = process.env.AGENT_USER_EMAIL || DEFAULT_AGENT_USER_EMAIL;
const COMPANY_NAME = process.env.COMPANY_NAME || 'RentCar Express';

const USER_ROLES = ['admin', 'agent', 'customer'];
const BOOKING_STATUSES = ['confirmada', 'en_curso', 'completada', 'cancelada'];
const ACTIVE_BOOKING_STATUSES = ['confirmada', 'en_curso'];

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '1mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 35,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo mas tarde.' }
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
let mailTransporter = null;

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    active: user.active === 0 ? 0 : 1,
    createdAt: user.created_at
  };
}

function splitFeatures(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toFeaturesString(features) {
  if (Array.isArray(features)) {
    return features
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(',');
  }
  return String(features || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .join(',');
}

function formatCar(row) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    model: row.model,
    year: row.year,
    category: row.category,
    transmission: row.transmission,
    fuel: row.fuel,
    seats: row.seats,
    luggage: row.luggage,
    location: row.location,
    pricePerDay: row.price_per_day,
    rating: row.rating,
    image: row.image,
    description: row.description,
    features: splitFeatures(row.features),
    active: row.active === 0 ? 0 : 1,
    createdAt: row.created_at
  };
}

function formatBooking(row) {
  return {
    id: row.id,
    userId: row.user_id,
    carId: row.car_id,
    startDate: row.start_date,
    endDate: row.end_date,
    days: row.days,
    subtotal: row.subtotal,
    serviceFee: row.service_fee,
    taxes: row.taxes,
    total: row.total,
    status: row.status,
    billingEmail: row.billing_email,
    paymentLast4: row.payment_last4,
    ncf: row.ncf,
    agentNote: row.agent_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(Number(value || 0));
}

function formatLongDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: '2-digit'
  });
}

function getMailFromAddress() {
  return process.env.MAIL_FROM || process.env.SMTP_USER || SUPPORT_INBOX_EMAIL;
}

function getMailFromHeader() {
  const fromAddress = getMailFromAddress();
  const fromName = normalizeText(process.env.MAIL_FROM_NAME || COMPANY_NAME).replace(/"/g, '');
  return fromName ? `"${fromName}" <${fromAddress}>` : fromAddress;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildInvoiceData(row) {
  return {
    bookingId: row.id,
    ncf: row.ncf || '-',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startDate: row.start_date,
    endDate: row.end_date,
    days: row.days,
    subtotal: Number(row.subtotal || 0),
    serviceFee: Number(row.service_fee || 0),
    taxes: Number(row.taxes || 0),
    total: Number(row.total || 0),
    billingEmail: row.billing_email || row.customer_email || '',
    paymentLast4: row.payment_last4 || '',
    customer: {
      id: row.user_id,
      name: row.customer_name || 'Cliente',
      email: row.customer_email || '',
      phone: row.customer_phone || ''
    },
    car: {
      id: row.car_id,
      name: row.car_name || '',
      brand: row.car_brand || '',
      model: row.car_model || '',
      year: row.car_year || '',
      category: row.car_category || '',
      transmission: row.car_transmission || '',
      fuel: row.car_fuel || '',
      location: row.car_location || ''
    }
  };
}

function renderInvoicePdf(res, invoice) {
  const filename = `factura-reserva-${invoice.bookingId}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(24).text(COMPANY_NAME, { align: 'left' });
  doc.moveDown(0.2);
  doc.fontSize(11).fillColor('#555555').text('Factura de reserva');
  doc.fillColor('#000000');
  doc.moveDown(1);

  doc.fontSize(12).text(`Factura / NCF: ${invoice.ncf}`);
  doc.text(`Reserva: #${invoice.bookingId}`);
  doc.text(`Estado: ${invoice.status}`);
  doc.text(`Emitida: ${formatLongDate(invoice.createdAt)}`);
  doc.moveDown(1);

  doc.fontSize(14).text('Cliente');
  doc.fontSize(11).text(invoice.customer.name);
  doc.text(invoice.customer.email || '-');
  doc.text(invoice.customer.phone || '-');
  doc.moveDown(0.8);

  doc.fontSize(14).text('Vehiculo');
  doc.fontSize(11).text(`${invoice.car.brand} ${invoice.car.model} ${invoice.car.year}`.trim());
  doc.text(invoice.car.name || '-');
  doc.text(`${invoice.car.location || '-'} | ${invoice.car.transmission || '-'} | ${invoice.car.fuel || '-'}`);
  doc.moveDown(0.8);

  doc.fontSize(14).text('Periodo de renta');
  doc.fontSize(11).text(`${formatLongDate(invoice.startDate)} al ${formatLongDate(invoice.endDate)}`);
  doc.text(`Dias: ${invoice.days}`);
  doc.text(`Correo de facturacion: ${invoice.billingEmail || '-'}`);
  doc.text(`Metodo de pago: ${invoice.paymentLast4 ? `**** ${invoice.paymentLast4}` : '-'}`);
  doc.moveDown(1);

  doc.fontSize(14).text('Resumen');
  doc.moveDown(0.5);
  [
    ['Subtotal', formatCurrency(invoice.subtotal)],
    ['Cargo por servicio', formatCurrency(invoice.serviceFee)],
    ['Impuestos', formatCurrency(invoice.taxes)],
    ['Total', formatCurrency(invoice.total)]
  ].forEach(([label, value], index) => {
    const isTotal = index === 3;
    doc.fontSize(isTotal ? 13 : 11).font(isTotal ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(label, 50, doc.y, { continued: true });
    doc.text(value, { align: 'right' });
  });

  doc.moveDown(1.5);
  doc.fontSize(10).font('Helvetica').fillColor('#555555');
  doc.text(`Documento generado automaticamente por ${COMPANY_NAME}.`, { align: 'center' });
  doc.end();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || '').trim();
}

function toPositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function validateDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Las fechas son invalidas.');
  }
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.ceil((end - start) / msPerDay);
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error('La fecha final debe ser mayor a la fecha inicial.');
  }
  return { start, end, days };
}

function calculateBookingTotal(pricePerDay, startDate, endDate) {
  const { days } = validateDateRange(startDate, endDate);
  const subtotal = Number((days * pricePerDay).toFixed(2));
  const serviceFee = Number((days * 5).toFixed(2));
  const taxes = Number(((subtotal + serviceFee) * 0.18).toFixed(2));
  const total = Number((subtotal + serviceFee + taxes).toFixed(2));
  return { days, subtotal, serviceFee, taxes, total };
}

function generateNCF() {
  const random = String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0');
  return `B01${random}`;
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isMailDeliveryConfigured() {
  return Boolean(getMailTransporter());
}

function getMailTransporter() {
  if (mailTransporter) return mailTransporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  mailTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
  return mailTransporter;
}

async function deliverMail({ previewTag, previewPayload, message }) {
  const transporter = getMailTransporter();
  if (!transporter) {
    console.log(`[${previewTag}_SIMULATION]`, previewPayload);
    return { status: 'simulado', error: null };
  }

  try {
    await transporter.sendMail({
      from: getMailFromHeader(),
      ...message
    });
    console.log(`[${previewTag}_SENT]`, {
      to: message.to,
      subject: message.subject
    });
    return { status: 'enviado', error: null };
  } catch (error) {
    console.error(`[${previewTag}_ERROR]`, {
      to: message.to,
      subject: message.subject,
      error: error.message || 'No se pudo enviar el correo.'
    });
    return { status: 'fallido', error: error.message || 'No se pudo enviar el correo.' };
  }
}

async function sendPasswordResetEmail({ to, name, resetLink }) {
  const safeName = name || 'usuario';
  const message = [
    `Hola ${safeName},`,
    '',
    'Recibimos una solicitud para restablecer tu contrasena en RentCar.',
    `Abre este enlace para cambiarla: ${resetLink}`,
    '',
    `Este enlace caduca en ${PASSWORD_RESET_EXPIRATION_MINUTES} minutos.`,
    'Si no solicitaste este cambio, ignora este correo.'
  ].join('\n');

  return deliverMail({
    previewTag: 'PASSWORD_RESET',
    previewPayload: { to, resetLink },
    message: {
      to,
      subject: 'Restablece tu contrasena de RentCar',
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="margin-bottom: 8px;">Recuperacion de contrasena</h2>
          <p>Hola ${escapeHtml(safeName)},</p>
          <p>Recibimos una solicitud para restablecer tu contrasena en ${COMPANY_NAME}.</p>
          <p>
            <a href="${resetLink}" style="display:inline-block;padding:12px 18px;background:#f97316;color:#ffffff;text-decoration:none;border-radius:8px;">
              Restablecer contrasena
            </a>
          </p>
          <p>Tambien puedes copiar este enlace en tu navegador:</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>Este enlace caduca en ${PASSWORD_RESET_EXPIRATION_MINUTES} minutos.</p>
          <p>Si no solicitaste este cambio, ignora este correo.</p>
        </div>
      `
    }
  });
}

async function sendPasswordChangedEmail({ to, name }) {
  const safeName = name || 'usuario';
  const text = [
    `Hola ${safeName},`,
    '',
    'Tu contrasena de RentCar fue actualizada correctamente.',
    'Si no reconoces este cambio, comunicate con soporte de inmediato.'
  ].join('\n');

  return deliverMail({
    previewTag: 'PASSWORD_CHANGED',
    previewPayload: { to },
    message: {
      to,
      subject: 'Tu contrasena fue actualizada',
      text,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="margin-bottom: 8px;">Cambio de contrasena confirmado</h2>
          <p>Hola ${escapeHtml(safeName)},</p>
          <p>Tu contrasena de ${COMPANY_NAME} fue actualizada correctamente.</p>
          <p>Si no reconoces este cambio, comunicate con soporte de inmediato.</p>
        </div>
      `
    }
  });
}

async function getValidPasswordReset(token) {
  const tokenHash = hashToken(token);
  const resetRow = await db.get(
    `
      SELECT pr.id, pr.user_id, pr.expires_at, u.name as user_name, u.email as user_email
      FROM password_resets pr
      JOIN users u ON u.id = pr.user_id
      WHERE pr.token_hash = ? AND pr.used_at IS NULL AND u.active = 1
    `,
    [tokenHash]
  );

  if (!resetRow) {
    return { valid: false, reason: 'invalid' };
  }

  if (new Date(resetRow.expires_at).getTime() <= Date.now()) {
    await db.run('DELETE FROM password_resets WHERE id = ?', [resetRow.id]);
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, resetRow };
}

async function sendInquiryEmail({ name, email, subject, message }) {
  const supportText = [`Nombre: ${name}`, `Correo: ${email}`, `Asunto: ${subject}`, '', 'Mensaje:', message].join('\n');
  const supportDelivery = await deliverMail({
    previewTag: 'INQUIRY_SUPPORT',
    previewPayload: {
      to: SUPPORT_INBOX_EMAIL,
      from: email,
      name,
      subject,
      message
    },
    message: {
      to: SUPPORT_INBOX_EMAIL,
      replyTo: email,
      subject: `Nueva consulta: ${subject}`,
      text: supportText,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="margin-bottom: 8px;">Nueva consulta recibida</h2>
          <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
          <p><strong>Correo:</strong> ${escapeHtml(email)}</p>
          <p><strong>Asunto:</strong> ${escapeHtml(subject)}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
        </div>
      `
    }
  });

  const confirmationDelivery = await deliverMail({
    previewTag: 'INQUIRY_CONFIRMATION',
    previewPayload: {
      to: email,
      subject,
      supportInbox: SUPPORT_INBOX_EMAIL
    },
    message: {
      to: email,
      subject: 'Recibimos tu consulta',
      text: [
        `Hola ${name},`,
        '',
        'Recibimos tu consulta y nuestro equipo dara seguimiento pronto.',
        `Asunto: ${subject}`,
        `Buzon de soporte: ${SUPPORT_INBOX_EMAIL}`
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="margin-bottom: 8px;">Consulta recibida</h2>
          <p>Hola ${escapeHtml(name)},</p>
          <p>Recibimos tu consulta y nuestro equipo dara seguimiento pronto.</p>
          <p><strong>Asunto:</strong> ${escapeHtml(subject)}</p>
          <p><strong>Correo de soporte:</strong> ${escapeHtml(SUPPORT_INBOX_EMAIL)}</p>
        </div>
      `
    }
  });

  const statuses = [supportDelivery.status, confirmationDelivery.status];
  let status = 'fallido';
  if (statuses.every((value) => value === 'enviado')) status = 'enviado';
  else if (statuses.every((value) => value === 'simulado')) status = 'simulado';
  else if (statuses.some((value) => value === 'enviado' || value === 'simulado')) status = 'parcial';

  const error = [supportDelivery.error, confirmationDelivery.error].filter(Boolean).join(' | ') || null;

  return {
    status,
    error,
    supportStatus: supportDelivery.status,
    confirmationStatus: confirmationDelivery.status
  };
}

async function ensureColumn(tableName, columnName, definition) {
  const columns = await db.all(`PRAGMA table_info(${tableName})`);
  if (columns.some((column) => column.name === columnName)) return;
  await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
}

async function migrateSeedUserEmail({ role, legacyEmail, desiredEmail }) {
  if (!desiredEmail || desiredEmail === legacyEmail) return;

  const desiredOwner = await db.get('SELECT id FROM users WHERE email = ?', [desiredEmail]);
  if (desiredOwner) return;

  const legacyUser = await db.get('SELECT id FROM users WHERE email = ? AND role = ?', [legacyEmail, role]);
  if (!legacyUser) return;

  await db.run('UPDATE users SET email = ? WHERE id = ?', [desiredEmail, legacyUser.id]);
}

async function initDatabase() {
  db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await db.exec('PRAGMA foreign_keys = ON;');
  await db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer', 'agent')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
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
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
  status TEXT NOT NULL DEFAULT 'confirmada' CHECK (status IN ('confirmada', 'en_curso', 'completada', 'cancelada')),
  billing_email TEXT,
  payment_last4 TEXT,
  ncf TEXT,
  agent_note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY(car_id) REFERENCES cars(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  mail_to TEXT,
  mail_status TEXT,
  mail_error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
  `);

  await ensureColumn('users', 'active', 'active INTEGER NOT NULL DEFAULT 1');
  await ensureColumn('cars', 'created_at', 'created_at TEXT DEFAULT CURRENT_TIMESTAMP');
  await ensureColumn('bookings', 'billing_email', 'billing_email TEXT');
  await ensureColumn('bookings', 'payment_last4', 'payment_last4 TEXT');
  await ensureColumn('bookings', 'ncf', 'ncf TEXT');
  await ensureColumn('bookings', 'agent_note', 'agent_note TEXT');
  await ensureColumn('bookings', 'updated_at', 'updated_at TEXT DEFAULT CURRENT_TIMESTAMP');
  await ensureColumn('inquiries', 'subject', 'subject TEXT');
  await ensureColumn('inquiries', 'mail_to', 'mail_to TEXT');
  await ensureColumn('inquiries', 'mail_status', 'mail_status TEXT');
  await ensureColumn('inquiries', 'mail_error', 'mail_error TEXT');

  const seedUsers = [
    {
      name: 'Administrador',
      email: ADMIN_USER_EMAIL,
      password: 'Admin123*',
      phone: '3000000000',
      role: 'admin'
    },
    {
      name: 'Agente de Renta',
      email: AGENT_USER_EMAIL,
      password: 'Empleado123*',
      phone: '3001111111',
      role: 'agent'
    },
    {
      name: 'Cliente Demo',
      email: 'cliente@rentcar.com',
      password: 'Cliente123*',
      phone: '3002222222',
      role: 'customer'
    }
  ];

  await migrateSeedUserEmail({
    role: 'admin',
    legacyEmail: 'admin@rentcar.com',
    desiredEmail: ADMIN_USER_EMAIL
  });
  await migrateSeedUserEmail({
    role: 'agent',
    legacyEmail: 'empleado@rentcar.com',
    desiredEmail: AGENT_USER_EMAIL
  });

  for (const seedUser of seedUsers) {
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [seedUser.email]);
    if (existing) continue;

    const hash = await bcrypt.hash(seedUser.password, 10);
    await db.run(
      'INSERT INTO users (name, email, password_hash, phone, role, active) VALUES (?, ?, ?, ?, ?, 1)',
      [seedUser.name, seedUser.email, hash, seedUser.phone, seedUser.role]
    );
  }

  const carCount = await db.get('SELECT COUNT(*) as total FROM cars');
  if (carCount.total === 0) {
    const seedCars = [
      [
        'Toyota Corolla',
        'Toyota',
        'Corolla',
        2026,
        'economico',
        'Automatica',
        'Gasolina',
        5,
        2,
        'Santo Domingo',
        45,
        4.7,
        'https://media.ed.edmunds-media.com/toyota/corolla/2026/oem/2026_toyota_corolla_sedan_xse_fq_oem_1_600.jpg',
        'Excelente para ciudad y viajes cortos.',
        'Aire acondicionado,Bluetooth,GPS,Seguro basico'
      ],
      [
        'Ferrari LaFerrari',
        'Ferrari',
        'LaFerrari',
        2024,
        'deportivo',
        'Automatica',
        'Gasolina',
        2,
        1,
        'Santiago',
        250,
        4.9,
        'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=80',
        'Superdeportivo de lujo.',
        'Camara de reversa,Apple CarPlay,Seguro premium'
      ],
      [
        'BMW X5',
        'BMW',
        'X5',
        2024,
        'lujo',
        'Automatica',
        'Hibrido',
        5,
        5,
        'Bani',
        140,
        4.9,
        'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80',
        'Vehiculo premium para carretera.',
        'Asientos en cuero,Sunroof,Sonido premium,Seguro todo riesgo'
      ],
      [
        'Jeep Wrangler',
        'Jeep',
        'Wrangler',
        2023,
        'suv',
        'Manual',
        'Gasolina',
        4,
        3,
        'Punta Cana',
        78,
        4.6,
        'https://espaillatmotors.com/website/vehiculo/jeep-wrangler-rubicon-2025/',
        'SUV robusta para escapadas y aventura.',
        'Traccion 4x4,Bluetooth,GPS,Seguro basico'
      ]
    ];

    for (const car of seedCars) {
      await db.run(
        `INSERT INTO cars (
          name, brand, model, year, category, transmission, fuel, seats, luggage,
          location, price_per_day, rating, image, description, features, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        car
      );
    }
  }
}

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Token requerido.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Token invalido o expirado.' });
  }
}

function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta accion.' });
    }
    return next();
  };
}

async function ensureCarAvailability({ carId, startDate, endDate, ignoreBookingId = null }) {
  let query = `
    SELECT COUNT(*) as total
    FROM bookings
    WHERE car_id = ?
      AND status IN ('confirmada', 'en_curso')
      AND NOT (end_date <= ? OR start_date >= ?)
  `;

  const params = [carId, startDate, endDate];
  if (ignoreBookingId) {
    query += ' AND id <> ?';
    params.push(ignoreBookingId);
  }

  const overlap = await db.get(query, params);
  return overlap.total === 0;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/register', async (req, res) => {
  const name = normalizeText(req.body?.name);
  const email = normalizeEmail(req.body?.email);
  const phone = normalizeText(req.body?.phone);
  const password = String(req.body?.password || '');

  if (!name || !email || password.length < 8) {
    return res.status(400).json({ error: 'Datos invalidos. Revisa nombre, correo y contrasena.' });
  }

  const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ error: 'Ese correo ya esta registrado.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await db.run(
    'INSERT INTO users (name, email, password_hash, phone, role, active) VALUES (?, ?, ?, ?, ?, 1)',
    [name, email, passwordHash, phone, 'customer']
  );

  const user = await db.get(
    'SELECT id, name, email, phone, role, active, created_at FROM users WHERE id = ?',
    [result.lastID]
  );

  const safeUser = sanitizeUser(user);
  const token = signToken(safeUser);
  return res.status(201).json({ user: safeUser, token });
});

app.post('/api/auth/login', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contrasena son requeridos.' });
  }

  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || user.active === 0) {
    return res.status(401).json({ error: 'Credenciales invalidas.' });
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Credenciales invalidas.' });
  }

  const cleanUser = sanitizeUser(user);
  const token = signToken(cleanUser);
  return res.json({ user: cleanUser, token });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return res.status(400).json({ error: 'Correo requerido.' });
  }

  const deliveryMode = isMailDeliveryConfigured() ? 'email' : 'simulation';

  const user = await db.get('SELECT id, name, email FROM users WHERE email = ? AND active = 1', [email]);
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRATION_MINUTES * 60 * 1000).toISOString();

    await db.run('DELETE FROM password_resets WHERE user_id = ?', [user.id]);
    await db.run('DELETE FROM password_resets WHERE expires_at <= ?', [new Date().toISOString()]);
    await db.run(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, tokenHash, expiresAt]
    );

    const resetLink = `${FRONTEND_BASE_URL.replace(/\/$/, '')}/reset-password.html?token=${rawToken}`;
    await sendPasswordResetEmail({ to: user.email, name: user.name, resetLink });
  }

  return res.json({
    message: 'Si el correo esta registrado, recibiras un enlace para restablecer tu contrasena.',
    deliveryMode,
    expiresInMinutes: PASSWORD_RESET_EXPIRATION_MINUTES
  });
});

app.post('/api/auth/reset-password/validate', async (req, res) => {
  const token = normalizeText(req.body?.token);
  if (!token) {
    return res.status(400).json({ valid: false, reason: 'missing', error: 'Token requerido.' });
  }

  const validation = await getValidPasswordReset(token);
  if (!validation.valid) {
    const errorByReason = {
      invalid: 'El enlace no es valido o ya fue usado.',
      expired: 'El enlace expiro. Solicita uno nuevo.'
    };
    return res.status(400).json({
      valid: false,
      reason: validation.reason,
      error: errorByReason[validation.reason] || 'No fue posible validar el enlace.'
    });
  }

  return res.json({
    valid: true,
    email: validation.resetRow.user_email,
    expiresAt: validation.resetRow.expires_at
  });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const token = normalizeText(req.body?.token);
  const newPassword = String(req.body?.newPassword || '');

  if (!token || newPassword.length < 8) {
    return res.status(400).json({ error: 'Token y nueva contrasena (minimo 8 caracteres) son requeridos.' });
  }

  const validation = await getValidPasswordReset(token);
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.reason === 'expired' ? 'El enlace expiro. Solicita uno nuevo.' : 'El enlace no es valido o ya fue usado.'
    });
  }
  const { resetRow } = validation;

  const currentUser = await db.get('SELECT id, name, email, password_hash FROM users WHERE id = ?', [resetRow.user_id]);
  if (!currentUser) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const samePassword = await bcrypt.compare(newPassword, currentUser.password_hash);
  if (samePassword) {
    return res.status(400).json({ error: 'La nueva contrasena debe ser diferente a la actual.' });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, resetRow.user_id]);
  await db.run('UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL', [resetRow.user_id]);
  const mailDelivery = await sendPasswordChangedEmail({ to: currentUser.email, name: currentUser.name });

  return res.json({
    message: 'Contrasena actualizada correctamente.',
    mailStatus: mailDelivery.status
  });
});

app.get('/api/cars', async (req, res) => {
  const category = normalizeText(req.query?.category || 'todos').toLowerCase();
  const location = normalizeText(req.query?.location || 'todos');
  const search = normalizeText(req.query?.search || '').toLowerCase();
  const transmission = normalizeText(req.query?.transmission || 'todos').toLowerCase();
  const maxPriceRaw = Number(req.query?.maxPrice || 9999);
  const minSeatsRaw = Number(req.query?.minSeats || 0);
  const startDate = normalizeText(req.query?.startDate || '');
  const endDate = normalizeText(req.query?.endDate || '');
  const onlyAvailable = String(req.query?.onlyAvailable || 'false').toLowerCase() === 'true';

  const clauses = ['active = 1'];
  const params = [];

  if (category !== 'todos') {
    clauses.push('LOWER(category) = ?');
    params.push(category);
  }

  if (location && location.toLowerCase() !== 'todos') {
    clauses.push('location = ?');
    params.push(location);
  }

  if (transmission !== 'todos') {
    clauses.push('LOWER(transmission) = ?');
    params.push(transmission);
  }

  if (Number.isFinite(maxPriceRaw) && maxPriceRaw > 0) {
    clauses.push('price_per_day <= ?');
    params.push(maxPriceRaw);
  }

  if (Number.isFinite(minSeatsRaw) && minSeatsRaw > 0) {
    clauses.push('seats >= ?');
    params.push(minSeatsRaw);
  }

  if (search) {
    clauses.push('(LOWER(name) LIKE ? OR LOWER(brand) LIKE ? OR LOWER(model) LIKE ?)');
    const searchToken = `%${search}%`;
    params.push(searchToken, searchToken, searchToken);
  }

  const rows = await db.all(
    `
      SELECT *
      FROM cars
      WHERE ${clauses.join(' AND ')}
      ORDER BY price_per_day ASC, id DESC
    `,
    params
  );

  let validDateRange = false;
  if (startDate && endDate) {
    try {
      validateDateRange(startDate, endDate);
      validDateRange = true;
    } catch (_error) {
      validDateRange = false;
    }
  }

  const cars = [];
  for (const row of rows) {
    let available = true;
    if (validDateRange) {
      available = await ensureCarAvailability({
        carId: row.id,
        startDate,
        endDate
      });
    }

    if (onlyAvailable && !available) continue;

    cars.push({
      ...formatCar(row),
      available
    });
  }

  return res.json(cars);
});

app.get('/api/cars/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Id invalido.' });
  }

  const row = await db.get('SELECT * FROM cars WHERE id = ? AND active = 1', [id]);
  if (!row) {
    return res.status(404).json({ error: 'Vehiculo no encontrado.' });
  }

  const startDate = normalizeText(req.query?.startDate || '');
  const endDate = normalizeText(req.query?.endDate || '');
  let available = true;
  if (startDate && endDate) {
    validateDateRange(startDate, endDate);
    available = await ensureCarAvailability({ carId: id, startDate, endDate });
  }

  return res.json({ ...formatCar(row), available });
});

app.post('/api/bookings', authRequired, async (req, res) => {
  const carId = Number(req.body?.carId);
  const startDate = normalizeText(req.body?.startDate);
  const endDate = normalizeText(req.body?.endDate);
  const paymentLast4 = normalizeText(req.body?.paymentLast4);
  const billingEmail = normalizeEmail(req.body?.billingEmail || req.user.email);

  if (!Number.isInteger(carId) || carId <= 0 || !startDate || !endDate) {
    return res.status(400).json({ error: 'Datos incompletos para crear la reserva.' });
  }

  if (paymentLast4 && !/^\d{4}$/.test(paymentLast4)) {
    return res.status(400).json({ error: 'El identificador de pago debe tener 4 digitos.' });
  }

  const car = await db.get('SELECT id, name, price_per_day, active FROM cars WHERE id = ?', [carId]);
  if (!car || car.active === 0) {
    return res.status(404).json({ error: 'Vehiculo no disponible.' });
  }

  let totals;
  try {
    totals = calculateBookingTotal(car.price_per_day, startDate, endDate);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const available = await ensureCarAvailability({ carId, startDate, endDate });
  if (!available) {
    return res.status(409).json({ error: 'Este vehiculo ya esta reservado para esas fechas.' });
  }

  const ncf = generateNCF();
  const result = await db.run(
    `
      INSERT INTO bookings (
        user_id,
        car_id,
        start_date,
        end_date,
        days,
        subtotal,
        service_fee,
        taxes,
        total,
        status,
        billing_email,
        payment_last4,
        ncf,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmada', ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [
      req.user.sub,
      carId,
      startDate,
      endDate,
      totals.days,
      totals.subtotal,
      totals.serviceFee,
      totals.taxes,
      totals.total,
      billingEmail,
      paymentLast4 || null,
      ncf
    ]
  );

  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [result.lastID]);
  return res.status(201).json({
    booking: formatBooking(booking),
    carName: car.name,
    invoice: {
      ncf,
      total: totals.total,
      taxes: totals.taxes,
      serviceFee: totals.serviceFee,
      subtotal: totals.subtotal,
      days: totals.days
    }
  });
});

app.get('/api/bookings/me', authRequired, async (req, res) => {
  const rows = await db.all(
    `
      SELECT b.*, c.name as car_name, c.brand as car_brand, c.model as car_model, c.year as car_year,
             c.location as car_location, c.image as car_image
      FROM bookings b
      JOIN cars c ON c.id = b.car_id
      WHERE b.user_id = ?
      ORDER BY b.id DESC
    `,
    [req.user.sub]
  );

  return res.json(
    rows.map((row) => ({
      ...formatBooking(row),
      carName: row.car_name,
      carBrand: row.car_brand,
      carModel: row.car_model,
      carYear: row.car_year,
      carLocation: row.car_location,
      carImage: row.car_image
    }))
  );
});

app.get('/api/bookings/:id/invoice', authRequired, async (req, res) => {
  const bookingId = Number(req.params.id);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ error: 'Id de reserva invalido.' });
  }

  const row = await db.get(
    `
      SELECT b.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
             c.name as car_name, c.brand as car_brand, c.model as car_model, c.year as car_year,
             c.category as car_category, c.transmission as car_transmission, c.fuel as car_fuel,
             c.location as car_location
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN cars c ON c.id = b.car_id
      WHERE b.id = ?
    `,
    [bookingId]
  );

  if (!row) {
    return res.status(404).json({ error: 'Reserva no encontrada.' });
  }

  const canAccess =
    req.user.role === 'admin' || req.user.role === 'agent' || Number(row.user_id) === Number(req.user.sub);
  if (!canAccess) {
    return res.status(403).json({ error: 'No tienes permisos para descargar esta factura.' });
  }

  return renderInvoicePdf(res, buildInvoiceData(row));
});

app.get('/api/agent/bookings', authRequired, roleRequired('agent', 'admin'), async (_req, res) => {
  const rows = await db.all(
    `
      SELECT b.*, u.name as customer_name, u.email as customer_email,
             c.name as car_name, c.location as car_location
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN cars c ON c.id = b.car_id
      ORDER BY b.id DESC
    `
  );

  return res.json(
    rows.map((row) => ({
      ...formatBooking(row),
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      carName: row.car_name,
      carLocation: row.car_location
    }))
  );
});

app.patch('/api/agent/bookings/:id/status', authRequired, roleRequired('agent', 'admin'), async (req, res) => {
  const bookingId = Number(req.params.id);
  const status = normalizeText(req.body?.status);
  const agentNote = normalizeText(req.body?.agentNote);

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ error: 'Id de reserva invalido.' });
  }

  if (!BOOKING_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Estado invalido. Usa: ${BOOKING_STATUSES.join(', ')}` });
  }

  const booking = await db.get('SELECT id FROM bookings WHERE id = ?', [bookingId]);
  if (!booking) {
    return res.status(404).json({ error: 'Reserva no encontrada.' });
  }

  await db.run(
    'UPDATE bookings SET status = ?, agent_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, agentNote || null, bookingId]
  );

  const updated = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
  return res.json({ booking: formatBooking(updated) });
});

app.post('/api/inquiries', async (req, res) => {
  const name = normalizeText(req.body?.name);
  const email = normalizeEmail(req.body?.email);
  const subject = normalizeText(req.body?.subject || 'Consulta general');
  const message = normalizeText(req.body?.message);

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Nombre, correo y mensaje son requeridos.' });
  }

  const delivery = await sendInquiryEmail({ name, email, subject, message });
  const insert = await db.run(
    `
      INSERT INTO inquiries (name, email, subject, message, mail_to, mail_status, mail_error)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [name, email, subject, message, SUPPORT_INBOX_EMAIL, delivery.status, delivery.error]
  );

  return res.status(201).json({
    id: insert.lastID,
    message: 'Consulta enviada correctamente.',
    mailTo: SUPPORT_INBOX_EMAIL,
    mailStatus: delivery.status,
    supportStatus: delivery.supportStatus,
    confirmationStatus: delivery.confirmationStatus
  });
});

app.get('/api/me', authRequired, async (req, res) => {
  const user = await db.get(
    'SELECT id, name, email, phone, role, active, created_at FROM users WHERE id = ? AND active = 1',
    [req.user.sub]
  );

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  return res.json(sanitizeUser(user));
});

app.patch('/api/me', authRequired, async (req, res) => {
  const name = normalizeText(req.body?.name);
  const phone = normalizeText(req.body?.phone);

  if (!name) {
    return res.status(400).json({ error: 'El nombre es obligatorio.' });
  }

  await db.run('UPDATE users SET name = ?, phone = ? WHERE id = ? AND active = 1', [name, phone, req.user.sub]);

  const user = await db.get(
    'SELECT id, name, email, phone, role, active, created_at FROM users WHERE id = ? AND active = 1',
    [req.user.sub]
  );

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  return res.json(sanitizeUser(user));
});

app.patch('/api/me/password', authRequired, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');

  if (!currentPassword || newPassword.length < 8) {
    return res.status(400).json({
      error: 'Debes indicar tu contrasena actual y una nueva contrasena de al menos 8 caracteres.'
    });
  }

  const user = await db.get('SELECT id, name, email, password_hash, active FROM users WHERE id = ?', [req.user.sub]);
  if (!user || user.active === 0) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'La contrasena actual no coincide.' });
  }

  const samePassword = await bcrypt.compare(newPassword, user.password_hash);
  if (samePassword) {
    return res.status(400).json({ error: 'La nueva contrasena debe ser diferente a la actual.' });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);
  await db.run('DELETE FROM password_resets WHERE user_id = ?', [user.id]);

  const mailDelivery = await sendPasswordChangedEmail({ to: user.email, name: user.name });
  return res.json({
    message: 'Contrasena actualizada correctamente.',
    mailStatus: mailDelivery.status
  });
});

app.get('/api/admin/stats', authRequired, roleRequired('admin'), async (_req, res) => {
  const [users, cars, bookings, inquiries, revenue] = await Promise.all([
    db.get('SELECT COUNT(*) as total FROM users WHERE active = 1'),
    db.get('SELECT COUNT(*) as total FROM cars WHERE active = 1'),
    db.get('SELECT COUNT(*) as total FROM bookings'),
    db.get('SELECT COUNT(*) as total FROM inquiries'),
    db.get("SELECT COALESCE(SUM(total), 0) as total FROM bookings WHERE status <> 'cancelada'")
  ]);

  return res.json({
    users: users.total,
    cars: cars.total,
    bookings: bookings.total,
    inquiries: inquiries.total,
    revenue: Number(revenue.total || 0)
  });
});

app.get('/api/admin/users', authRequired, roleRequired('admin'), async (_req, res) => {
  const rows = await db.all(
    `
      SELECT id, name, email, phone, role, active, created_at
      FROM users
      ORDER BY id DESC
    `
  );

  return res.json(rows.map((row) => sanitizeUser(row)));
});

app.post('/api/admin/users', authRequired, roleRequired('admin'), async (req, res) => {
  const name = normalizeText(req.body?.name);
  const email = normalizeEmail(req.body?.email);
  const phone = normalizeText(req.body?.phone);
  const password = String(req.body?.password || '');
  const role = normalizeText(req.body?.role || 'customer');

  if (!name || !email || password.length < 8) {
    return res.status(400).json({ error: 'Nombre, correo y contrasena valida son requeridos.' });
  }

  if (!USER_ROLES.includes(role)) {
    return res.status(400).json({ error: `Rol invalido. Usa: ${USER_ROLES.join(', ')}` });
  }

  const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ error: 'Ese correo ya esta registrado.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const insert = await db.run(
    'INSERT INTO users (name, email, password_hash, phone, role, active) VALUES (?, ?, ?, ?, ?, 1)',
    [name, email, passwordHash, phone, role]
  );

  const user = await db.get(
    'SELECT id, name, email, phone, role, active, created_at FROM users WHERE id = ?',
    [insert.lastID]
  );

  return res.status(201).json({ user: sanitizeUser(user) });
});

app.get('/api/admin/bookings', authRequired, roleRequired('admin'), async (_req, res) => {
  const rows = await db.all(
    `
      SELECT b.*, u.name as customer_name, u.email as customer_email,
             c.name as car_name, c.brand as car_brand, c.model as car_model
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN cars c ON c.id = b.car_id
      ORDER BY b.id DESC
    `
  );

  return res.json(
    rows.map((row) => ({
      ...formatBooking(row),
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      carName: row.car_name,
      carBrand: row.car_brand,
      carModel: row.car_model
    }))
  );
});

app.get('/api/admin/inquiries', authRequired, roleRequired('admin'), async (_req, res) => {
  const rows = await db.all(
    `
      SELECT id, name, email, subject, message, mail_to, mail_status, mail_error, created_at
      FROM inquiries
      ORDER BY id DESC
    `
  );

  return res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      subject: row.subject,
      message: row.message,
      mailTo: row.mail_to,
      mailStatus: row.mail_status,
      mailError: row.mail_error,
      createdAt: row.created_at
    }))
  );
});

app.get('/api/admin/cars', authRequired, roleRequired('admin'), async (_req, res) => {
  const rows = await db.all('SELECT * FROM cars ORDER BY id DESC');
  return res.json(rows.map((row) => formatCar(row)));
});

app.post('/api/admin/cars', authRequired, roleRequired('admin'), async (req, res) => {
  const payload = {
    name: normalizeText(req.body?.name),
    brand: normalizeText(req.body?.brand),
    model: normalizeText(req.body?.model),
    year: Number(req.body?.year),
    category: normalizeText(req.body?.category).toLowerCase(),
    transmission: normalizeText(req.body?.transmission),
    fuel: normalizeText(req.body?.fuel),
    seats: Number(req.body?.seats),
    luggage: Number(req.body?.luggage),
    location: normalizeText(req.body?.location),
    pricePerDay: toPositiveNumber(req.body?.pricePerDay),
    rating: Number(req.body?.rating || 4.5),
    image: normalizeText(req.body?.image),
    description: normalizeText(req.body?.description),
    features: toFeaturesString(req.body?.features),
    active: req.body?.active === 0 ? 0 : 1
  };

  if (
    !payload.name ||
    !payload.brand ||
    !payload.model ||
    !Number.isInteger(payload.year) ||
    payload.year < 2000 ||
    !payload.category ||
    !payload.transmission ||
    !payload.fuel ||
    !Number.isInteger(payload.seats) ||
    payload.seats <= 0 ||
    !Number.isInteger(payload.luggage) ||
    payload.luggage < 0 ||
    !payload.location ||
    !payload.pricePerDay ||
    !Number.isFinite(payload.rating) ||
    payload.rating < 0 ||
    payload.rating > 5
  ) {
    return res.status(400).json({ error: 'Datos del vehiculo invalidos o incompletos.' });
  }

  const insert = await db.run(
    `
      INSERT INTO cars (
        name, brand, model, year, category, transmission, fuel, seats, luggage,
        location, price_per_day, rating, image, description, features, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.name,
      payload.brand,
      payload.model,
      payload.year,
      payload.category,
      payload.transmission,
      payload.fuel,
      payload.seats,
      payload.luggage,
      payload.location,
      payload.pricePerDay,
      Number.isFinite(payload.rating) ? payload.rating : 4.5,
      payload.image || null,
      payload.description || null,
      payload.features || null,
      payload.active
    ]
  );

  const car = await db.get('SELECT * FROM cars WHERE id = ?', [insert.lastID]);
  return res.status(201).json({ car: formatCar(car) });
});

app.patch('/api/admin/cars/:id', authRequired, roleRequired('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Id de vehiculo invalido.' });
  }

  const currentCar = await db.get('SELECT * FROM cars WHERE id = ?', [id]);
  if (!currentCar) {
    return res.status(404).json({ error: 'Vehiculo no encontrado.' });
  }

  const allowed = {
    name: (value) => normalizeText(value),
    brand: (value) => normalizeText(value),
    model: (value) => normalizeText(value),
    year: (value) => Number(value),
    category: (value) => normalizeText(value).toLowerCase(),
    transmission: (value) => normalizeText(value),
    fuel: (value) => normalizeText(value),
    seats: (value) => Number(value),
    luggage: (value) => Number(value),
    location: (value) => normalizeText(value),
    pricePerDay: (value) => Number(value),
    rating: (value) => Number(value),
    image: (value) => normalizeText(value),
    description: (value) => normalizeText(value),
    features: (value) => toFeaturesString(value),
    active: (value) => (Number(value) === 0 ? 0 : 1)
  };

  const fields = [];
  const params = [];
  const requiredStringFields = new Set(['name', 'brand', 'model', 'category', 'transmission', 'fuel', 'location']);

  for (const [key, parser] of Object.entries(allowed)) {
    if (typeof req.body?.[key] === 'undefined') continue;

    const value = parser(req.body[key]);
    if (requiredStringFields.has(key) && !value) {
      return res.status(400).json({ error: `El campo ${key} es obligatorio.` });
    }
    if (key === 'year' && (!Number.isInteger(value) || value < 2000)) {
      return res.status(400).json({ error: 'Ano invalido.' });
    }
    if (key === 'seats' && (!Number.isInteger(value) || value <= 0)) {
      return res.status(400).json({ error: 'Valor invalido para seats.' });
    }
    if (key === 'luggage' && (!Number.isInteger(value) || value < 0)) {
      return res.status(400).json({ error: `Valor invalido para ${key}.` });
    }
    if (key === 'pricePerDay' && (!Number.isFinite(value) || value <= 0)) {
      return res.status(400).json({ error: 'Valor invalido para pricePerDay.' });
    }
    if (key === 'rating' && (!Number.isFinite(value) || value < 0 || value > 5)) {
      return res.status(400).json({ error: 'Valor invalido para rating.' });
    }

    const column = key === 'pricePerDay' ? 'price_per_day' : key;
    fields.push(`${column} = ?`);
    params.push(value || (value === 0 ? 0 : null));
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar.' });
  }

  params.push(id);
  await db.run(`UPDATE cars SET ${fields.join(', ')} WHERE id = ?`, params);

  const updated = await db.get('SELECT * FROM cars WHERE id = ?', [id]);
  return res.json({ car: formatCar(updated) });
});

app.use((error, _req, res, _next) => {
  console.error('[API_ERROR]', error);
  if (error instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({ error: 'Token invalido.' });
  }
  return res.status(500).json({ error: 'Error interno del servidor.' });
});

async function bootstrap() {
  await initDatabase();
  if (!isMailDeliveryConfigured()) {
    console.warn('[MAIL_MODE] Simulacion activa. Completa SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS para enviar correos reales.');
  }
  app.listen(PORT, () => {
    console.log(`Backend listo en http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('No se pudo iniciar el backend:', error);
  process.exit(1);
});
