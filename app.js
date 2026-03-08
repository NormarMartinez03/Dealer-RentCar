const DB_KEY = 'rentcar_db';
const CURRENT_USER_KEY = 'rentcar_current_user';
const DB_VERSION = 2;

const seedData = {
  users: [
    {
      id: 1,
      name: 'Administrador',
      email: 'admin@rentcar.do',
      password: 'Admin123*',
      phone: '8090000000',
      role: 'admin'
    }
  ],
  cars: [
    {
      id: 1,
      name: 'Toyota Corolla',
      brand: 'Toyota',
      model: 'Corolla LE',
      year: 2023,
      category: 'economico',
      transmission: 'Automática',
      fuel: 'Gasolina',
      seats: 5,
      luggage: 2,
      location: 'Santo Domingo',
      pricePerDay: 45,
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=80',
      features: ['Aire acondicionado', 'Bluetooth', 'GPS', 'Seguro básico'],
      description: 'Excelente para ciudad y viajes cortos. Muy cómodo, de bajo consumo y fácil conducción.'
    },
    {
      id: 2,
      name: 'Hyundai Tucson',
      brand: 'Hyundai',
      model: 'Tucson Limited',
      year: 2024,
      category: 'suv',
      transmission: 'Automática',
      fuel: 'Gasolina',
      seats: 5,
      luggage: 4,
      location: 'Santiago',
      pricePerDay: 75,
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=80',
      features: ['Cámara de reversa', 'Apple CarPlay', 'Asistente carril', 'Seguro premium'],
      description: 'SUV potente, ideal para familias y viajes en carretera con alto confort.'
    },
    {
      id: 3,
      name: 'BMW X5',
      brand: 'BMW',
      model: 'X5 xDrive40i',
      year: 2024,
      category: 'lujo',
      transmission: 'Automática',
      fuel: 'Híbrido',
      seats: 5,
      luggage: 5,
      location: 'Punta Cana',
      pricePerDay: 140,
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80',
      features: ['Asientos en cuero', 'Sunroof', 'Sonido premium', 'Seguro todo riesgo'],
      description: 'Vehículo de lujo para una experiencia premium con máxima seguridad y potencia.'
    },
    {
      id: 4,
      name: 'Kia Rio',
      brand: 'Kia',
      model: 'Rio LX',
      year: 2022,
      category: 'economico',
      transmission: 'Mecánica',
      fuel: 'Gasolina',
      seats: 5,
      luggage: 2,
      location: 'La Romana',
      pricePerDay: 39,
      rating: 4.5,
      image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=80',
      features: ['Aire acondicionado', 'USB', 'Seguro básico', 'Frenos ABS'],
      description: 'Compacto y eficiente para moverte por la ciudad con ahorro y comodidad.'
    }
  ],
  bookings: [],
  inquiries: []
};


function syncCarsWithSeed(db) {
  const byId = new Map((db.cars || []).map((car) => [car.id, car]));

  db.cars = seedData.cars.map((seedCar) => {
    const current = byId.get(seedCar.id) || {};
    return {
      ...current,
      ...seedCar,
      // Permite que cambios de enlaces de imagen y nombres en el código se reflejen
      image: seedCar.image,
      name: seedCar.name,
      brand: seedCar.brand,
      model: seedCar.model
    };
  });

  return db;
}

