# Dealer-RentCar (RentCar Express)

Proyecto web de renta de vehiculos con:
- Frontend multipagina (HTML + CSS + JS).
- Backend local con Express.
- Base de datos SQL real con SQLite.
- Control por roles: `admin`, `agent`, `customer`.

## Arquitectura actual

- `backend/server.js`: API REST, seguridad (helmet, rate limit, JWT, bcrypt), roles y reglas de negocio.
- `backend/schema.sql`: modelo SQL base.
- `backend/rentcar.sqlite`: base local generada automaticamente al iniciar.
- `app.js`: cliente frontend conectado a la API (sin persistencia de negocio en `localStorage`).
- `*.html`: pantallas por modulo (auth, catalogo, checkout, contacto, paneles por rol).
- `style.css`: tema visual unificado (mantiene paleta principal naranja del diseno anterior).

## Modulos funcionales

- Autenticacion: login, registro, recuperar y restablecer contrasena.
- Cambio de contrasena autenticado desde el portal del cliente.
- Catalogo y detalle de vehiculos con filtros avanzados.
- Checkout y reserva con calculo de subtotal, servicio, impuestos y total.
- Portal cliente: perfil, historial de reservas y descarga de facturas PDF.
- Portal agente: seguimiento operativo y cambio de estado de reservas.
- Portal admin: gestion de usuarios, reservas, consultas y flota de vehiculos con edicion completa de datos.
- Correos SMTP reales para contacto, recuperacion de contrasena y notificaciones de seguridad.

## Ejecutar localmente

1. Instalar dependencias:

```bash
npm install
```

2. Crear un archivo `.env` a partir de `.env.example` y completar tus credenciales SMTP reales:

```bash
copy .env.example .env
```

3. Iniciar backend SQL (API en `http://localhost:3000`):

```bash
npm run start
```

4. En otra terminal, servir frontend estatico (sitio en `http://localhost:8000`):

```bash
npm run serve
```

## Credenciales demo

- Admin principal: `normarcampos03@gmail.com` (si no recuerdas la clave, usa recuperacion por correo)
- Agente: `normarcampos03+agente@gmail.com` / `Empleado123*`
- Cliente: `cliente@rentcar.com` / `Cliente123*`

## Endpoints clave

- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password`
- Perfil: `/api/me`, `/api/me/password`
- Catalogo: `/api/cars`, `/api/cars/:id`
- Reservas cliente: `/api/bookings`, `/api/bookings/me`, `/api/bookings/:id/invoice`
- Operacion agente: `/api/agent/bookings`, `/api/agent/bookings/:id/status`
- Admin: `/api/admin/stats`, `/api/admin/users`, `/api/admin/bookings`, `/api/admin/inquiries`, `/api/admin/cars`
- Soporte: `/api/inquiries`

## Notas

- Si no configuras SMTP, los correos se simulan en consola del backend.
- `SUPPORT_INBOX_EMAIL` ya apunta a `normarcampos03@gmail.com`.
- El agente demo usa `normarcampos03+agente@gmail.com`, que entra al mismo inbox de Gmail.
- El flujo `Olvide mi contrasena` envia el enlace al correo del propio usuario registrado.
- Para Gmail suele ser necesario usar un App Password en `SMTP_PASS`.
- La API usa CORS abierto para facilitar el desarrollo local.
- El frontend toma la URL de API desde `localStorage.rentcar_api_url` (por defecto `http://localhost:3000`).
