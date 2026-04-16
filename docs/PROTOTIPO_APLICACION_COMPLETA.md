# Prototipo de la aplicación completa (Dealer-RentCar)

> Documento de diseño funcional para cubrir el entregable solicitado:
> - **NORMAR:** menú principal y módulos.
> - **NORMAR:** todas las entradas del sistema (pantallas de captura).
> - **NORMAR:** todas las salidas del sistema (pantallas de resultado).

---

## 1) Alcance del prototipo

Este prototipo describe la aplicación completa de alquiler de autos con enfoque en:
1. Navegación principal.
2. Módulos por rol (cliente, agente y administrador).
3. Pantallas de entrada (formularios/captura de datos).
4. Pantallas de salida (confirmaciones, listados, reportes y estados).

No define estilos visuales finales (colores tipografía), sino **estructura funcional y flujo de pantallas**.

---

## 2) Menú principal de la aplicación (**NORMAR**)

## 2.1 Menú público (sin iniciar sesión)

1. **Inicio** (`index.html`)
2. **Catálogo** (`catalog.html`)
3. **Detalle de vehículo** (`car-details.html`)
4. **Contacto** (`contact.html`)
5. **Registro** (`register.html`)
6. **Ingreso / Recuperar contraseña** (`forgot-password.html`)

### Wireframe rápido del menú público

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ RentCar Express | Inicio | Catálogo | Contacto | Registrarse | Ingresar    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Banner principal                                                           │
│ [Buscar vehículo] [Fecha inicio] [Fecha fin] [Sucursal] [Botón Buscar]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Menú privado por rol

### A) Cliente (`customer.html` + `dashboard.html`)
1. Dashboard
2. Reservar vehículo
3. Mis reservas
4. Mi perfil
5. Soporte / Contacto
6. Cerrar sesión

### B) Agente (`agent.html`)
1. Panel de operaciones
2. Gestión de reservas
3. Entrega/recepción de vehículos
4. Clientes atendidos
5. Incidencias
6. Cerrar sesión

### C) Administrador (`admin.html`)
1. Dashboard administrativo
2. Gestión de vehículos
3. Gestión de usuarios
4. Gestión de tarifas
5. Reportes y métricas
6. Configuración del sistema
7. Cerrar sesión

### Wireframe rápido del menú privado

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ RentCar Express - Panel [Rol] | Dashboard | Módulos | Reportes | Salir     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Menú lateral:                                                              │
│  • Inicio                                                                  │
│  • Reservas                                                                │
│  • Vehículos                                                               │
│  • Usuarios (solo admin)                                                   │
│  • Configuración                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3) Módulos de la aplicación (vista global)

1. **Autenticación y cuentas**
   - Registro, login, recuperación de contraseña, cierre de sesión.
2. **Catálogo y búsqueda de vehículos**
   - Listado, filtros, detalles, disponibilidad.
3. **Reserva y checkout**
   - Fechas, selección, datos del conductor, resumen de costos.
4. **Gestión de clientes**
   - Perfil, historial, preferencias.
5. **Operación de agencia**
   - Entrega/devolución, validación documental, incidencias.
6. **Administración**
   - Vehículos, usuarios, tarifas, estados de reserva.
7. **Reportes y salidas analíticas**
   - Ventas, ocupación, reservas por periodo, alertas.
8. **Atención y contacto**
   - Formulario de contacto, estado de solicitudes.

---

## 4) Todas las entradas del sistema (pantallas de captura) (**NORMAR**)

> **Entrada** = pantalla donde el usuario o personal ingresa datos al sistema.

| ID | Pantalla (archivo base) | Rol | Datos de entrada principales | Validaciones clave |
|---|---|---|---|---|
| EN-01 | Registro (`register.html`) | Público | Nombre, correo, teléfono, contraseña, confirmación | Correo único, contraseña segura, campos obligatorios |
| EN-02 | Inicio de sesión / Recuperación (`forgot-password.html`) | Público | Correo, contraseña / correo de recuperación | Formato correo, credenciales válidas |
| EN-03 | Búsqueda en inicio (`index.html`) | Público | Fecha inicio, fecha fin, ciudad/sucursal, categoría | Fechas válidas, fin > inicio |
| EN-04 | Filtros catálogo (`catalog.html`) | Público/Cliente | Marca, tipo, transmisión, precio, capacidad | Rango de precio y disponibilidad |
| EN-05 | Checkout reserva (`checkout.html`) | Cliente | Datos conductor, método pago, observaciones | Campos obligatorios, fecha, cálculo total |
| EN-06 | Contacto (`contact.html`) | Público/Cliente | Nombre, correo, asunto, mensaje | Longitud mínima, correo válido |
| EN-07 | Perfil de cliente (`customer.html`) | Cliente | Dirección, licencia, teléfono, preferencias | Formatos y consistencia de datos |
| EN-08 | Gestión de reservas (`agent.html`) | Agente | Estado reserva, notas, hora entrega/devolución | Estados permitidos y trazabilidad |
| EN-09 | Gestión de vehículos (`admin.html`) | Admin | Placa, marca, modelo, tarifa, estado, imagen | Placa única, tarifa numérica, estado válido |
| EN-10 | Gestión de usuarios (`admin.html`) | Admin | Rol, estado, permisos, datos básicos | Reglas por rol y permisos |
| EN-11 | Parámetros de negocio (`admin.html`) | Admin | Impuesto, seguro, cargos extra, políticas | Valores positivos y vigencias |

