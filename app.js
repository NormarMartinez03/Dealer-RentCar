const SESSION_KEY = 'rentcar_session';
const THEME_KEY = 'rentcar_theme';
const SIDEBAR_COLLAPSED_KEY = 'rentcar_sidebar_collapsed';
const API_BASE_URL_KEY = 'rentcar_api_url';
const DEFAULT_API_BASE_URL = 'http://localhost:3000';

const STATUS_META = {
  confirmada: { label: 'Confirmada', className: 'confirmada' },
  en_curso: { label: 'En curso', className: 'en-curso' },
  completada: { label: 'Completada', className: 'completada' },
  cancelada: { label: 'Cancelada', className: 'cancelada' }
};

const BOOKING_STATUSES = Object.keys(STATUS_META);

let customerBookingsCache = [];
let agentBookingsCache = [];
let adminDataCache = {
  users: [],
  bookings: [],
  inquiries: [],
  cars: [],
  stats: null
};
let adminEditingCarId = null;

function getApiBaseUrl() {
  return localStorage.getItem(API_BASE_URL_KEY) || DEFAULT_API_BASE_URL;
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getCurrentUser() {
  return getSession()?.user || null;
}

function getToken() {
  return getSession()?.token || null;
}

function getHomeByRole(role) {
  if (role === 'admin') return 'admin.html';
  if (role === 'agent') return 'agent.html';
  return 'dashboard.html';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
}

function describeMailStatus(status) {
  if (status === 'enviado') return 'Correo enviado correctamente.';
  if (status === 'parcial') return 'La solicitud se registro, pero una confirmacion quedo pendiente.';
  if (status === 'simulado') return 'La solicitud se proceso en modo de simulacion. Configura SMTP para usar correos reales.';
  if (status === 'fallido') return 'La solicitud se registro, pero el correo no pudo enviarse.';
  return 'Solicitud procesada.';
}

function maskEmail(email) {
  const normalized = String(email || '').trim();
  const [namePart, domainPart] = normalized.split('@');
  if (!namePart || !domainPart) return normalized || 'tu correo';

  const visibleName =
    namePart.length <= 2 ? `${namePart[0] || '*'}*` : `${namePart.slice(0, 2)}${'*'.repeat(Math.max(namePart.length - 2, 2))}`;
  const domainPieces = domainPart.split('.');
  const domainName = domainPieces.shift() || '';
  const extension = domainPieces.join('.');
  const visibleDomain =
    domainName.length <= 2 ? `${domainName[0] || '*'}*` : `${domainName.slice(0, 2)}${'*'.repeat(Math.max(domainName.length - 2, 2))}`;

  return extension ? `${visibleName}@${visibleDomain}.${extension}` : `${visibleName}@${visibleDomain}`;
}

function describeRecoveryDeliveryMode(mode) {
  if (mode === 'email') {
    return 'Revisa tu bandeja de entrada y la carpeta de spam.';
  }
  return 'En este momento el proyecto esta en modo local de simulacion hasta completar SMTP.';
}

function mapStatus(status) {
  return STATUS_META[status] || { label: status || 'Sin estado', className: 'sin-estado' };
}

function calculateInvoice(pricePerDay, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  if (!Number.isFinite(days) || days <= 0) return null;

  const subtotal = Number((days * Number(pricePerDay || 0)).toFixed(2));
  const serviceFee = Number((days * 5).toFixed(2));
  const taxes = Number(((subtotal + serviceFee) * 0.18).toFixed(2));
  const total = Number((subtotal + serviceFee + taxes).toFixed(2));

  return {
    days,
    subtotal,
    serviceFee,
    taxes,
    total
  };
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

  const updateThemeButton = (currentTheme) => {
    themeToggleBtn.textContent = currentTheme === 'dark' ? 'Light' : 'Dark';
    themeToggleBtn.setAttribute('aria-label', currentTheme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro');
    themeToggleBtn.setAttribute('title', currentTheme === 'dark' ? 'Modo claro' : 'Modo oscuro');
  };

  updateThemeButton(theme);
  themeToggleBtn.addEventListener('click', () => {
    const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    updateThemeButton(nextTheme);
  });
}

function redirectToLogin() {
  clearSession();
  if (!window.location.pathname.endsWith('index.html')) {
    window.location.href = 'index.html';
  }
}

async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    auth = false,
    skipAuthRedirect = false,
    headers: customHeaders = {}
  } = options;

  const headers = {
    ...customHeaders
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getToken();
    if (!token) {
      if (!skipAuthRedirect) redirectToLogin();
      throw new Error('Tu sesion expiro. Inicia sesion de nuevo.');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  let data = {};
  try {
    data = await response.json();
  } catch (_error) {
    data = {};
  }

  if (!response.ok) {
    if (response.status === 401 && auth && !skipAuthRedirect) {
      redirectToLogin();
    }
    throw new Error(data.error || 'No fue posible completar la solicitud.');
  }

  return data;
}

async function downloadAuthenticatedFile(endpoint, fallbackFilename = 'archivo') {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    throw new Error('Tu sesion expiro. Inicia sesion de nuevo.');
  }

  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    let data = {};
    try {
      data = await response.json();
    } catch (_error) {
      data = {};
    }

    if (response.status === 401) {
      redirectToLogin();
    }
    throw new Error(data.error || 'No fue posible descargar el archivo.');
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('Content-Disposition') || '';
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || fallbackFilename;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function requireAuth(redirect = 'index.html') {
  if (!getCurrentUser()) {
    window.location.href = redirect;
    return false;
  }
  return true;
}

function requireRole(allowedRoles, redirect = 'dashboard.html') {
  const user = getCurrentUser();
  if (!user) return false;
  if (!allowedRoles.includes(user.role)) {
    window.location.href = redirect;
    return false;
  }
  return true;
}

function logout() {
  clearSession();
  window.location.href = 'index.html';
}

function getUserInitials(name) {
  return String(name || 'Invitado')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'RC';
}

function formatRoleLabel(role) {
  const labels = {
    admin: 'Administrador',
    agent: 'Agente',
    customer: 'Cliente',
    guest: 'Invitado'
  };
  return labels[role] || role || 'Invitado';
}

function createSidebarIcon(paths, className = '') {
  return `
    <svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${paths}
    </svg>
  `;
}

function getSidebarIcon(name, className = '') {
  const icons = {
    brand: `
      <path d="M5 16.5h14" />
      <path d="M7 16.5V18a1 1 0 0 0 1 1h1.5" />
      <path d="M17 16.5V18a1 1 0 0 1-1 1h-1.5" />
      <path d="M19 16.5h1v-2.2a2 2 0 0 0-.53-1.37l-1.76-1.93A2 2 0 0 0 16.23 10H7.77a2 2 0 0 0-1.48.65l-1.76 1.93A2 2 0 0 0 4 14.3v2.2h1" />
      <circle cx="8" cy="16.5" r="1.2" />
      <circle cx="16" cy="16.5" r="1.2" />
    `,
    dashboard: `
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
      <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.4" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.4" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
    `,
    catalog: `
      <path d="M5 16.5h14" />
      <path d="M7 16.5V18a1 1 0 0 0 1 1h1.5" />
      <path d="M17 16.5V18a1 1 0 0 1-1 1h-1.5" />
      <path d="M19 16.5h1v-2.2a2 2 0 0 0-.53-1.37l-1.76-1.93A2 2 0 0 0 16.23 10H7.77a2 2 0 0 0-1.48.65l-1.76 1.93A2 2 0 0 0 4 14.3v2.2h1" />
      <circle cx="8" cy="16.5" r="1.2" />
      <circle cx="16" cy="16.5" r="1.2" />
    `,
    customer: `
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    `,
    agent: `
      <path d="M4.5 9.5h15" />
      <path d="M8.5 9.5V7.8A1.8 1.8 0 0 1 10.3 6h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7" />
      <rect x="4.5" y="9.5" width="15" height="10" rx="2" />
      <path d="M10 13.5h4" />
    `,
    admin: `
      <path d="M12 3.8 18 6v5.3c0 4.1-2.5 7-6 8.9-3.5-1.9-6-4.8-6-8.9V6l6-2.2Z" />
      <path d="m9.7 12 1.6 1.6 3.1-3.1" />
    `,
    contact: `
      <path d="M6 15.5c-1.4-1.3-2.2-3-2.2-4.9C3.8 6.6 7.4 3 12 3s8.2 3.6 8.2 7.6S16.6 18.2 12 18.2c-.7 0-1.5-.1-2.2-.3L5 20l1-4.5Z" />
    `,
    logout: `
      <path d="M9 6.5H7.5A2.5 2.5 0 0 0 5 9v6a2.5 2.5 0 0 0 2.5 2.5H9" />
      <path d="M13 8.5 17 12l-4 3.5" />
      <path d="M17 12H9" />
    `,
    login: `
      <path d="M9 6.5H7.5A2.5 2.5 0 0 0 5 9v6a2.5 2.5 0 0 0 2.5 2.5H9" />
      <path d="M13 8.5 17 12l-4 3.5" />
      <path d="M17 12H9" />
    `,
    chevron: `
      <path d="m9 6 6 6-6 6" />
    `,
    collapse: `
      <rect x="3.5" y="4" width="17" height="16" rx="2.2" />
      <path d="M8 4v16" />
      <path d="m14 9-3 3 3 3" />
    `,
    expand: `
      <rect x="3.5" y="4" width="17" height="16" rx="2.2" />
      <path d="M8 4v16" />
      <path d="m11 9 3 3-3 3" />
    `
  };

  return createSidebarIcon(icons[name] || icons.dashboard, className);
}

function renderSidebar() {
  const sidebar = document.getElementById('appSidebar');
  if (!sidebar) return;

  const user = getCurrentUser();
  const role = user?.role || 'guest';

  const menu = [
    {
      href: 'dashboard.html',
      label: 'Dashboard',
      hint: 'Resumen operativo',
      icon: 'dashboard',
      section: 'principal',
      roles: ['customer', 'agent', 'admin']
    },
    {
      href: 'catalog.html',
      label: 'Catalogo',
      hint: 'Explorar vehiculos',
      icon: 'catalog',
      section: 'principal',
      roles: ['guest', 'customer', 'agent', 'admin']
    },
    {
      href: 'customer.html',
      label: 'Cliente',
      hint: 'Perfil y reservas',
      icon: 'customer',
      section: 'gestion',
      roles: ['customer', 'agent', 'admin']
    },
    {
      href: 'agent.html',
      label: 'Agente',
      hint: 'Operacion diaria',
      icon: 'agent',
      section: 'gestion',
      roles: ['agent', 'admin']
    },
    {
      href: 'admin.html',
      label: 'Admin',
      hint: 'Flota y usuarios',
      icon: 'admin',
      section: 'gestion',
      roles: ['admin']
    },
    {
      href: 'contact.html',
      label: 'Contacto',
      hint: 'Ayuda y soporte',
      icon: 'contact',
      section: 'soporte',
      roles: ['guest', 'customer', 'agent', 'admin']
    }
  ];
  const sections = [
    { key: 'principal', title: 'General' },
    { key: 'gestion', title: 'Gestion' },
    { key: 'soporte', title: 'Soporte' }
  ];

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const visible = menu.filter((item) => item.roles.includes(role));
  const initials = getUserInitials(user?.name);
  const roleLabel = formatRoleLabel(role);

  sidebar.innerHTML = `
    <div class="sidebar-head">
      <span class="sidebar-logo">${getSidebarIcon('brand', 'sidebar-logo-icon')}</span>
      <div class="sidebar-brand-copy">
        <small class="sidebar-kicker">Rentas y operacion</small>
        <strong>RentCar Express</strong>
        <p>${roleLabel}</p>
      </div>
    </div>
    <nav class="sidebar-menu" aria-label="Navegacion principal">
      ${sections
        .map((section) => {
          const items = visible.filter((item) => item.section === section.key);
          if (!items.length) return '';

          return `
            <div class="sidebar-section">
              <p class="sidebar-section-title">${section.title}</p>
              ${items
                .map(
                  (item) => `
                    <a href="${item.href}" class="${currentPage === item.href ? 'active' : ''}" data-label="${item.label}">
                      <span class="sidebar-link-icon">
                        ${getSidebarIcon(item.icon, 'menu-icon')}
                      </span>
                      <span class="menu-text">
                        <span class="sidebar-link-title-row">
                          <span>${item.label}</span>
                        </span>
                        <small>${item.hint}</small>
                      </span>
                      <span class="sidebar-link-arrow">
                        ${getSidebarIcon('chevron', 'menu-arrow-icon')}
                      </span>
                    </a>`
                )
                .join('')}
            </div>
          `;
        })
        .join('')}
    </nav>
    <div class="sidebar-user">
      <div class="sidebar-user-top">
        <span class="sidebar-avatar">${escapeHtml(initials)}</span>
        <div class="sidebar-user-meta">
          <small>${user ? 'Conectado como' : 'Sesion actual'}</small>
          <strong>${escapeHtml(user?.name || 'Invitado')}</strong>
          <p>${escapeHtml(user?.email || 'Inicia sesion para reservar y administrar.')}</p>
        </div>
      </div>
      <div class="sidebar-user-bottom">
        <span class="sidebar-role-badge role-${escapeHtml(role)}">${roleLabel}</span>
        ${
          user
            ? `
              <button class="btn-ghost sidebar-user-action" id="sidebarLogoutBtn" type="button" title="Cerrar sesion">
                ${getSidebarIcon('logout', 'sidebar-action-icon')}
                <span class="sidebar-user-action-label">Salir</span>
              </button>
            `
            : `
              <a class="btn-ghost sidebar-user-action" href="index.html" title="Iniciar sesion">
                ${getSidebarIcon('login', 'sidebar-action-icon')}
                <span class="sidebar-user-action-label">Ingresar</span>
              </a>
            `
        }
      </div>
    </div>
  `;

  if (user) {
    const logoutBtn = document.getElementById('sidebarLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
  }

  let toggleBtn = document.getElementById('sidebarToggleBtn');
  if (!toggleBtn) {
    toggleBtn = document.createElement('button');
    toggleBtn.id = 'sidebarToggleBtn';
    toggleBtn.className = 'sidebar-toggle-btn';
    toggleBtn.type = 'button';
    document.body.appendChild(toggleBtn);
  }

  const setCollapsedState = (collapsed) => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
    toggleBtn.innerHTML = collapsed
      ? getSidebarIcon('expand', 'sidebar-toggle-icon')
      : getSidebarIcon('collapse', 'sidebar-toggle-icon');
    toggleBtn.setAttribute('aria-expanded', String(!collapsed));
    toggleBtn.setAttribute('aria-label', collapsed ? 'Expandir sidebar' : 'Contraer sidebar');
    toggleBtn.setAttribute('title', collapsed ? 'Expandir sidebar' : 'Contraer sidebar');
  };

  const startCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  setCollapsedState(startCollapsed);

  toggleBtn.onclick = () => {
    setCollapsedState(!document.body.classList.contains('sidebar-collapsed'));
  };
}

function bindSimpleForm(formId, handler) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await handler(form);
    } catch (error) {
      alert(error.message || 'No fue posible completar la solicitud.');
    }
  });
}

