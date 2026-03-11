# Dealer-RentCar

Proyecto Final de ING SOFTWARE 2.

## Novedades implementadas
- Backend con **Express + SQLite** (`backend/server.js`) con base de datos SQL real.
- Seguridad: `helmet`, `rate-limit`, JWT, hash de contraseñas con `bcryptjs`, validaciones y autorización por rol.
- Roles con páginas separadas: `admin.html`, `customer.html`, `agent.html`.
- Catálogo completo en `catalog.html` integrado con API.
- Checkout actualizado con cálculo de total por día + cargo de servicio + impuestos.

## Ejecutar proyecto completo
```bash
npm install
npm run start
```
Backend: `http://localhost:3000`

Para abrir las páginas estáticas (frontend):
```bash
npm run serve
```
Frontend: `http://localhost:8000`

## Credenciales admin demo
- Usuario: `admin@rentcar.com`
- Contraseña: `Admin123*`

## Documentación
- Estado actual del sistema: `docs/ESTADO_ACTUAL_SISTEMA.md`
- Script SQL base: `backend/schema.sql`
