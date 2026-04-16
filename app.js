const DB_KEY = 'rentcar_db';
const CURRENT_USER_KEY = 'rentcar_current_user';
const SIDEBAR_COLLAPSED_KEY = 'rentcar_sidebar_collapsed';
const THEME_KEY = 'rentcar_theme';
const ITBIS_RATE = 0.18;
const API_BASE_URL = localStorage.getItem('rentcar_api_url') || 'http://localhost:3000';

const seedData = {
  users: [
    {
      id: 1,
      name: 'Administrador',
      email: 'admin@rentcar.com',
      password: 'Admin123*',
      phone: '3000000000',
      role: 'admin'
    },
    {
      id: 2,
      name: 'Agente de Renta',
      email: 'empleado@rentcar.com',
      password: 'Empleado123*',
      phone: '3001111111',
      role: 'agent'
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
      description: 'Vehículo de lujo para una experiencia premium con máxima seguridad y potencia.'
    },
    {
      id: 4,
      name: 'Mercedes-Benz C-Class',
      brand: 'Mercedes-Benz',
      model: 'C-Class',
      year: 2022,
      category: 'economico',
      transmission: 'Automática',
      fuel: 'Gasolina',
      seats: 5,
      luggage: 2,
      location: 'Punta Cana',
      pricePerDay: 39,
      rating: 4.5,
      image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=80',
      features: ['Aire acondicionado', 'USB', 'Seguro básico', 'Frenos ABS'],
      description: 'Compacto y eficiente para moverte por la ciudad con ahorro y comodidad.'
    },
    {
      id: 5,
      name: 'Jeep Wrangler',
      brand: 'Jeep',
      model: 'Wrangler',
      year: 2023,
      category: 'suv',
      transmission: 'Manual',
      fuel: 'Gasolina',
      seats: 4,
      luggage: 3,
      location: 'Santo Domingo',
      pricePerDay: 60,
      rating: 4.6,
      image: 'https://www.jeep.com/content/dam/cross-regional/global/jeep/2023/wrangler/exterior/desktop/MY23-Wrangler-Exterior-Slider-Rubicon-Desktop.jpg',
      features: ['Tracción 4x4', 'Bluetooth', 'GPS', 'Seguro básico'],
      description: 'Ideal para aventuras off-road y escapadas de fin de semana con estilo robusto.'
    },
  ],
  bookings: [],
  inquiries: [],
  outbox: []
};

function getDB() {
  const db = localStorage.getItem(DB_KEY);
  if (!db) {
    localStorage.setItem(DB_KEY, JSON.stringify(seedData));
    return structuredClone(seedData);
  }
  const parsedDB = JSON.parse(db);
  if (!Array.isArray(parsedDB.users) || !Array.isArray(parsedDB.cars) || !Array.isArray(parsedDB.bookings)) {
    localStorage.setItem(DB_KEY, JSON.stringify(seedData));
    return structuredClone(seedData);
  }
  if (!Array.isArray(parsedDB.inquiries)) {
    parsedDB.inquiries = [];
  }
  if (!Array.isArray(parsedDB.outbox)) {
    parsedDB.outbox = [];
  }
  saveDB(parsedDB);
  return parsedDB;
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

function getPreferredTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
}

