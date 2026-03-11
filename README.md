# Dealer-RentCar

Proyecto Final de ING SOFTWARE 2.

## Ejecución rápida
```bash
npm run serve
```
Abrir: `http://localhost:8000/index.html`

## Estado funcional actual
- Persistencia local con `localStorage` para usuarios, autos, reservas y consultas.
- Páginas por rol disponibles: `admin.html`, `agent.html`, `customer.html`.
- Catálogo central en `catalog.html`.
- Checkout con cálculo por día: subtotal + cargo de servicio + ITBIS.

Credenciales demo admin:
- Usuario: `admin@rentcar.com`
- Contraseña: `Admin123*`

## Alternativa recomendada de base de datos
Si quieres migrar desde `localStorage`, recomiendo **Supabase (PostgreSQL + Auth + API)** por equilibrio entre facilidad y escalabilidad.

## Documentación
- Estado actual del sistema: `docs/ESTADO_ACTUAL_SISTEMA.md`