function setMessage(id, message, isError = false) {
  const box = document.getElementById(id);
  if (!box) return;
  box.textContent = message;
  box.classList.remove('hidden');
  box.classList.toggle('error-msg', isError);
}

function clearMessage(id) {
  const box = document.getElementById(id);
  if (!box) return;
  box.textContent = '';
  box.classList.add('hidden');
  box.classList.remove('error-msg');
}

async function initLoginPage() {
  bindSimpleForm('loginForm', async () => {
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('pass')?.value;
    const payload = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    setSession({ user: payload.user, token: payload.token });
    window.location.href = getHomeByRole(payload.user.role);
  });
}

async function initRegisterPage() {
  bindSimpleForm('registerForm', async () => {
    const name = document.getElementById('registerName')?.value.trim();
    const email = document.getElementById('registerEmail')?.value.trim();
    const phone = document.getElementById('registerPhone')?.value.trim();
    const password = document.getElementById('registerPassword')?.value;
    const payload = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name, email, phone, password }
    });
    setSession({ user: payload.user, token: payload.token });
    window.location.href = getHomeByRole(payload.user.role);
  });
}

async function initForgotPasswordPage() {
  bindSimpleForm('forgotForm', async () => {
    const email = document.getElementById('recoveryEmail')?.value.trim();
    const response = await apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: { email }
    });
    const recoveryBox = document.getElementById('recoveryBox');
    const successBox = document.getElementById('successBox');
    const successMessage = document.getElementById('forgotSuccessMessage');
    const successDetail = document.getElementById('forgotSuccessDetail');
    if (recoveryBox) recoveryBox.classList.add('hidden');
    if (successBox) successBox.classList.remove('hidden');
    if (successMessage) {
      successMessage.textContent = `Si el correo existe, enviaremos un enlace a ${maskEmail(email)}.`;
    }
    if (successDetail) {
      successDetail.textContent = `${describeRecoveryDeliveryMode(response.deliveryMode)} El enlace vence en ${response.expiresInMinutes || 30} minutos.`;
    }
  });
}