function initThemeToggle() {
  const theme = getPreferredTheme();
  applyTheme(theme);

  let themeToggleBtn = document.getElementById('themeToggleBtn');
  if (!themeToggleBtn) {
    themeToggleBtn = document.createElement('button');
    themeToggleBtn.id = 'themeToggleBtn';
    themeToggleBtn.className = 'theme-toggle-btn';
    themeToggleBtn.type = 'button';
    document.body.appendChild(themeToggleBtn);
  }

  const syncThemeButton = (currentTheme) => {
    themeToggleBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    themeToggleBtn.setAttribute('aria-label', currentTheme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro');
    themeToggleBtn.setAttribute('title', currentTheme === 'dark' ? 'Modo claro' : 'Modo oscuro');
  };

  syncThemeButton(theme);

  themeToggleBtn.addEventListener('click', () => {
    const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    syncThemeButton(nextTheme);
  });
}

function requireAuth(redirect = 'index.html') {
  if (!getCurrentUser()) {
    alert('Debes iniciar sesión para continuar.');
    window.location.href = redirect;
    return false;
  }
  return true;
}

function requireRole(allowedRoles, redirect = 'dashboard.html') {
  const user = getCurrentUser();
  if (!user) return false;
  if (!allowedRoles.includes(user.role)) {
    alert('No tienes permisos para entrar a esta sección.');
    window.location.href = redirect;
    return false;
  }
  return true;
}

function getHomeByRole(role) {
  if (role === 'admin') return 'admin.html';
  if (role === 'agent') return 'agent.html';
  return 'dashboard.html';
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(value);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-DO');
}

function generateNCF() {
  const random = String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0');
  return `B01${random}`;
}

function getBookingDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

function calculateInvoice(carPricePerDay, startDate, endDate) {
  const days = getBookingDays(startDate, endDate);
  const subtotal = Number((days * carPricePerDay).toFixed(2));
  const itbis = Number((subtotal * ITBIS_RATE).toFixed(2));
  const total = Number((subtotal + itbis).toFixed(2));
  return { days, subtotal, itbis, total };
}

function datesOverlap(startA, endA, startB, endB) {
  const aStart = new Date(startA);
  const aEnd = new Date(endA);
  const bStart = new Date(startB);
  const bEnd = new Date(endB);
  return aStart < bEnd && bStart < aEnd;
}

function isCarAvailable(db, carId, startDate, endDate) {
  if (!startDate || !endDate) return true;
  return !db.bookings.some(
    (booking) => booking.carId === carId && datesOverlap(startDate, endDate, booking.startDate, booking.endDate)
  );
}

function queueBookingEmail(db, payload) {
  db.outbox.push({
    id: Date.now(),
    to: payload.to,
    subject: `Factura de reserva ${payload.ncf}`,
    message: [
      `Hola ${payload.customerName},`,
      `Tu reserva para ${payload.carName} fue confirmada.`,
      `Periodo: ${formatDate(payload.startDate)} - ${formatDate(payload.endDate)}.`,
      `Días: ${payload.days}.`,
      `Subtotal: ${formatCurrency(payload.subtotal)}.`,
      `ITBIS (18%): ${formatCurrency(payload.itbis)}.`,
      `Total: ${formatCurrency(payload.total)}.`,
      `NCF: ${payload.ncf}.`
    ].join('\n'),
    createdAt: new Date().toISOString()
  });
}

async function postToApi(endpoint, payload) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || 'No fue posible completar la solicitud.');
  }

  return data;
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

function getRoleLevel(role) {
  if (role === 'admin') return 3;
  if (role === 'agent') return 2;
  return 1;
}