function normalizeDB(db) {
  const locationMap = {
    'Bogotá': 'Santo Domingo',
    'Medellín': 'Santiago',
    'Cartagena': 'Punta Cana',
    'Cali': 'La Romana',
    bogota: 'Santo Domingo',
    medellin: 'Santiago',
    cartagena: 'Punta Cana',
    cali: 'La Romana'
  };

  const modelMap = {
    Corolla: 'Corolla LE',
    Tucson: 'Tucson Limited',
    X5: 'X5 xDrive40i',
    Rio: 'Rio LX'
  };

  const categoryMap = {
    economico: 'economico',
    económico: 'economico',
    suv: 'suv',
    lujo: 'lujo'
  };

  db.cars = (db.cars || []).map((car) => {
    const fallbackFromName = (car.name || '').trim().split(' ');
    const fallbackBrand = car.brand || fallbackFromName[0] || '';
    const fallbackModel = car.model || fallbackFromName.slice(1).join(' ');

    return {
      ...car,
      brand: fallbackBrand,
      model: modelMap[fallbackModel] || fallbackModel,
      category: categoryMap[(car.category || '').toString().trim().toLowerCase()] || 'economico',
      location: locationMap[(car.location || '').toString().trim()] || locationMap[(car.location || '').toString().trim().toLowerCase()] || car.location
    };
  });

  db.users = (db.users || []).map((user) => ({
    ...user,
    email: user.email === 'admin@rentcar.com' ? 'admin@rentcar.do' : user.email
  }));

  return db;
}

function getDB() {
  const db = localStorage.getItem(DB_KEY);
  if (!db) {
    const fresh = { ...structuredClone(seedData), version: DB_VERSION };
    localStorage.setItem(DB_KEY, JSON.stringify(fresh));
    return fresh;
  }

  const parsed = JSON.parse(db);
  if (!parsed.version || parsed.version < DB_VERSION) {
    parsed.version = DB_VERSION;
    syncCarsWithSeed(parsed);
  }

  const normalized = normalizeDB(parsed);
  localStorage.setItem(DB_KEY, JSON.stringify(normalized));
  return normalized;
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

function requireAuth(redirect = 'index.html') {
  if (!getCurrentUser()) {
    alert('Debes iniciar sesión para continuar.');
    window.location.href = redirect;
    return false;
  }
  return true;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 0
  }).format(value);
}

function normalizeText(value) {
  return (value || '')
    .toString()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}


function getVehicleDisplayName(car) {
  const brand = (car.brand || '').trim();
  const model = (car.model || '').trim();
  const fallbackName = (car.name || 'Vehículo').trim();

  if (brand && model) return `${brand} ${model}`;
  if (model) return model;
  if (brand) return brand;
  return fallbackName;
}

function updateNavUser() {
  const user = getCurrentUser();
  const userName = document.getElementById('navUserName');
  const authLinks = document.getElementById('navAuthLinks');

  if (user && userName) userName.textContent = `Hola, ${user.name}`;
  if (!authLinks) return;

  if (user) {
    authLinks.innerHTML = '<button class="btn-ghost" id="logoutBtn">Salir</button>';
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
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

    if (db.users.some((u) => u.email === email)) {
      alert('Este correo ya está registrado.');
      return;
    }

    const newUser = {
      id: Date.now(),
      name,
      email,
      phone,
      password,
      role: 'customer'
    };

    db.users.push(newUser);
    saveDB(db);
    setCurrentUser({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role });
    window.location.href = 'dashboard.html';
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
    window.location.href = 'dashboard.html';
  });
}

function handleForgotPassword() {
  const form = document.getElementById('forgotForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('recoveryEmail').value.trim().toLowerCase();
    const db = getDB();

    if (!db.users.some((u) => u.email === email)) {
      alert('No encontramos una cuenta con este correo.');
      return;
    }

    document.getElementById('recoveryBox').classList.add('hidden');
    document.getElementById('successBox').classList.remove('hidden');
  });
}

