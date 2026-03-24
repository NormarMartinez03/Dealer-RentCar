# Métricas de Usabilidad

## 1) Objetivo
Este documento define las métricas clave para evaluar la usabilidad del sistema **Dealer RentCar**, con foco en medir qué tan fácil, rápido y satisfactorio es para una persona completar tareas críticas (registrarse, buscar autos y finalizar una reserva).

## 2) Principios de medición
- **Efectividad:** si las personas logran completar una tarea.
- **Eficiencia:** cuánto esfuerzo y tiempo requiere completar esa tarea.
- **Satisfacción:** cómo perciben la experiencia.

## 3) Métricas principales (KPIs)

| Métrica | Qué mide | Fórmula / Cálculo | Meta sugerida | Frecuencia |
|---|---|---|---|---|
| Tasa de Éxito de Tarea (Task Success Rate) | Porcentaje de usuarios que completan una tarea sin abandono | (Tareas completadas / Tareas iniciadas) x 100 | >= 90% en tareas críticas | Semanal |
| Tiempo Promedio por Tarea (Time on Task) | Rapidez de ejecución de una tarea | Promedio de segundos desde inicio hasta finalización | <= 3 min en checkout | Semanal |
| Tasa de Error | Frecuencia de errores cometidos por tarea | (Errores / Intentos) x 100 | <= 5% en formularios | Semanal |
| Tasa de Abandono en Checkout | Usuarios que no completan el flujo de pago | (Checkouts abandonados / Checkouts iniciados) x 100 | <= 25% | Diario |
| Conversión de Reserva | Eficacia del flujo comercial | (Reservas confirmadas / Sesiones con intención) x 100 | >= 8% | Diario |
| CSAT (Satisfacción) | Nivel de satisfacción inmediata | Promedio encuesta 1-5 (o 1-10) | >= 4/5 | Mensual |
| SUS (System Usability Scale) | Índice estándar de usabilidad percibida | Cuestionario SUS (0-100) | >= 80 | Trimestral |
| NPS (Net Promoter Score) | Lealtad/recomendación | % Promotores - % Detractores | >= 30 | Trimestral |

## 4) Tareas críticas a evaluar
1. **Registro e inicio de sesión** (register.html, forgot-password.html).
2. **Búsqueda y exploración de catálogo** (catalog.html, car-details.html).
3. **Proceso de reserva y checkout** (checkout.html).
4. **Gestión de perfil y panel de usuario** (dashboard.html).
5. **Canales de contacto** (contact.html).

## 5) Instrumentación mínima recomendada
Para medir las métricas anteriores, registrar eventos con marca de tiempo y contexto:
- `view_page` (página, usuario anónimo/autenticado).
- `start_task` (task_id, origen).
- `task_step` (paso, validación, error).
- `task_completed` (task_id, duración).
- `task_abandoned` (task_id, paso final alcanzado).
- `form_error` (campo, tipo_error).
- `reservation_confirmed` (id_reserva, valor_total).
- `checkout_started` / `checkout_completed`.
- `csat_submitted`, `sus_submitted`, `nps_submitted`.

## 6) Segmentación recomendada
Analizar resultados por:
- Tipo de dispositivo (móvil, tablet, desktop).
- Navegador y sistema operativo.
- Usuario nuevo vs. recurrente.
- Fuente de tráfico (orgánico, pago, referidos).
- País/idioma (si aplica).

## 7) Umbrales de alerta operativa
Definir alertas cuando:
- La tasa de éxito de una tarea crítica caiga **>10%** respecto al promedio de las últimas 4 semanas.
- El tiempo de checkout aumente **>20%** en una semana.
- La tasa de error en formularios supere **8%** por 3 días consecutivos.
- El CSAT mensual baje de **3.8/5**.

## 8) Plantilla de reporte mensual
- **Resumen ejecutivo:** principales mejoras/empeoramientos.
- **KPIs clave:** comparación mes actual vs mes anterior.
- **Top 5 fricciones detectadas:** pantallas, pasos y errores más frecuentes.
- **Acciones priorizadas:** quick wins (2 semanas) y mejoras estructurales (1-2 meses).
- **Evidencia:** capturas, mapas de calor, comentarios de usuarios, grabaciones.

## 9) Plan de mejora continua
1. Medir línea base (primer mes).
2. Priorizar 3 fricciones de mayor impacto.
3. Implementar mejoras con hipótesis claras.
4. Ejecutar prueba A/B cuando sea posible.
5. Re-medir y documentar impacto.

## 10) Definición de éxito de usabilidad del sistema
Se considera que el sistema tiene una usabilidad saludable cuando durante 2 meses consecutivos cumple:
- Task Success Rate en tareas críticas >= 90%.
- Tiempo promedio de checkout <= 3 minutos.
- SUS >= 80.
- CSAT >= 4/5.
- Tendencia estable o creciente de conversión de reserva.