function renderSidebar() {
  const sidebar = document.getElementById('appSidebar');
  if (!sidebar) return;

  const user = getCurrentUser();

  const items = [
    { href: 'dashboard.html', label: 'Dashboard', icon: '🏠', hint: 'Resumen general', group: 'Principal', minRole: 'customer', guest: false },
    { href: 'catalog.html', label: 'Catálogo', icon: '🚗', hint: 'Explorar vehículos', group: 'Principal', minRole: 'customer', guest: true },
    { href: 'customer.html', label: 'Cliente', icon: '👤', hint: 'Tus reservas y perfil', group: 'Gestión', minRole: 'customer', guest: false },
    { href: 'agent.html', label: 'Empleados', icon: '📋', hint: 'Operación diaria', group: 'Gestión', minRole: 'agent', guest: false },
    { href: 'admin.html', label: 'Admin', icon: '⚙️', hint: 'Configuración global', group: 'Gestión', minRole: 'admin', guest: false },
    { href: 'contact.html', label: 'Contacto', icon: '💬', hint: 'Ayuda y soporte', group: 'Soporte', minRole: 'customer', guest: true }
  ];

  const currentPage = window.location.pathname.split('/').pop();
  const currentLevel = user ? getRoleLevel(user.role) : 0;
  const visibleItems = items.filter((item) => (user ? currentLevel >= getRoleLevel(item.minRole) : item.guest));
  const groupedItems = visibleItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});
  const isGuest = !user;

  sidebar.innerHTML = `
    <div class="sidebar-head">
      <span class="sidebar-logo">🛡️</span>
      <div>
        <strong>RentCar</strong>
        <p>Portal ${isGuest ? 'invitado' : user.role}</p>
      </div>
    </div>
    <nav class="sidebar-menu">
      ${Object.entries(groupedItems)
        .map(
          ([group, menuItems]) => `
            <div class="sidebar-section">
              <small class="sidebar-section-title">${group}</small>
              ${menuItems
                .map(
                  (item) => `
                    <a href="${item.href}" class="${currentPage === item.href ? 'active' : ''}" title="${item.hint}" data-label="${item.label}" aria-label="${item.label}: ${item.hint}" ${currentPage === item.href ? 'aria-current="page"' : ''}>
                      <span class="icon">${item.icon}</span>
                      <span class="menu-text">
                        <span>${item.label}</span>
                        <small>${item.hint}</small>
                      </span>
                    </a>`
                )
                .join('')}
            </div>`
        )
        .join('')}
    </nav>
    <div class="sidebar-user">
      ${
        isGuest
          ? `
            <small>Bienvenido</small>
            <strong>Invitado</strong>
            <p>Inicia sesión para reservar y gestionar tus alquileres.</p>
            <a href="index.html" class="btn-ghost">Ingresar</a>
          `
          : `
            <small>Conectado como</small>
            <strong>${user.name}</strong>
            <p>${user.email}</p>
            <a class="btn-ghost sidebar-user-action" href="catalog.html">Nueva reserva</a>
            <button class="btn-ghost" id="sidebarLogoutBtn">Salir</button>
          `
      }
    </div>
  `;

  if (!isGuest) {
    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
    if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', logout);
  }

  let toggleBtn = document.getElementById('sidebarToggleBtn');
  if (!toggleBtn) {
    toggleBtn = document.createElement('button');
    toggleBtn.id = 'sidebarToggleBtn';
    toggleBtn.className = 'sidebar-toggle-btn';
    toggleBtn.type = 'button';
    toggleBtn.addEventListener('click', () => {
      const collapsed = document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
      toggleBtn.textContent = collapsed ? '☰' : '⮜';
      toggleBtn.setAttribute('aria-label', collapsed ? 'Mostrar menú' : 'Ocultar menú');
      toggleBtn.setAttribute('aria-expanded', String(!collapsed));
    });
    document.body.appendChild(toggleBtn);
  }

  const collapsedByPreference = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  document.body.classList.toggle('sidebar-collapsed', collapsedByPreference);
  toggleBtn.textContent = collapsedByPreference ? '☰' : '⮜';
  toggleBtn.setAttribute('aria-label', collapsedByPreference ? 'Mostrar menú' : 'Ocultar menú');
  toggleBtn.setAttribute('aria-expanded', String(!collapsedByPreference));
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
    window.location.href = getHomeByRole(user.role);
  });
}

