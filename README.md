# 🚗 RentCar Express – Dealer-RentCar

Proyecto Final de **Ingeniería de Software II**.

RentCar Express es una plataforma web que permite gestionar el alquiler de vehículos de forma rápida, segura y organizada. El sistema permite a los usuarios explorar el catálogo de autos disponibles, realizar reservas y administrar el proceso de renta de manera sencilla. Además, incluye un panel administrativo para gestionar vehículos, usuarios y operaciones del sistema.

# ✨ Novedades Implementadas
🚀 Backend con **Express + SQLite** (`backend/server.js`) con base de datos SQL real.  
🔐 Sistema de seguridad con **helmet**, **express-rate-limit**, autenticación con **JWT** y contraseñas cifradas con **bcryptjs**.  
👥 Control de acceso por roles con páginas separadas: **admin.html**, **customer.html** y **agent.html**.  
🚗 Catálogo de vehículos interactivo (`catalog.html`) conectado con la API.  
💳 Sistema de checkout con cálculo automático de **precio por día**, **cargo de servicio** e **impuestos**.

## 🌐 Aplicación en línea
Puedes acceder a la versión desplegada del sistema RentCar Express en el siguiente enlace:
🔗 https://matoscx.github.io/Dealer-RentCar/
Esta versión está publicada utilizando GitHub Pages y permite visualizar el funcionamiento del sistema directamente desde el navegador sin necesidad de instalación.

## 🛠 Tecnologías utilizadas
Node.js  
Express.js  
SQLite  
HTML  
CSS  
JavaScript  
JWT  
bcryptjs

## ⚙️ Ejecutar proyecto completo
Para ejecutar el sistema de **RentCar Express** de manera local, primero es necesario instalar todas las dependencias del proyecto y luego iniciar el servidor backend.

```bash
npm install
npm run start
Backend: `http://localhost:3000`

Para abrir las páginas estáticas (frontend):
```bash
npm run serve
```
Frontend: `http://localhost:8000`

## 👨‍💻 Credenciales admin demo
Para acceder al panel administrativo del sistema se pueden utilizar las siguientes credenciales de prueba
- Usuario: `admin@rentcar.com`
- Contraseña: `Admin123*`

## 📄 Documentación
- Estado actual del sistema: `docs/ESTADO_ACTUAL_SISTEMA.md`
- Script SQL base: `backend/schema.sql`
