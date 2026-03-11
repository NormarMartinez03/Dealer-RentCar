const DB_KEY = 'rentcar_db';
const CURRENT_USER_KEY = 'rentcar_current_user';

const seedData = {
  users: [
    {
      id: 1,
      name: 'Administrador',
      email: 'admin@rentcar.com',
      password: 'Admin123*',
      phone: '3000000000',
      role: 'admin'
    }
  ],
  cars: [
    {
      id: 1,
      name: 'Toyota Corolla',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2026,
      category: 'economico',
      transmission: 'Automática',
      fuel: 'Gasolina',
      seats: 5,
      luggage: 2,
      location: 'Santo Domingo',
      pricePerDay: 45,
      rating: 4.7,
      image: 'https://media.ed.edmunds-media.com/toyota/corolla/2026/oem/2026_toyota_corolla_sedan_xse_fq_oem_1_600.jpg',
      features: ['Aire acondicionado', 'Bluetooth', 'GPS', 'Seguro básico'],
      description: 'Excelente para ciudad y viajes cortos. Muy cómodo, de bajo consumo y fácil conducción.'
    },
    {
      id: 2,
      name: 'Ferrari La Ferrari',
      brand: 'Ferrari',
      model: 'La Ferrari',
      year: 2024,
      category: 'deportivo',
      transmission: 'Automática',
      fuel: 'Gasolina',
      seats: 2,
      luggage: 1,
      location: 'Santiago',
      pricePerDay: 250,
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=80',
      features: ['Cámara de reversa', 'Apple CarPlay', 'Asistente carril', 'Seguro premium'],
      description: 'Superdeportivo de lujo para una experiencia única.'
    },
    {
      id: 3,
      name: 'BMW X5',
      brand: 'BMW',
      model: 'X5',
      year: 2024,
      category: 'lujo',
      transmission: 'Automática',
      fuel: 'Híbrido',
      seats: 5,
      luggage: 5,
      location: 'Bani',
      pricePerDay: 140,
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80',
      features: ['Asientos en cuero', 'Sunroof', 'Sonido premium', 'Seguro todo riesgo'],
      description: 'Vehículo premium para familias y viajes largos.'
    }
  ],
  bookings: [],
  inquiries: []
};


function safeJSONParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeLegacyBooking(booking, db) {
  if (booking.days && booking.subtotal !== undefined && booking.total !== undefined) return booking;
  const car = db.cars.find((item) => item.id === booking.carId);
  if (!car || !booking.startDate || !booking.endDate) return booking;

  try {
    const breakdown = bookingBreakdown(car.pricePerDay, booking.startDate, booking.endDate);
    return {
      ...booking,
      days: breakdown.days,
      subtotal: breakdown.subtotal,
      serviceFee: breakdown.serviceFee,
      taxes: breakdown.taxes,
      total: breakdown.total
    };
  } catch {
    return booking;
  }
}

function getDB() {
  const db = localStorage.getItem(DB_KEY);
  if (!db) {
    localStorage.setItem(DB_KEY, JSON.stringify(seedData));
    return structuredClone(seedData);
  }
  const parsed = safeJSONParse(db, structuredClone(seedData));
  parsed.bookings = (parsed.bookings || []).map((item) => normalizeLegacyBooking(item, parsed));
  return parsed;
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getCurrentUser() {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return user ? JSON.parse(user) : null;
}

function setCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  window.location.href = 'index.html';
}

function resolveRoleHome(role) {
  if (role === 'admin') return 'admin.html';
  if (role === 'agent') return 'agent.html';
  return 'customer.html';
}

function requireAuth(role) {
  const user = getCurrentUser();
  if (!user) {
    alert('Debes iniciar sesión para continuar.');
    window.location.href = 'index.html';
    return false;
  }

  if (role && user.role !== role) {
    alert('No tienes permisos para esta vista.');
    window.location.href = resolveRoleHome(user.role);
    return false;
  }

  return true;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
}

function updateNavUser() {
  const user = getCurrentUser();
  const userName = document.getElementById('navUserName');
  const authLinks = document.getElementById('navAuthLinks');

  if (userName && user) userName.textContent = `Hola, ${user.name} (${user.role})`;
  if (!authLinks) return;

  if (user) {
    authLinks.innerHTML = '<button class="btn-ghost" id="logoutBtn">Salir</button>';
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
  } else {
    authLinks.innerHTML = '<a href="index.html" class="btn-ghost">Ingresar</a>';
  }
}