async function initResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get('token');
  if (!token) {
    alert('Enlace invalido. Solicita una recuperacion nueva.');
    window.location.href = 'forgot-password.html';
    return;
  }

  const resetBox = document.getElementById('resetBox');
  const invalidBox = document.getElementById('resetInvalidBox');
  const invalidMessage = document.getElementById('resetInvalidMessage');
  const resetEmailHint = document.getElementById('resetEmailHint');

  try {
    const validation = await apiRequest('/api/auth/reset-password/validate', {
      method: 'POST',
      body: { token }
    });
    if (resetEmailHint) {
      resetEmailHint.textContent = `Restableceras el acceso de ${maskEmail(validation.email)}.`;
    }
  } catch (error) {
    if (resetBox) resetBox.classList.add('hidden');
    if (invalidBox) invalidBox.classList.remove('hidden');
    if (invalidMessage) {
      invalidMessage.textContent = error.message || 'No fue posible validar el enlace.';
    }
    return;
  }

  bindSimpleForm('resetPasswordForm', async () => {
    const newPassword = document.getElementById('newPassword')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    if (newPassword !== confirmPassword) {
      throw new Error('Las contrasenas no coinciden.');
    }
    const response = await apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword }
    });
    const resetBox = document.getElementById('resetBox');
    const successBox = document.getElementById('resetSuccessBox');
    const successMessage = document.getElementById('resetSuccessMessage');
    if (resetBox) resetBox.classList.add('hidden');
    if (successBox) successBox.classList.remove('hidden');
    if (successMessage) {
      successMessage.textContent =
        response.mailStatus === 'enviado'
          ? 'Ya puedes iniciar sesion con tu nueva contrasena. Tambien enviamos una notificacion a tu correo.'
          : 'Ya puedes iniciar sesion con tu nueva contrasena.';
    }
  });
}

