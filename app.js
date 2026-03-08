// Base de datos simulada
let vehicles = JSON.parse(localStorage.getItem('vehicles')) || [
    { id: 1, name: 'Toyota Corolla', year: 2023, price: 45, category: 'economico', image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80' },
    { id: 2, name: 'Hyundai Tucson', year: 2024, price: 70, category: 'suv', image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80' },
    { id: 3, name: 'BMW X5', year: 2024, price: 135, category: 'lujo', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80' }
];

// Guardar en LocalStorage siempre
const saveDB = () => localStorage.setItem('vehicles', JSON.stringify(vehicles));

// 1. Renderizar Catálogo (Cliente)
function renderCatalog(filter = 'todos') {
    const grid = document.getElementById('vehicleGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = filter === 'todos' ? vehicles : vehicles.filter(v => v.category === filter);

    filtered.forEach(v => {
        grid.innerHTML += `
            <div class="car-card">
                <img src="${v.image}" alt="${v.name}">
                <div class="car-info">
                    <span class="category-badge">${v.category}</span>
                    <h3 style="margin: 10px 0">${v.name} (${v.year})</h3>
                    <p style="color: #f39c12; font-size: 1.4rem; font-weight: 700">$${v.price}<span style="font-size: 0.8rem; color: #888">/día</span></p>
                    <button onclick="checkAuthAndReserve(${v.id})" class="btn-primary" style="margin-top: 15px">Reservar Ahora</button>
                </div>
            </div>
        `;
    });
}

// 2. Renderizar Tabla (Admin/Developer)
function renderAdminTable() {
    const tableBody = document.getElementById('adminTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    vehicles.forEach(v => {
        tableBody.innerHTML += `
            <tr>
                <td><img src="${v.image}" width="60" style="border-radius:5px"></td>
                <td>${v.name}</td>
                <td><span class="category-badge">${v.category}</span></td>
                <td>$${v.price}</td>
                <td>
                    <button onclick="deleteVehicle(${v.id})" style="background: #e74c3c; border:none; color:white; padding:5px 10px; border-radius:5px; cursor:pointer">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

// Validar acceso antes de reservar
function checkAuthAndReserve(id) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert("Debes iniciar sesión para reservar.");
        window.location.href = 'login.html';
    } else {
        localStorage.setItem('selectedCarId', id);
        window.location.href = 'checkout.html';
    }
}

// Eliminar vehículo (Admin)
function deleteVehicle(id) {
    if(confirm('¿Seguro que deseas eliminar este auto?')) {
        vehicles = vehicles.filter(v => v.id !== id);
        saveDB();
        renderAdminTable();
    }
}

// Control de Filtros
function filterAction(category, btn) {
    renderCatalog(category);
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    renderCatalog();
    renderAdminTable();
    
    // Actualizar nombre de usuario en Navbar
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if(user && document.getElementById('nav-user')) {
        document.getElementById('nav-user').innerHTML = `
            <span>Hola, ${user.name}</span>
            <button onclick="logout()" class="btn-auth" style="background:#e74c3c; margin-left:10px">Salir</button>
        `;
    }
});

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}