function renderAdminPanel() {
  const stats = document.getElementById('adminStats');
  const usersTable = document.getElementById('usersTable');
  const bookingsTable = document.getElementById('bookingsTable');
  const inquiriesTable = document.getElementById('inquiriesTable');
  if (!stats || !usersTable || !bookingsTable || !inquiriesTable) return;

  const db = getDB();
  const userSearch = document.getElementById('adminUserSearch')?.value.trim().toLowerCase() || '';
  const bookingSearch = document.getElementById('adminBookingSearch')?.value.trim().toLowerCase() || '';
  const inquirySearch = document.getElementById('adminInquirySearch')?.value.trim().toLowerCase() || '';

  stats.innerHTML = `
    <div><strong>${db.users.length}</strong><span>Usuarios</span></div>
    <div><strong>${db.cars.length}</strong><span>Vehículos</span></div>
    <div><strong>${db.bookings.length}</strong><span>Reservas</span></div>
    <div><strong>${db.outbox.length}</strong><span>Correos</span></div>
  `;

  const filteredUsers = db.users.filter((user) => {
    const haystack = `${user.name} ${user.email}`.toLowerCase();
    return !userSearch || haystack.includes(userSearch);
  });
  usersTable.innerHTML = filteredUsers.length
    ? filteredUsers
        .map((user) => `<tr><td>${user.name}</td><td>${user.email}</td><td><span class="status-chip">${user.role}</span></td></tr>`)
        .join('')
    : '<tr><td colspan="3" class="empty-state">No hay usuarios con ese criterio.</td></tr>';

  const bookingRows = db.bookings
    .map((booking) => {
      const customer = db.users.find((user) => user.id === booking.userId);
      const car = db.cars.find((item) => item.id === booking.carId);
      return { booking, customerName: customer?.name || 'Cliente', carName: car?.name || 'Vehículo' };
    })
    .filter(({ customerName, carName }) => {
      const haystack = `${customerName} ${carName}`.toLowerCase();
      return !bookingSearch || haystack.includes(bookingSearch);
    });

  bookingsTable.innerHTML = bookingRows.length
    ? bookingRows
        .map(({ booking, customerName, carName }) => `
            <tr>
              <td>#${booking.id}</td>
              <td>${customerName}</td>
              <td>${carName}</td>
              <td>${booking.startDate} → ${booking.endDate}</td>
              <td>${booking.cardIdentifier ? `**** ${booking.cardIdentifier}` : '-'}</td>
              <td>${formatCurrency(booking.total)}</td>
            </tr>`
        )
        .join('')
    : '<tr><td colspan="6" class="empty-state">No hay reservas con ese criterio.</td></tr>';

  const filteredInquiries = db.inquiries.filter((inq) => {
    const haystack = `${inq.name} ${inq.email} ${inq.message} ${inq.mailTo || ''} ${inq.mailStatus || ''}`.toLowerCase();
    return !inquirySearch || haystack.includes(inquirySearch);
  });
  inquiriesTable.innerHTML = filteredInquiries.length
    ? filteredInquiries
        .map(
          (inq) => `<tr>
            <td>${inq.name}</td>
            <td>${inq.email}</td>
            <td>${inq.message}</td>
            <td>${inq.mailTo || '-'}</td>
            <td><span class="status-chip">${inq.mailStatus || 'pendiente'}</span></td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="5" class="empty-state">No hay consultas con ese criterio.</td></tr>';
}

function initAdminFilters() {
  ['adminUserSearch', 'adminBookingSearch', 'adminInquirySearch'].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.addEventListener('input', renderAdminPanel);
  });
}

function handleAdminCreateUser() {
  const form = document.getElementById('adminCreateUserForm');
  if (!form) return;
  const messageBox = document.getElementById('adminCreateUserMessage');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const db = getDB();
    const name = document.getElementById('adminUserName').value.trim();
    const email = document.getElementById('adminUserEmail').value.trim().toLowerCase();
    const phone = document.getElementById('adminUserPhone').value.trim();
    const password = document.getElementById('adminUserPassword').value;
    const role = document.getElementById('adminUserRole').value;

    if (db.users.some((user) => user.email === email)) {
      messageBox.textContent = 'Ese correo ya existe.';
      messageBox.classList.remove('hidden');
      return;
    }

    db.users.push({ id: Date.now(), name, email, phone, password, role });
    saveDB(db);
    form.reset();
    messageBox.textContent = `Usuario creado con rol: ${role}.`;
    messageBox.classList.remove('hidden');
    renderAdminPanel();
  });
}

function getRentalStatus(booking) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(booking.startDate);
  const end = new Date(booking.endDate);

  if (end < today) return 'finalizado';
  if (start > today) return 'programado';
  return 'en curso';
}

function renderAgentPanel() {
  const body = document.getElementById('agentBookingsTable');
  const stats = document.getElementById('agentStats');
  if (!body || !stats) return;

  const db = getDB();
  const search = document.getElementById('agentSearch')?.value.trim().toLowerCase() || '';
  const selectedStatus = document.getElementById('agentStatusFilter')?.value || 'todos';
  const tracked = db.bookings.map((booking) => {
    const status = getRentalStatus(booking);
    const customer = db.users.find((user) => user.id === booking.userId);
    const car = db.cars.find((item) => item.id === booking.carId);
    return { booking, status, customer, car };
  });

  const inProgress = tracked.filter((item) => item.status === 'en curso').length;
  const scheduled = tracked.filter((item) => item.status === 'programado').length;
  const finished = tracked.filter((item) => item.status === 'finalizado').length;

  stats.innerHTML = `
    <div><strong>${inProgress}</strong><span>En curso</span></div>
    <div><strong>${scheduled}</strong><span>Programados</span></div>
    <div><strong>${finished}</strong><span>Finalizados</span></div>
  `;

  const filteredTracked = tracked.filter(({ status, customer, car }) => {
    const byStatus = selectedStatus === 'todos' || status === selectedStatus;
    const bySearch = !search || `${customer?.name || ''} ${car?.name || ''}`.toLowerCase().includes(search);
    return byStatus && bySearch;
  });

  body.innerHTML = filteredTracked.length
    ? filteredTracked
        .map(
          ({ booking, status, customer, car }) => `
          <tr>
            <td>#${booking.id}</td>
            <td>${customer?.name || 'Cliente'}</td>
            <td>${car?.name || 'Vehículo'}</td>
            <td>${booking.startDate}</td>
            <td>${booking.endDate}</td>
            <td><span class="status-chip ${status.replace(' ', '-')}">${status}</span></td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="6" class="empty-state">No hay alquileres con ese filtro.</td></tr>';
}

function initAgentFilters() {
  const search = document.getElementById('agentSearch');
  const status = document.getElementById('agentStatusFilter');
  if (search) search.addEventListener('input', renderAgentPanel);
  if (status) status.addEventListener('change', renderAgentPanel);
}

function handleForgotPassword() {
  const form = document.getElementById('forgotForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('recoveryEmail').value.trim().toLowerCase();
    if (!email) return;

    try {
      await postToApi('/api/auth/forgot-password', { email });
      document.getElementById('recoveryBox').classList.add('hidden');
      document.getElementById('successBox').classList.remove('hidden');
    } catch (error) {
      alert(error.message || 'No pudimos procesar la solicitud.');
    }
  });
}