function buildCarsQuery() {
  const query = new URLSearchParams();

  const category = document.getElementById('filterCategory')?.value;
  const location = document.getElementById('filterLocation')?.value;
  const maxPrice = document.getElementById('filterPrice')?.value;
  const startDate = document.getElementById('filterStartDate')?.value;
  const endDate = document.getElementById('filterEndDate')?.value;
  const search = document.getElementById('filterSearch')?.value;
  const transmission = document.getElementById('filterTransmission')?.value;
  const minSeats = document.getElementById('filterSeats')?.value;
  const onlyAvailable = document.getElementById('filterOnlyAvailable')?.checked;

  if (category) query.set('category', category);
  if (location) query.set('location', location);
  if (maxPrice) query.set('maxPrice', maxPrice);
  if (startDate) query.set('startDate', startDate);
  if (endDate) query.set('endDate', endDate);
  if (search) query.set('search', search);
  if (transmission) query.set('transmission', transmission);
  if (minSeats) query.set('minSeats', minSeats);
  if (onlyAvailable) query.set('onlyAvailable', 'true');

  return query.toString();
}

function renderCars(cars) {
  const grid = document.getElementById('vehicleGrid');
  if (!grid) return;

  if (!cars.length) {
    grid.innerHTML = '<p class="empty-state">No hay vehiculos para esos filtros.</p>';
    return;
  }

  grid.innerHTML = cars
    .map((car) => {
      const availabilityText = car.available ? 'Disponible' : 'Reservado';
      const availabilityClass = car.available ? 'available' : 'busy';
      return `
        <article class="car-card">
          <img src="${escapeHtml(car.image || '')}" alt="${escapeHtml(car.name)}">
          <div class="car-info">
            <div class="car-top-line">
              <span class="badge">${escapeHtml(car.category)}</span>
              <span class="availability ${availabilityClass}">${availabilityText}</span>
            </div>
            <h3>${escapeHtml(car.name)} (${escapeHtml(car.year)})</h3>
            <p class="muted">${escapeHtml(car.location)} | ${escapeHtml(car.transmission)} | ${escapeHtml(car.seats)} pasajeros</p>
            <p class="price">${formatCurrency(car.pricePerDay)}<span>/dia</span></p>
            <a class="btn-primary" href="car-details.html?id=${car.id}">Ver detalles</a>
          </div>
        </article>
      `;
    })
    .join('');
}

async function loadCars() {
  const query = buildCarsQuery();
  const cars = await apiRequest(`/api/cars${query ? `?${query}` : ''}`);
  renderCars(cars);
  return cars;
}

function bindCarFilters() {
  const filterIds = [
    'filterCategory',
    'filterLocation',
    'filterPrice',
    'filterStartDate',
    'filterEndDate',
    'filterSearch',
    'filterTransmission',
    'filterSeats',
    'filterOnlyAvailable'
  ];

  for (const id of filterIds) {
    const element = document.getElementById(id);
    if (!element) continue;
    element.addEventListener(element.tagName === 'INPUT' && element.type === 'text' ? 'input' : 'change', () => {
      loadCars().catch((error) => alert(error.message));
    });
  }
}

async function initCatalogPage() {
  bindCarFilters();
  await loadCars();
}

async function initDashboardPage() {
  if (!requireAuth()) return;
  bindCarFilters();
  const [cars, bookings] = await Promise.all([loadCars(), apiRequest('/api/bookings/me', { auth: true })]);

  const statsBox = document.getElementById('statsBox');
  if (statsBox) {
    const activeBookings = bookings.filter((booking) => ['confirmada', 'en_curso'].includes(booking.status)).length;
    const totalSpent = bookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0);
    statsBox.innerHTML = `
      <div><strong>${cars.length}</strong><span>Vehiculos activos</span></div>
      <div><strong>${bookings.length}</strong><span>Reservas totales</span></div>
      <div><strong>${activeBookings}</strong><span>Reservas activas</span></div>
      <div><strong>${formatCurrency(totalSpent)}</strong><span>Consumo historico</span></div>
    `;
  }
}

async function initCarDetailsPage() {
  const section = document.getElementById('carDetailSection');
  if (!section) return;
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    section.innerHTML = '<p class="empty-state">No se encontro el vehiculo solicitado.</p>';
    return;
  }

  const car = await apiRequest(`/api/cars/${id}`);
  section.innerHTML = `
    <img src="${escapeHtml(car.image || '')}" alt="${escapeHtml(car.name)}" class="detail-img">
    <div class="detail-text glass-box left">
      <h1>${escapeHtml(car.name)} ${escapeHtml(car.year)}</h1>
      <p class="price">${formatCurrency(car.pricePerDay)} / dia</p>
      <p class="muted">${escapeHtml(car.description || 'Sin descripcion.')}</p>
      <ul class="feature-list">
        ${car.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}
      </ul>
      <a href="checkout.html?id=${car.id}" class="btn-primary">Reservar este vehiculo</a>
    </div>
  `;
}

