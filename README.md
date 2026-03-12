# Dealer-RentCar

Proyecto Final de ING SOFTWARE 2.

## Ejecución rápida
```bash
npm start
# o
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


## Nota de merge
Esta rama utiliza **solo frontend con localStorage**.
No requiere backend Node/SQL para ejecutar.

## Solución al error `ERR_CONNECTION_REFUSED` en `localhost:3000`
Este proyecto corre en modo **localStorage** y no necesita backend en puerto 3000.
Si ves solicitudes a `localhost:3000`, es caché del navegador de una versión anterior.
Pasos:
1. Haz recarga forzada (`Ctrl+F5` / `Cmd+Shift+R`).
2. Limpia caché del sitio si persiste.
3. Abre nuevamente `http://localhost:8000/index.html`.

## Documentación
- Estado actual del sistema: `docs/ESTADO_ACTUAL_SISTEMA.md`