function handleResetPassword() {
  const form = document.getElementById('resetPasswordForm');
  if (!form) return;

  const token = new URLSearchParams(window.location.search).get('token');
  if (!token) {
    alert('Enlace inválido. Solicita uno nuevo.');
    window.location.href = 'forgot-password.html';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    try {
      await postToApi('/api/auth/reset-password', { token, newPassword: password });
      document.getElementById('resetBox').classList.add('hidden');
      document.getElementById('resetSuccessBox').classList.remove('hidden');
    } catch (error) {
      alert(error.message || 'No pudimos actualizar la contraseña.');
    }
  });
}

function renderCatalog() {
  const grid = document.getElementById('vehicleGrid');
  if (!grid) return;

  const db = getDB();
  const category = document.getElementById('filterCategory')?.value || 'todos';
  const location = document.getElementById('filterLocation')?.value || 'todos';
  const maxPrice = Number(document.getElementById('filterPrice')?.value || 9999);
  const filterStartDate = document.getElementById('filterStartDate')?.value || '';
  const filterEndDate = document.getElementById('filterEndDate')?.value || '';
  const onlyAvailable = document.getElementById('filterOnlyAvailable')?.checked || false;

  const cars = db.cars.filter((car) => {
    const byCategory = category === 'todos' || car.category === category;
    const byLocation = location === 'todos' || car.location === location;
    const byPrice = car.pricePerDay <= maxPrice;
    const availableInRange = isCarAvailable(db, car.id, filterStartDate, filterEndDate);
    const byAvailability = !onlyAvailable || availableInRange;
    return byCategory && byLocation && byPrice && byAvailability;
  });

  if (!cars.length) {
    grid.innerHTML = '<p class="empty-state">No hay vehículos con esos filtros.</p>';
    return;
  }

  grid.innerHTML = cars
    .map(
      (car) => `
      <article class="car-card">
        <img src="${car.image}" alt="${car.name}">
        <div class="car-info">
          <div class="car-top-line">
            <span class="badge">${car.category}</span>
            <span>${isCarAvailable(db, car.id, filterStartDate, filterEndDate) ? '✅ Disponible' : '⛔ Reservado'}</span>
          </div>
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
  ['filterCategory', 'filterLocation', 'filterPrice', 'filterStartDate', 'filterEndDate', 'filterOnlyAvailable'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', renderCatalog);
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
      <h1>${car.name} ${car.year}</h1>
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

  document.getElementById('checkoutCar').textContent = `${car.name} ${car.year}`;
  document.getElementById('checkoutPrice').textContent = formatCurrency(car.pricePerDay);
  const billingEmail = document.getElementById('billingEmail');
  const currentUser = getCurrentUser();
  if (billingEmail && currentUser?.email) billingEmail.value = currentUser.email;

  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');
  const cardIdentifier = document.getElementById('cardIdentifier');
  const totalText = document.getElementById('totalPrice');
  const daysText = document.getElementById('summaryDays');
  const subtotalText = document.getElementById('summarySubtotal');
  const itbisText = document.getElementById('summaryItbis');
  const ncfText = document.getElementById('summaryNcf');
  let currentNcf = generateNCF();

  const updateTotal = () => {
    const fallback = { days: 1, subtotal: car.pricePerDay, itbis: Number((car.pricePerDay * ITBIS_RATE).toFixed(2)), total: 0 };
    fallback.total = Number((fallback.subtotal + fallback.itbis).toFixed(2));
    const summary = startDate.value && endDate.value ? calculateInvoice(car.pricePerDay, startDate.value, endDate.value) : fallback;
    totalText.textContent = formatCurrency(summary.total);
    daysText.textContent = summary.days;
    subtotalText.textContent = formatCurrency(summary.subtotal);
    itbisText.textContent = formatCurrency(summary.itbis);
    ncfText.textContent = currentNcf;
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
    if (!isCarAvailable(getDB(), car.id, startDate.value, endDate.value)) {
      alert('Este vehículo no está disponible en ese rango de fechas.');
      return;
    }
    const sanitizedCardIdentifier = cardIdentifier.value.replace(/\D/g, '');
    if (!/^\d{4}$/.test(sanitizedCardIdentifier)) {
      alert('Ingresa un identificador de tarjeta válido de 4 dígitos.');
      return;
    }

    const user = getCurrentUser();
    const db = getDB();
    const summary = calculateInvoice(car.pricePerDay, startDate.value, endDate.value);
    const ncf = currentNcf;

    db.bookings.push({
      id: Date.now(),
      userId: user.id,
      carId: car.id,
      startDate: startDate.value,
      endDate: endDate.value,
      days: summary.days,
      subtotal: summary.subtotal,
      itbis: summary.itbis,
      cardIdentifier: sanitizedCardIdentifier,
      ncf,
      total: summary.total,
      status: 'confirmada'
    });
    queueBookingEmail(db, {
      to: billingEmail.value.trim(),
      customerName: user.name,
      carName: car.name,
      startDate: startDate.value,
      endDate: endDate.value,
      days: summary.days,
      subtotal: summary.subtotal,
      itbis: summary.itbis,
      total: summary.total,
      ncf
    });

    saveDB(db);
    document.getElementById('paymentBox').classList.add('hidden');
    document.getElementById('successPaymentBox').classList.remove('hidden');
    document.getElementById('successPaymentMessage').textContent = `Factura enviada a ${billingEmail.value.trim()} con NCF ${ncf}.`;
    currentNcf = generateNCF();
  });
}

function handleContact() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const successBox = document.getElementById('contactSuccess');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    if (!name || !email || !message) {
      alert('Completa todos los campos.');
      return;
    }

    let response;
    try {
      response = await postToApi('/api/inquiries', { name, email, message });
    } catch (error) {
      alert(error.message || 'No fue posible enviar la consulta.');
      return;
    }

    const db = getDB();
    db.inquiries.push({
      id: Date.now(),
      name,
      email,
      message,
      mailTo: response.mailTo || '-',
      mailStatus: response.mailStatus || 'pendiente',
      createdAt: new Date().toISOString()
    });
    db.outbox.push({
      id: Date.now() + 1,
      to: response.mailTo || '-',
      subject: `Consulta de ${name}`,
      message,
      status: response.mailStatus || 'pendiente',
      createdAt: new Date().toISOString()
    });
    saveDB(db);
    form.reset();
    if (successBox) {
      successBox.textContent = `✅ Consulta enviada. Destino: ${response.mailTo || '-'} (${response.mailStatus || 'pendiente'}).`;
      successBox.classList.remove('hidden');
    }
  });
}

function initPage() {
  getDB();
  initThemeToggle();
  const page = document.body.dataset.page;
  updateNavUser();
  const user = getCurrentUser();

  if (page === 'login' && user) window.location.href = getHomeByRole(user.role);
  if (page === 'dashboard') {
    if (!requireAuth()) return;
  }
  if (page === 'customer') {
    if (!requireAuth() || !requireRole(['customer', 'agent', 'admin'])) return;
  }
  if (page === 'admin') {
    if (!requireAuth() || !requireRole(['admin'])) return;
  }
  if (page === 'agent') {
    if (!requireAuth() || !requireRole(['admin', 'agent'])) return;
  }

  handleLogin();
  handleRegister();
  handleForgotPassword();
  handleResetPassword();
  renderCatalog();
  setupFilters();
  renderFeaturedStats();
  renderCarDetails();
  handleCheckout();
  handleContact();
  initAdminFilters();
  renderAdminPanel();
  handleAdminCreateUser();
  initAgentFilters();
  renderAgentPanel();
  renderSidebar();
}

document.addEventListener('DOMContentLoaded', initPage);