async function initCheckoutPage() {
  if (!requireAuth()) return;

  const wrap = document.getElementById('checkoutWrapper');
  const form = document.getElementById('checkoutForm');
  if (!wrap || !form) return;

  const carId = new URLSearchParams(window.location.search).get('id');
  if (!carId) {
    wrap.innerHTML = '<p class="empty-state">Debes seleccionar un vehiculo para reservar.</p>';
    return;
  }

  const car = await apiRequest(`/api/cars/${carId}`);
  const user = getCurrentUser();

  const checkoutCar = document.getElementById('checkoutCar');
  const checkoutPrice = document.getElementById('checkoutPrice');
  const billingEmail = document.getElementById('billingEmail');
  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');
  const paymentLast4 = document.getElementById('cardIdentifier');

  if (checkoutCar) checkoutCar.textContent = `${car.name} ${car.year}`;
  if (checkoutPrice) checkoutPrice.textContent = formatCurrency(car.pricePerDay);
  if (billingEmail && user?.email) billingEmail.value = user.email;

  const summaryDays = document.getElementById('summaryDays');
  const summarySubtotal = document.getElementById('summarySubtotal');
  const summaryService = document.getElementById('summaryService');
  const summaryTaxes = document.getElementById('summaryTaxes');
  const totalPrice = document.getElementById('totalPrice');

  const updateSummary = () => {
    const invoice = calculateInvoice(car.pricePerDay, startDate?.value, endDate?.value);
    if (!invoice) {
      if (summaryDays) summaryDays.textContent = '-';
      if (summarySubtotal) summarySubtotal.textContent = '-';
      if (summaryService) summaryService.textContent = '-';
      if (summaryTaxes) summaryTaxes.textContent = '-';
      if (totalPrice) totalPrice.textContent = '-';
      return null;
    }

    if (summaryDays) summaryDays.textContent = String(invoice.days);
    if (summarySubtotal) summarySubtotal.textContent = formatCurrency(invoice.subtotal);
    if (summaryService) summaryService.textContent = formatCurrency(invoice.serviceFee);
    if (summaryTaxes) summaryTaxes.textContent = formatCurrency(invoice.taxes);
    if (totalPrice) totalPrice.textContent = formatCurrency(invoice.total);
    return invoice;
  };

  if (startDate) startDate.addEventListener('change', updateSummary);
  if (endDate) endDate.addEventListener('change', updateSummary);
  updateSummary();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage('checkoutMessage');

    if (!startDate?.value || !endDate?.value) {
      setMessage('checkoutMessage', 'Selecciona un rango de fechas valido.', true);
      return;
    }

    const invoice = updateSummary();
    if (!invoice) {
      setMessage('checkoutMessage', 'Las fechas seleccionadas no son validas.', true);
      return;
    }

    if (paymentLast4 && !/^\d{4}$/.test(paymentLast4.value.trim())) {
      setMessage('checkoutMessage', 'Ingresa un identificador de pago de 4 digitos.', true);
      return;
    }

    try {
      const payload = await apiRequest('/api/bookings', {
        method: 'POST',
        auth: true,
        body: {
          carId: Number(carId),
          startDate: startDate.value,
          endDate: endDate.value,
          paymentLast4: paymentLast4?.value.trim(),
          billingEmail: billingEmail?.value.trim()
        }
      });

      document.getElementById('paymentBox')?.classList.add('hidden');
      document.getElementById('successPaymentBox')?.classList.remove('hidden');
      const success = document.getElementById('successPaymentMessage');
      if (success) {
        success.textContent = `Reserva confirmada. NCF ${payload.invoice?.ncf || '-'} y total ${formatCurrency(
          payload.invoice?.total || 0
        )}.`;
      }
    } catch (error) {
      setMessage('checkoutMessage', error.message, true);
    }
  });
}

function renderCustomerBookings() {
  const tbody = document.getElementById('customerBookingsTable');
  if (!tbody) return;

  const search = document.getElementById('customerBookingSearch')?.value.trim().toLowerCase() || '';
  const filtered = customerBookingsCache.filter((booking) => {
    const haystack = `${booking.carName || ''} ${booking.carBrand || ''} ${booking.status || ''}`.toLowerCase();
    return !search || haystack.includes(search);
  });

  tbody.innerHTML = filtered.length
    ? filtered
        .map((booking) => {
          const status = mapStatus(booking.status);
          return `
            <tr>
              <td>#${booking.id}</td>
              <td>${escapeHtml(booking.carName || '-')}</td>
              <td>${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}</td>
              <td>${booking.days || '-'}</td>
              <td>${escapeHtml(booking.ncf || '-')}</td>
              <td>${formatCurrency(booking.total)}</td>
              <td><span class="status-chip ${status.className}">${status.label}</span></td>
              <td>
                <button class="btn-ghost btn-compact" type="button" data-download-invoice="${booking.id}">
                  Descargar PDF
                </button>
              </td>
            </tr>
          `;
        })
        .join('')
    : '<tr><td colspan="8" class="empty-state">No hay reservas para mostrar.</td></tr>';
}

async function initCustomerPage() {
  if (!requireAuth() || !requireRole(['customer', 'agent', 'admin'])) return;

  const [profile, bookings] = await Promise.all([apiRequest('/api/me', { auth: true }), apiRequest('/api/bookings/me', { auth: true })]);
  customerBookingsCache = bookings;

  const nameInput = document.getElementById('customerName');
  const emailInput = document.getElementById('customerEmail');
  const phoneInput = document.getElementById('customerPhone');
  if (nameInput) nameInput.value = profile.name || '';
  if (emailInput) emailInput.value = profile.email || '';
  if (phoneInput) phoneInput.value = profile.phone || '';

  const stats = document.getElementById('customerStats');
  if (stats) {
    const active = bookings.filter((booking) => ['confirmada', 'en_curso'].includes(booking.status)).length;
    const completed = bookings.filter((booking) => booking.status === 'completada').length;
    const totalSpent = bookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0);

    stats.innerHTML = `
      <div><strong>${bookings.length}</strong><span>Reservas</span></div>
      <div><strong>${active}</strong><span>Activas</span></div>
      <div><strong>${completed}</strong><span>Completadas</span></div>
      <div><strong>${formatCurrency(totalSpent)}</strong><span>Total historico</span></div>
    `;
  }

  renderCustomerBookings();
  const search = document.getElementById('customerBookingSearch');
  if (search) search.addEventListener('input', renderCustomerBookings);
  const bookingsTable = document.getElementById('customerBookingsTable');
  if (bookingsTable) {
    bookingsTable.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-download-invoice]');
      if (!button) return;

      const bookingId = Number(button.getAttribute('data-download-invoice'));
      if (!Number.isInteger(bookingId) || bookingId <= 0) return;

      const previousLabel = button.textContent;
      button.disabled = true;
      button.textContent = 'Descargando...';
      try {
        await downloadAuthenticatedFile(`/api/bookings/${bookingId}/invoice`, `factura-reserva-${bookingId}.pdf`);
      } catch (error) {
        alert(error.message);
      } finally {
        button.disabled = false;
        button.textContent = previousLabel;
      }
    });
  }

  bindSimpleForm('customerProfileForm', async () => {
    clearMessage('customerProfileMessage');
    const name = document.getElementById('customerName')?.value.trim();
    const phone = document.getElementById('customerPhone')?.value.trim();
    const updated = await apiRequest('/api/me', {
      method: 'PATCH',
      auth: true,
      body: { name, phone }
    });

    const session = getSession();
    if (session) {
      setSession({
        ...session,
        user: {
          ...session.user,
          name: updated.name,
          phone: updated.phone
        }
      });
    }
    setMessage('customerProfileMessage', 'Perfil actualizado correctamente.');
    renderSidebar();
  });

  bindSimpleForm('customerPasswordForm', async () => {
    clearMessage('customerPasswordMessage');
    const currentPassword = document.getElementById('customerCurrentPassword')?.value || '';
    const newPassword = document.getElementById('customerNewPassword')?.value || '';
    const confirmPassword = document.getElementById('customerConfirmPassword')?.value || '';

    if (newPassword !== confirmPassword) {
      throw new Error('Las nuevas contrasenas no coinciden.');
    }

    const response = await apiRequest('/api/me/password', {
      method: 'PATCH',
      auth: true,
      body: { currentPassword, newPassword }
    });

    document.getElementById('customerPasswordForm')?.reset();
    const statusMessage =
      response.mailStatus === 'enviado'
        ? 'Contrasena actualizada y notificacion enviada a tu correo.'
        : response.mailStatus === 'simulado'
          ? 'Contrasena actualizada. El correo esta en modo de simulacion hasta que configures SMTP.'
          : 'Contrasena actualizada correctamente.';
    setMessage('customerPasswordMessage', statusMessage);
  });
}