function renderCatalog() {
  const grid = document.getElementById('vehicleGrid');
  if (!grid) return;

  const db = getDB();
  const category = normalizeText(document.getElementById('filterCategory')?.value || 'todos');
  const location = normalizeText(document.getElementById('filterLocation')?.value || 'todos');
  const maxPrice = Number(document.getElementById('filterPrice')?.value || 9999);

  const cars = db.cars.filter((car) => {
    const byCategory = category === 'todos' || normalizeText(car.category) === category;
    const byLocation = location === 'todos' || normalizeText(car.location) === location;
    const byPrice = car.pricePerDay <= maxPrice;
    return byCategory && byLocation && byPrice;
  });

  if (!cars.length) {
    grid.innerHTML = '<p class="empty-state">No hay vehículos con esos filtros.</p>';
    return;
  }

  grid.innerHTML = cars
    .map(
      (car) => `
      <article class="car-card">
        <img src="${car.image}" alt="${getVehicleDisplayName(car)}">
        <div class="car-info">
          <div class="car-top-line">
            <span class="badge">${car.category}</span>
            <span>⭐ ${car.rating}</span>
          </div>
          <h3>${getVehicleDisplayName(car)} (${car.year})</h3>
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
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', renderCatalog);
    el.addEventListener('input', renderCatalog);
  });
}

function renderFeaturedStats() {
  const stats = document.getElementById('statsBox');
  if (!stats) return;

  const db = getDB();
  stats.innerHTML = `
    <div><strong>${db.cars.length}</strong><span>Vehículos</span></div>
    <div><strong>${db.bookings.length}</strong><span>Reservas</span></div>
    <div><strong>${db.users.length}</strong><span>Usuarios</span></div>
  `;
}

function renderCarDetails() {
  const details = document.getElementById('carDetailSection');
  if (!details) return;

  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));
  const car = getDB().cars.find((item) => item.id === id);

  if (!car) {
    details.innerHTML = '<p class="empty-state">Vehículo no encontrado.</p>';
    return;
  }

  details.innerHTML = `
    <img src="${car.image}" alt="${car.name}" class="detail-img">
    <div class="detail-text glass-box left">
      <h1>${getVehicleDisplayName(car)} ${car.year}</h1>
      <p class="price">${formatCurrency(car.pricePerDay)} / día</p>
      <p class="muted">${car.description}</p>
      <ul class="feature-list">
        ${car.features.map((feature) => `<li>✅ ${feature}</li>`).join('')}
        <li>✅ ${car.fuel}</li>
        <li>✅ ${car.seats} pasajeros / ${car.luggage} maletas</li>
      </ul>
      <a href="checkout.html?id=${car.id}" class="btn-primary">Reservar este vehículo</a>
    </div>
  `;
}

function handleCheckout() {
  const wrap = document.getElementById('checkoutWrapper');
  const form = document.getElementById('checkoutForm');
  if (!wrap || !form) return;

  if (!requireAuth()) return;

  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));
  const car = getDB().cars.find((item) => item.id === id);

  if (!car) {
    wrap.innerHTML = '<p class="empty-state">Vehículo no encontrado para reservar.</p>';
    return;
  }

  document.getElementById('checkoutCar').textContent = `${getVehicleDisplayName(car)} ${car.year}`;
  document.getElementById('checkoutPrice').textContent = formatCurrency(car.pricePerDay);

  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');
  const totalText = document.getElementById('totalPrice');

  const calcTotal = () => {
    if (!startDate.value || !endDate.value) return car.pricePerDay;
    const start = new Date(startDate.value);
    const end = new Date(endDate.value);
    const diffDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    return diffDays * car.pricePerDay;
  };

  const updateTotal = () => {
    totalText.textContent = formatCurrency(calcTotal());
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
    const total = calcTotal();

    db.bookings.push({
      id: Date.now(),
      userId: user.id,
      carId: car.id,
      startDate: startDate.value,
      endDate: endDate.value,
      total,
      status: 'confirmada'
    });

    saveDB(db);
    document.getElementById('paymentBox').classList.add('hidden');
    document.getElementById('successPaymentBox').classList.remove('hidden');
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
    document.getElementById('contactSuccess').classList.remove('hidden');
  });
}

function initPage() {
  getDB();
  const page = document.body.dataset.page;
  updateNavUser();

  if (page === 'login' && getCurrentUser()) window.location.href = 'dashboard.html';
  if (page === 'dashboard') requireAuth();

  handleLogin();
  handleRegister();
  handleForgotPassword();
  renderCatalog();
  setupFilters();
  renderFeaturedStats();
  renderCarDetails();
  handleCheckout();
  handleContact();
}

document.addEventListener('DOMContentLoaded', initPage);
