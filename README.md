# Dealer-RentCar

Proyecto Final de ING SOFTWARE 2.

## Estado actual (ajustado)
- Se mantienen las páginas nuevas por rol: `admin.html`, `customer.html`, `agent.html`.
- Se mantiene `catalog.html` como catálogo principal.
- El proyecto vuelve a trabajar con **`localStorage`** (sin backend SQL) para usuarios, autos, reservas y consultas.
- Checkout conserva la mejora de cálculo: **subtotal por días + cargo de servicio + ITBIS**.

## Ejecutar
```bash
npm run serve
```
Abrir: `http://localhost:8000/index.html`

Credenciales admin demo:
- Usuario: `admin@rentcar.com`
- Contraseña: `Admin123*`

## Recomendación de base de datos (alternativa)
Si quieres algo más robusto que `localStorage` sin complicarte mucho:
1. **Supabase (PostgreSQL + Auth + API)**: rápida para proyectos web y roles.
2. **Firebase Firestore**: buena para tiempo real y despliegue rápido.
3. **SQLite + backend ligero (Express)**: ideal para entorno local / MVP en servidor único.

Para este proyecto, la mejor ruta práctica suele ser **Supabase** por facilidad en autenticación y escalabilidad inicial.

## Documentación
- Estado actual del sistema: `docs/ESTADO_ACTUAL_SISTEMA.md`