function renderAgentBookings() {
  const tbody = document.getElementById('agentBookingsTable');
  if (!tbody) return;

  const search = document.getElementById('agentSearch')?.value.trim().toLowerCase() || '';
  const statusFilter = document.getElementById('agentStatusFilter')?.value || 'todos';

  const filtered = agentBookingsCache.filter((booking) => {
    const byStatus = statusFilter === 'todos' || booking.status === statusFilter;
    const haystack = `${booking.customerName || ''} ${booking.carName || ''}`.toLowerCase();
    const bySearch = !search || haystack.includes(search);
    return byStatus && bySearch;
  });

  tbody.innerHTML = filtered.length
    ? filtered
        .map((booking) => {
          const status = mapStatus(booking.status);
          const options = BOOKING_STATUSES.map(
            (value) =>
              `<option value="${value}" ${value === booking.status ? 'selected' : ''}>${mapStatus(value).label}</option>`
          ).join('');

          return `
            <tr>
              <td>#${booking.id}</td>
              <td>${escapeHtml(booking.customerName || '-')}</td>
              <td>${escapeHtml(booking.carName || '-')}</td>
              <td>${formatDate(booking.startDate)}</td>
              <td>${formatDate(booking.endDate)}</td>
              <td>${formatCurrency(booking.total)}</td>
              <td><span class="status-chip ${status.className}">${status.label}</span></td>
              <td>
                <div class="inline-controls">
                  <select data-status-select="${booking.id}">${options}</select>
                  <input type="text" data-note-input="${booking.id}" placeholder="Nota corta" value="${escapeHtml(
                    booking.agentNote || ''
                  )}">
                  <button class="btn-ghost" data-status-save="${booking.id}">Guardar</button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('')
    : '<tr><td colspan="8" class="empty-state">No hay reservas para ese filtro.</td></tr>';

  const stats = document.getElementById('agentStats');
  if (stats) {
    const confirmed = agentBookingsCache.filter((booking) => booking.status === 'confirmada').length;
    const inProgress = agentBookingsCache.filter((booking) => booking.status === 'en_curso').length;
    const completed = agentBookingsCache.filter((booking) => booking.status === 'completada').length;
    const canceled = agentBookingsCache.filter((booking) => booking.status === 'cancelada').length;

    stats.innerHTML = `
      <div><strong>${confirmed}</strong><span>Confirmadas</span></div>
      <div><strong>${inProgress}</strong><span>En curso</span></div>
      <div><strong>${completed}</strong><span>Completadas</span></div>
      <div><strong>${canceled}</strong><span>Canceladas</span></div>
    `;
  }
}

async function initAgentPage() {
  if (!requireAuth() || !requireRole(['agent', 'admin'])) return;

  agentBookingsCache = await apiRequest('/api/agent/bookings', { auth: true });
  renderAgentBookings();

  const search = document.getElementById('agentSearch');
  const status = document.getElementById('agentStatusFilter');
  if (search) search.addEventListener('input', renderAgentBookings);
  if (status) status.addEventListener('change', renderAgentBookings);

  const table = document.getElementById('agentBookingsTable');
  if (table) {
    table.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-status-save]');
      if (!button) return;

      const bookingId = Number(button.getAttribute('data-status-save'));
      const statusSelect = document.querySelector(`[data-status-select="${bookingId}"]`);
      const noteInput = document.querySelector(`[data-note-input="${bookingId}"]`);

      try {
        await apiRequest(`/api/agent/bookings/${bookingId}/status`, {
          method: 'PATCH',
          auth: true,
          body: {
            status: statusSelect?.value,
            agentNote: noteInput?.value.trim() || ''
          }
        });
        agentBookingsCache = await apiRequest('/api/agent/bookings', { auth: true });
        renderAgentBookings();
      } catch (error) {
        alert(error.message);
      }
    });
  }
}

function renderAdminUsers() {
  const table = document.getElementById('usersTable');
  if (!table) return;

  const search = document.getElementById('adminUserSearch')?.value.trim().toLowerCase() || '';
  const rows = adminDataCache.users.filter((user) => {
    const haystack = `${user.name || ''} ${user.email || ''} ${user.role || ''}`.toLowerCase();
    return !search || haystack.includes(search);
  });

  table.innerHTML = rows.length
    ? rows
        .map(
          (user) => `
            <tr>
              <td>${escapeHtml(user.name)}</td>
              <td>${escapeHtml(user.email)}</td>
              <td>${escapeHtml(user.phone || '-')}</td>
              <td><span class="status-chip">${escapeHtml(user.role)}</span></td>
            </tr>
          `
        )
        .join('')
    : '<tr><td colspan="4" class="empty-state">No hay usuarios para ese filtro.</td></tr>';
}

function renderAdminBookings() {
  const table = document.getElementById('bookingsTable');
  if (!table) return;

  const search = document.getElementById('adminBookingSearch')?.value.trim().toLowerCase() || '';
  const rows = adminDataCache.bookings.filter((booking) => {
    const haystack = `${booking.customerName || ''} ${booking.carName || ''} ${booking.status || ''}`.toLowerCase();
    return !search || haystack.includes(search);
  });

  table.innerHTML = rows.length
    ? rows
        .map((booking) => {
          const status = mapStatus(booking.status);
          return `
            <tr>
              <td>#${booking.id}</td>
              <td>${escapeHtml(booking.customerName || '-')}</td>
              <td>${escapeHtml(booking.carName || '-')}</td>
              <td>${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}</td>
              <td>${booking.paymentLast4 ? `**** ${escapeHtml(booking.paymentLast4)}` : '-'}</td>
              <td>${formatCurrency(booking.total)}</td>
              <td><span class="status-chip ${status.className}">${status.label}</span></td>
            </tr>
          `;
        })
        .join('')
    : '<tr><td colspan="7" class="empty-state">No hay reservas para ese filtro.</td></tr>';
}

function renderAdminInquiries() {
  const table = document.getElementById('inquiriesTable');
  if (!table) return;

  const search = document.getElementById('adminInquirySearch')?.value.trim().toLowerCase() || '';
  const rows = adminDataCache.inquiries.filter((inquiry) => {
    const haystack = `${inquiry.name || ''} ${inquiry.email || ''} ${inquiry.subject || ''} ${inquiry.message || ''}`.toLowerCase();
    return !search || haystack.includes(search);
  });

  table.innerHTML = rows.length
    ? rows
        .map(
          (inquiry) => `
            <tr>
              <td>${escapeHtml(inquiry.name)}</td>
              <td>${escapeHtml(inquiry.email)}</td>
              <td>${escapeHtml(inquiry.subject || '-')}</td>
              <td>${escapeHtml(inquiry.message)}</td>
              <td><span class="status-chip">${escapeHtml(inquiry.mailStatus || 'pendiente')}</span></td>
            </tr>
          `
        )
        .join('')
    : '<tr><td colspan="5" class="empty-state">No hay consultas para ese filtro.</td></tr>';
}

function fillAdminCarForm(car) {
  document.getElementById('adminCarName').value = car?.name || '';
  document.getElementById('adminCarBrand').value = car?.brand || '';
  document.getElementById('adminCarModel').value = car?.model || '';
  document.getElementById('adminCarYear').value = car?.year || '';
  document.getElementById('adminCarCategory').value = car?.category || '';
  document.getElementById('adminCarTransmission').value = car?.transmission || '';
  document.getElementById('adminCarFuel').value = car?.fuel || '';
  document.getElementById('adminCarSeats').value = car?.seats || '';
  document.getElementById('adminCarLuggage').value = car?.luggage || '';
  document.getElementById('adminCarLocation').value = car?.location || '';
  document.getElementById('adminCarPrice').value = car?.pricePerDay || '';
  document.getElementById('adminCarRating').value = car?.rating || 4.5;
  document.getElementById('adminCarImage').value = car?.image || '';
  document.getElementById('adminCarFeatures').value = Array.isArray(car?.features)
    ? car.features.join(', ')
    : car?.features || '';
  document.getElementById('adminCarDescription').value = car?.description || '';
  document.getElementById('adminCarActive').value = car?.active === 0 ? '0' : '1';
}

function setAdminCarFormMode(car = null) {
  const title = document.getElementById('adminCarFormTitle');
  const hint = document.getElementById('adminCarFormHint');
  const submitBtn = document.getElementById('adminCarSubmitBtn');
  const cancelBtn = document.getElementById('adminCarCancelEditBtn');

  adminEditingCarId = car?.id || null;
  if (car) {
    if (title) title.textContent = `Editar vehiculo #${car.id}`;
    if (hint) hint.textContent = 'Actualiza la informacion del vehiculo seleccionado y guarda los cambios.';
    if (submitBtn) submitBtn.textContent = 'Actualizar vehiculo';
    if (cancelBtn) cancelBtn.classList.remove('hidden');
    fillAdminCarForm(car);
    document.getElementById('adminCarFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  if (title) title.textContent = 'Agregar vehiculo';
  if (hint) hint.textContent = 'Crea un vehiculo nuevo o carga uno desde la tabla para editarlo.';
  if (submitBtn) submitBtn.textContent = 'Guardar vehiculo';
  if (cancelBtn) cancelBtn.classList.add('hidden');
  document.getElementById('adminCreateCarForm')?.reset();
  const activeField = document.getElementById('adminCarActive');
  if (activeField) activeField.value = '1';
}

function getAdminCarFormPayload() {
  return {
    name: document.getElementById('adminCarName')?.value.trim(),
    brand: document.getElementById('adminCarBrand')?.value.trim(),
    model: document.getElementById('adminCarModel')?.value.trim(),
    year: Number(document.getElementById('adminCarYear')?.value),
    category: document.getElementById('adminCarCategory')?.value.trim(),
    transmission: document.getElementById('adminCarTransmission')?.value.trim(),
    fuel: document.getElementById('adminCarFuel')?.value.trim(),
    seats: Number(document.getElementById('adminCarSeats')?.value),
    luggage: Number(document.getElementById('adminCarLuggage')?.value),
    location: document.getElementById('adminCarLocation')?.value.trim(),
    pricePerDay: Number(document.getElementById('adminCarPrice')?.value),
    rating: Number(document.getElementById('adminCarRating')?.value || 4.5),
    image: document.getElementById('adminCarImage')?.value.trim(),
    description: document.getElementById('adminCarDescription')?.value.trim(),
    features: document.getElementById('adminCarFeatures')?.value.trim(),
    active: Number(document.getElementById('adminCarActive')?.value || 1)
  };
}

function renderAdminCars() {
  const table = document.getElementById('adminCarsTable');
  if (!table) return;

  const search = document.getElementById('adminCarSearch')?.value.trim().toLowerCase() || '';
  const rows = adminDataCache.cars.filter((car) => {
    const haystack = `${car.name || ''} ${car.brand || ''} ${car.category || ''} ${car.location || ''}`.toLowerCase();
    return !search || haystack.includes(search);
  });

  table.innerHTML = rows.length
    ? rows
        .map(
          (car) => `
            <tr>
              <td>${escapeHtml(car.name)}</td>
              <td>${escapeHtml(car.brand)} ${escapeHtml(car.model)}</td>
              <td>${escapeHtml(String(car.year || '-'))} / ${escapeHtml(car.category || '-')}</td>
              <td>${escapeHtml(car.location)}</td>
              <td>${formatCurrency(car.pricePerDay)}</td>
              <td><span class="status-chip ${car.active ? 'confirmada' : 'cancelada'}">${car.active ? 'Activo' : 'Inactivo'}</span></td>
              <td>
                <div class="table-actions">
                  <button class="btn-ghost btn-compact" type="button" data-edit-car="${car.id}">Editar</button>
                  <button class="btn-ghost btn-compact" type="button" data-toggle-car="${car.id}" data-current-active="${car.active}">
                    ${car.active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </td>
            </tr>
          `
        )
        .join('')
    : '<tr><td colspan="7" class="empty-state">No hay vehiculos para ese filtro.</td></tr>';
}

function renderAdminStats() {
  const stats = document.getElementById('adminStats');
  if (!stats || !adminDataCache.stats) return;
  const { users, cars, bookings, inquiries, revenue } = adminDataCache.stats;
  stats.innerHTML = `
    <div><strong>${users}</strong><span>Usuarios activos</span></div>
    <div><strong>${cars}</strong><span>Vehiculos activos</span></div>
    <div><strong>${bookings}</strong><span>Reservas</span></div>
    <div><strong>${inquiries}</strong><span>Consultas</span></div>
    <div><strong>${formatCurrency(revenue)}</strong><span>Ingresos</span></div>
  `;
}

async function reloadAdminData() {
  const [stats, users, bookings, inquiries, cars] = await Promise.all([
    apiRequest('/api/admin/stats', { auth: true }),
    apiRequest('/api/admin/users', { auth: true }),
    apiRequest('/api/admin/bookings', { auth: true }),
    apiRequest('/api/admin/inquiries', { auth: true }),
    apiRequest('/api/admin/cars', { auth: true })
  ]);

  adminDataCache = { stats, users, bookings, inquiries, cars };
  renderAdminStats();
  renderAdminUsers();
  renderAdminBookings();
  renderAdminInquiries();
  renderAdminCars();

  const editingCar = adminDataCache.cars.find((car) => car.id === adminEditingCarId);
  if (editingCar) {
    fillAdminCarForm(editingCar);
  } else if (adminEditingCarId) {
    setAdminCarFormMode();
  }
}

async function initAdminPage() {
  if (!requireAuth() || !requireRole(['admin'])) return;

  await reloadAdminData();
  setAdminCarFormMode();

  ['adminUserSearch', 'adminBookingSearch', 'adminInquirySearch', 'adminCarSearch'].forEach((id) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.addEventListener('input', () => {
      renderAdminUsers();
      renderAdminBookings();
      renderAdminInquiries();
      renderAdminCars();
    });
  });

  bindSimpleForm('adminCreateUserForm', async () => {
    clearMessage('adminCreateUserMessage');
    const name = document.getElementById('adminUserName')?.value.trim();
    const email = document.getElementById('adminUserEmail')?.value.trim();
    const phone = document.getElementById('adminUserPhone')?.value.trim();
    const password = document.getElementById('adminUserPassword')?.value;
    const role = document.getElementById('adminUserRole')?.value;

    await apiRequest('/api/admin/users', {
      method: 'POST',
      auth: true,
      body: { name, email, phone, password, role }
    });
    document.getElementById('adminCreateUserForm')?.reset();
    setMessage('adminCreateUserMessage', 'Usuario creado correctamente.');
    await reloadAdminData();
  });

  bindSimpleForm('adminCreateCarForm', async () => {
    clearMessage('adminCreateCarMessage');
    const payload = getAdminCarFormPayload();
    const isEditing = Number.isInteger(adminEditingCarId);

    await apiRequest(isEditing ? `/api/admin/cars/${adminEditingCarId}` : '/api/admin/cars', {
      method: isEditing ? 'PATCH' : 'POST',
      auth: true,
      body: payload
    });
    setAdminCarFormMode();
    setMessage('adminCreateCarMessage', isEditing ? 'Vehiculo actualizado correctamente.' : 'Vehiculo creado correctamente.');
    await reloadAdminData();
  });

  const cancelEditBtn = document.getElementById('adminCarCancelEditBtn');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      clearMessage('adminCreateCarMessage');
      setAdminCarFormMode();
    });
  }

  const carsTable = document.getElementById('adminCarsTable');
  if (carsTable) {
    carsTable.addEventListener('click', async (event) => {
      const editButton = event.target.closest('[data-edit-car]');
      if (editButton) {
        const carId = Number(editButton.getAttribute('data-edit-car'));
        const car = adminDataCache.cars.find((item) => item.id === carId);
        if (car) {
          clearMessage('adminCreateCarMessage');
          setAdminCarFormMode(car);
        }
        return;
      }

      const button = event.target.closest('[data-toggle-car]');
      if (!button) return;
      const carId = Number(button.getAttribute('data-toggle-car'));
      const currentActive = Number(button.getAttribute('data-current-active')) === 1 ? 1 : 0;
      try {
        await apiRequest(`/api/admin/cars/${carId}`, {
          method: 'PATCH',
          auth: true,
          body: { active: currentActive ? 0 : 1 }
        });
        await reloadAdminData();
      } catch (error) {
        alert(error.message);
      }
    });
  }
}