function handleRegister() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const db = getDB();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim().toLowerCase();
    const phone = document.getElementById('registerPhone').value.trim();
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole')?.value || 'customer';

    if (password.length < 8) {
      alert('La contraseña debe tener mínimo 8 caracteres.');
      return;
    }

    if (db.users.some((u) => u.email === email)) {
      alert('Este correo ya está registrado.');
      return;
    }

    const allowedRole = ['customer', 'agent'].includes(role) ? role : 'customer';

    const newUser = {
      id: Date.now(),
      name,
      email,
      phone,
      password,
      role: allowedRole
    };

    db.users.push(newUser);
    saveDB(db);

    setCurrentUser({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role });
    window.location.href = resolveRoleHome(newUser.role);
  });
}

function handleLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const pass = document.getElementById('pass').value;

    const db = getDB();
    const user = db.users.find((u) => u.email === email && u.password === pass);

    if (!user) {
      alert('Credenciales inválidas.');
      return;
    }

    setCurrentUser({ id: user.id, name: user.name, email: user.email, role: user.role });
    window.location.href = resolveRoleHome(user.role);
  });
}

function renderCatalog() {
  const grid = document.getElementById('vehicleGrid');
  if (!grid) return;

  const db = getDB();
  const category = document.getElementById('filterCategory')?.value || 'todos';
  const location = document.getElementById('filterLocation')?.value || 'todos';
  const maxPrice = Number(document.getElementById('filterPrice')?.value || 9999);

  const cars = db.cars.filter((car) => {
    const byCategory = category === 'todos' || car.category === category;
    const byLocation = location === 'todos' || car.location === location;
    const byPrice = car.pricePerDay <= maxPrice;
    return byCategory && byLocation && byPrice;
  });

  if (!cars.length) {
    grid.innerHTML = '<p class="empty-state">No hay vehículos con esos filtros.</p>';
    return;
  }

  grid.innerHTML = cars
    .map(
      (car) => `<article class="car-card">
        <img src="${car.image}" alt="${car.name}">
        <div class="car-info">
          <div class="car-top-line"><span class="badge">${car.category}</span><span>⭐ ${car.rating}</span></div>
          <h3>${car.name} (${car.year})</h3>
          <p class="muted">${car.location} • ${car.transmission} • ${car.seats} pasajeros</p>
          <p class="price">${formatCurrency(car.pricePerDay)}<span>/día</span></p>
          <a class="btn-primary" href="car-details.html?id=${car.id}">Ver detalles</a>
        </div>
      </article>`
    )
    .join('');
}

function setupFilters() {
  ['filterCategory', 'filterLocation', 'filterPrice'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', renderCatalog);
  });
}

function renderCarDetails() {
  const details = document.getElementById('carDetailSection');
  if (!details) return;

  const id = Number(new URLSearchParams(window.location.search).get('id'));
  const car = getDB().cars.find((item) => item.id === id);

  if (!car) {
    details.innerHTML = '<p class="empty-state">Vehículo no encontrado.</p>';
    return;
  }

  details.innerHTML = `<img src="${car.image}" alt="${car.name}" class="detail-img">
    <div class="detail-text glass-box left">
      <h1>${car.name} ${car.year}</h1>
      <p class="price">${formatCurrency(car.pricePerDay)} / día</p>
      <p class="muted">${car.description}</p>
      <ul class="feature-list">${car.features.map((f) => `<li>✅ ${f}</li>`).join('')}</ul>
      <a href="checkout.html?id=${car.id}" class="btn-primary">Reservar este vehículo</a>
    </div>`;
}

function bookingBreakdown(pricePerDay, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  if (!Number.isFinite(days) || days <= 0) {
    throw new Error('Fechas inválidas. La fecha final debe ser mayor.');
  }

  const subtotal = days * pricePerDay;
  const serviceFee = days * 5;
  const taxes = Number(((subtotal + serviceFee) * 0.18).toFixed(2));
  const total = Number((subtotal + serviceFee + taxes).toFixed(2));

  return { days, subtotal, serviceFee, taxes, total };
}

