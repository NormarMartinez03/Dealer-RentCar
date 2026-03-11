const CURRENT_USER_KEY = 'rentcar_current_user';
const AUTH_TOKEN_KEY = 'rentcar_token';
const API_BASE_URL = 'http://localhost:3000/api';

function getCurrentUser() {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  return data ? JSON.parse(data) : null;
}

function setSession(user, token) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  window.location.href = 'index.html';
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

function requireAuth(role) {
  const user = getCurrentUser();
  if (!user) {
    alert('Debes iniciar sesión.');
    window.location.href = 'index.html';
    return false;
  }
  if (role && user.role !== role) {
    alert('No tienes permisos para esta vista.');
    const redirectMap = { admin: 'admin.html', customer: 'customer.html', agent: 'agent.html' };
    window.location.href = redirectMap[user.role] || 'catalog.html';
    return false;
  }
  return true;
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

function resolveRoleHome(role) {
  if (role === 'admin') return 'admin.html';
  if (role === 'agent') return 'agent.html';
  return 'customer.html';
}

function handleLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        email: document.getElementById('email').value.trim().toLowerCase(),
        password: document.getElementById('pass').value
      };
      const { user, token } = await api('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
      setSession(user, token);
      window.location.href = resolveRoleHome(user.role);
    } catch (error) {
      alert(error.message);
    }
  });
}

function handleRegister() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: document.getElementById('registerName').value.trim(),
        email: document.getElementById('registerEmail').value.trim().toLowerCase(),
        phone: document.getElementById('registerPhone').value.trim(),
        password: document.getElementById('registerPassword').value,
        role: document.getElementById('registerRole')?.value || 'customer'
      };
      const { user, token } = await api('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
      setSession(user, token);
      window.location.href = resolveRoleHome(user.role);
    } catch (error) {
      alert(error.message);
    }
  });
}

async function renderCatalog() {
  const grid = document.getElementById('vehicleGrid');
  if (!grid) return;

  const params = new URLSearchParams({
    category: document.getElementById('filterCategory')?.value || 'todos',
    location: document.getElementById('filterLocation')?.value || 'todos',
    maxPrice: document.getElementById('filterPrice')?.value || '9999'
  });

  try {
    const cars = await api(`/cars?${params.toString()}`);
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
  } catch (error) {
    grid.innerHTML = `<p class="empty-state">${error.message}. Asegura que el backend esté ejecutándose.</p>`;
  }
}

function setupFilters() {
  ['filterCategory', 'filterLocation', 'filterPrice'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', renderCatalog);
  });
}

async function renderCarDetails() {
  const details = document.getElementById('carDetailSection');
  if (!details) return;
  const id = Number(new URLSearchParams(window.location.search).get('id'));

  try {
    const car = await api(`/cars/${id}`);
    details.innerHTML = `<img src="${car.image}" alt="${car.name}" class="detail-img">
      <div class="detail-text glass-box left">
        <h1>${car.name} ${car.year}</h1>
        <p class="price">${formatCurrency(car.pricePerDay)} / día</p>
        <p class="muted">${car.description}</p>
        <ul class="feature-list">${car.features.map((f) => `<li>✅ ${f}</li>`).join('')}</ul>
        <a href="checkout.html?id=${car.id}" class="btn-primary">Reservar este vehículo</a>
      </div>`;
  } catch (error) {
    details.innerHTML = `<p class="empty-state">${error.message}</p>`;
  }
}

function bookingBreakdown(pricePerDay, startDate, endDate) {
  const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
  if (!Number.isFinite(days) || days <= 0) throw new Error('Fechas inválidas. La fecha final debe ser mayor.');
  const subtotal = days * pricePerDay;
  const serviceFee = days * 5;
  const taxes = Number(((subtotal + serviceFee) * 0.18).toFixed(2));
  return { days, subtotal, serviceFee, taxes, total: Number((subtotal + serviceFee + taxes).toFixed(2)) };
}

async function handleCheckout() {
  const wrap = document.getElementById('checkoutWrapper');
  const form = document.getElementById('checkoutForm');
  if (!wrap || !form) return;
  if (!requireAuth()) return;

  const id = Number(new URLSearchParams(window.location.search).get('id'));
  const summary = document.getElementById('checkoutSummary');

  try {
    const car = await api(`/cars/${id}`);
    document.getElementById('checkoutCar').textContent = `${car.name} ${car.year}`;
    document.getElementById('checkoutPrice').textContent = formatCurrency(car.pricePerDay);

    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    const update = () => {
      if (!startDate.value || !endDate.value) {
        summary.textContent = 'Selecciona fechas para calcular el total.';
        return;
      }
      try {
        const b = bookingBreakdown(car.pricePerDay, startDate.value, endDate.value);
        document.getElementById('totalPrice').textContent = formatCurrency(b.total);
        summary.textContent = `${b.days} día(s): Subtotal ${formatCurrency(b.subtotal)} + cargo servicio ${formatCurrency(b.serviceFee)} + ITBIS ${formatCurrency(b.taxes)}`;
      } catch (err) {
        summary.textContent = err.message;
      }
    };

    startDate.addEventListener('change', update);
    endDate.addEventListener('change', update);
    update();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/bookings', {
          method: 'POST',
          body: JSON.stringify({ carId: car.id, startDate: startDate.value, endDate: endDate.value })
        });
        document.getElementById('paymentBox').classList.add('hidden');
        document.getElementById('successPaymentBox').classList.remove('hidden');
      } catch (error) {
        alert(error.message);
      }
    });
  } catch (error) {
    wrap.innerHTML = `<p class="empty-state">${error.message}</p>`;
  }
}

function handleContact() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/inquiries', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('contactName').value.trim(),
          email: document.getElementById('contactEmail').value.trim(),
          message: document.getElementById('contactMessage').value.trim()
        })
      });
      form.reset();
      document.getElementById('contactSuccess').classList.remove('hidden');
    } catch (error) {
      alert(error.message);
    }
  });
}

async function renderAdminPanel() {
  if (!document.getElementById('adminStats')) return;
  if (!requireAuth('admin')) return;

  try {
    const [stats, users, bookings, inquiries] = await Promise.all([
      api('/admin/stats'),
      api('/admin/users'),
      api('/admin/bookings'),
      api('/admin/inquiries')
    ]);

    document.getElementById('adminStats').innerHTML = `<div><strong>${stats.users}</strong><span>Usuarios</span></div>
      <div><strong>${stats.cars}</strong><span>Vehículos</span></div>
      <div><strong>${stats.bookings}</strong><span>Reservas</span></div>
      <div><strong>${stats.inquiries}</strong><span>Consultas</span></div>`;

    document.getElementById('usersTable').innerHTML = users.map((u) => `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td></tr>`).join('');
    document.getElementById('bookingsTable').innerHTML = bookings.map((b) => `<tr><td>#${b.id}</td><td>${b.customer}</td><td>${b.car}</td><td>${b.days}</td><td>${formatCurrency(b.total)}</td></tr>`).join('');
    document.getElementById('inquiriesTable').innerHTML = inquiries.map((i) => `<tr><td>${i.name}</td><td>${i.email}</td><td>${i.message}</td></tr>`).join('');
  } catch (error) {
    document.getElementById('adminStats').innerHTML = `<p class="empty-state">${error.message}</p>`;
  }
}

function initPage() {
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