async function initContactPage() {
  bindSimpleForm('contactForm', async () => {
    clearMessage('contactSuccess');
    const name = document.getElementById('contactName')?.value.trim();
    const email = document.getElementById('contactEmail')?.value.trim();
    const subject = document.getElementById('contactSubject')?.value.trim() || 'Consulta general';
    const message = document.getElementById('contactMessage')?.value.trim();

    const response = await apiRequest('/api/inquiries', {
      method: 'POST',
      body: { name, email, subject, message }
    });

    document.getElementById('contactForm')?.reset();
    setMessage('contactSuccess', `${describeMailStatus(response.mailStatus)} Destino principal: ${response.mailTo}.`);
  });
}

async function initPage() {
  initThemeToggle();
  renderSidebar();

  const page = document.body.dataset.page || '';
  const user = getCurrentUser();

  if (page === 'login' && user) {
    window.location.href = getHomeByRole(user.role);
    return;
  }

  if (page === 'register' && user) {
    window.location.href = getHomeByRole(user.role);
    return;
  }

  try {
    switch (page) {
      case 'login':
        await initLoginPage();
        break;
      case 'register':
        await initRegisterPage();
        break;
      case 'forgot':
        await initForgotPasswordPage();
        break;
      case 'reset-password':
        await initResetPasswordPage();
        break;
      case 'dashboard':
        await initDashboardPage();
        break;
      case 'catalog':
        await initCatalogPage();
        break;
      case 'details':
        await initCarDetailsPage();
        break;
      case 'checkout':
        await initCheckoutPage();
        break;
      case 'customer':
        await initCustomerPage();
        break;
      case 'agent':
        await initAgentPage();
        break;
      case 'admin':
        await initAdminPage();
        break;
      case 'contact':
        await initContactPage();
        break;
      default:
        break;
    }
  } catch (error) {
    alert(error.message || 'Ocurrio un error al cargar la pagina.');
  }
}

document.addEventListener('DOMContentLoaded', initPage);