### Wireframe genérico de pantalla de entrada

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Título de pantalla de captura                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Campo 1: [____________________]                                             │
│ Campo 2: [____________________]                                             │
│ Campo 3: [________]  Campo 4: [_____]                                       │
│ Observaciones: [__________________________________________]                 │
│                                                                             │
│ [Cancelar]                                  [Guardar / Confirmar]           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5) Todas las salidas del sistema (pantallas de resultado) (**NORMAR**)

> **Salida** = pantalla donde el sistema muestra resultados, confirmaciones, estados o reportes.

| ID | Pantalla de salida | Se origina desde | Resultado mostrado |
|---|---|---|---|
| SA-01 | Confirmación de registro | Registro | Mensaje de éxito + redirección a login |
| SA-02 | Error de autenticación | Login | Mensaje de credenciales incorrectas |
| SA-03 | Listado de vehículos disponibles | Búsqueda/Catálogo | Tarjetas con precio, disponibilidad y botón reservar |
| SA-04 | Detalle de vehículo (`car-details.html`) | Catálogo | Características, fotos, condiciones y tarifa diaria |
| SA-05 | Resumen de costos (`checkout.html`) | Checkout | Subtotal, impuesto, servicio, total final |
| SA-06 | Confirmación de reserva | Checkout | Código de reserva, fechas, monto y estado inicial |
| SA-07 | Historial de reservas (`dashboard.html` / `customer.html`) | Módulo cliente | Tabla de reservas con estado (activa, completada, cancelada) |
| SA-08 | Resultado de contacto | Contacto | Ticket de solicitud y mensaje de recepción |
| SA-09 | Tablero operativo agente (`agent.html`) | Módulo agente | Reservas del día, entregas pendientes, incidencias |
| SA-10 | Reportes administrativos (`admin.html`) | Módulo admin | KPIs: ingresos, ocupación, top vehículos, cancelaciones |
| SA-11 | Alertas del sistema | Todos los módulos | Mensajes de éxito, advertencia y error en contexto |

### Wireframe genérico de pantalla de salida

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Resultado / Confirmación                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Estado: ✔ Operación completada                                              │
│ Código: RSV-2026-000245                                                     │
│ Detalle: Reserva confirmada del 20/04/2026 al 23/04/2026                   │
│ Total: $245.00                                                              │
│                                                                             │
│ [Ver detalle]                              [Volver al panel]                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6) Mapa de navegación completo del prototipo

```text
Inicio ─┬─> Catálogo ──> Detalle vehículo ──> Checkout ──> Confirmación reserva
        ├─> Registro ──> Login ──> Dashboard Cliente ──> Mis reservas
        ├─> Contacto ──> Ticket generado
        └─> Login rol Agente/Admin ──> Panel de rol ──> Gestión/Reportes
```

---

## 7) Recomendación para presentación académica

Para presentar el prototipo completo en clase o entrega:
1. Mostrar primero el **menú principal** y el **mapa de módulos**.
2. Recorrer una historia de usuario completa:
   - Buscar auto -> ver detalle -> reservar -> ver confirmación.
3. Explicar la trazabilidad:
   - Cada **entrada** tiene al menos una **salida** correspondiente.
4. Cerrar con los paneles por rol (cliente, agente, admin) para demostrar cobertura total.

---

## 8) Checklist de cumplimiento del requerimiento

- [x] **NORMAR:** menú principal y módulos de la aplicación.
- [x] **NORMAR:** todas las entradas del sistema representadas como pantallas.
- [x] **NORMAR:** todas las salidas del sistema representadas como pantallas.