function handleCheckout() {
  const wrap = document.getElementById('checkoutWrapper');
  const form = document.getElementById('checkoutForm');
  if (!wrap || !form) return;

  if (!requireAuth()) return;

  const id = Number(new URLSearchParams(window.location.search).get('id'));
  const car = getDB().cars.find((item) => item.id === id);

  if (!car) {
    wrap.innerHTML = '<p class="empty-state">Vehículo no encontrado para reservar.</p>';
    return;
  }

  document.getElementById('checkoutCar').textContent = `${car.name} ${car.year}`;
  document.getElementById('checkoutPrice').textContent = formatCurrency(car.pricePerDay);

  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');
  const totalText = document.getElementById('totalPrice');
  const summary = document.getElementById('checkoutSummary');

  const updateTotal = () => {
    if (!startDate.value || !endDate.value) {
      totalText.textContent = formatCurrency(0);
      summary.textContent = 'Selecciona fechas para calcular el total.';
      return;
    }

    try {
      const breakdown = bookingBreakdown(car.pricePerDay, startDate.value, endDate.value);
      totalText.textContent = formatCurrency(breakdown.total);
      summary.textContent = `${breakdown.days} día(s): Subtotal ${formatCurrency(breakdown.subtotal)} + cargo servicio ${formatCurrency(breakdown.serviceFee)} + ITBIS ${formatCurrency(breakdown.taxes)}`;
    } catch (error) {
      totalText.textContent = formatCurrency(0);
      summary.textContent = error.message;
    }
  };

  startDate.addEventListener('change', updateTotal);
  endDate.addEventListener('change', updateTotal);
  updateTotal();

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!startDate.value || !endDate.value) {
      alert('Selecciona fechas válidas.');
      return;
    }

    const user = getCurrentUser();
    const db = getDB();

    try {
      const breakdown = bookingBreakdown(car.pricePerDay, startDate.value, endDate.value);

      db.bookings.push({
        id: Date.now(),
        userId: user.id,
        carId: car.id,
        startDate: startDate.value,
        endDate: endDate.value,
        days: breakdown.days,
        subtotal: breakdown.subtotal,
        serviceFee: breakdown.serviceFee,
        taxes: breakdown.taxes,
        total: breakdown.total,
        status: 'confirmada',
        createdAt: new Date().toISOString()
      });

      saveDB(db);
      document.getElementById('paymentBox').classList.add('hidden');
      document.getElementById('successPaymentBox').classList.remove('hidden');
    } catch (error) {
      alert(error.message);
    }
  });
}

function handleContact() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const db = getDB();
    db.inquiries.push({
      id: Date.now(),
      name: document.getElementById('contactName').value.trim(),
      email: document.getElementById('contactEmail').value.trim(),
      message: document.getElementById('contactMessage').value.trim(),
      createdAt: new Date().toISOString()
    });

    saveDB(db);
    form.reset();
    document.getElementById('contactSuccess')?.classList.remove('hidden');
  });
}

function renderAdminPanel() {
  if (!document.getElementById('adminStats')) return;
  if (!requireAuth('admin')) return;

  const db = getDB();

  document.getElementById('adminStats').innerHTML = `<div><strong>${db.users.length}</strong><span>Usuarios</span></div>
    <div><strong>${db.cars.length}</strong><span>Vehículos</span></div>
    <div><strong>${db.bookings.length}</strong><span>Reservas</span></div>
    <div><strong>${db.inquiries.length}</strong><span>Consultas</span></div>`;

  document.getElementById('usersTable').innerHTML = db.users
    .map((u) => `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td></tr>`)
    .join('');

  document.getElementById('bookingsTable').innerHTML = db.bookings
    .map((b) => {
      const customer = db.users.find((u) => u.id === b.userId)?.name || 'N/A';
      const car = db.cars.find((c) => c.id === b.carId)?.name || 'N/A';
      return `<tr><td>#${b.id}</td><td>${customer}</td><td>${car}</td><td>${b.days ?? '-'}</td><td>${formatCurrency(b.total || 0)}</td></tr>`;
    })
    .join('');

  document.getElementById('inquiriesTable').innerHTML = db.inquiries
    .map((i) => `<tr><td>${i.name}</td><td>${i.email}</td><td>${i.message}</td></tr>`)
    .join('');
}

function initPage() {
  getDB();
  const page = document.body.dataset.page;
  updateNavUser();

  if (page === 'login' && getCurrentUser()) window.location.href = resolveRoleHome(getCurrentUser().role);
  if (page === 'admin') requireAuth('admin');
  if (page === 'customer') requireAuth('customer');
  if (page === 'agent') requireAuth('agent');

  handleLogin();
  handleRegister();
  renderCatalog();
  setupFilters();
  renderCarDetails();
  handleCheckout();
  handleContact();
  renderAdminPanel();
}

document.addEventListener('DOMContentLoaded', initPage);
