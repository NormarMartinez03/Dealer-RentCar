// 1. Datos iniciales
const defaultVehicles = [
    { id: 1, name: 'Toyota Corolla', year: 2023, price: 45, category: 'economico', image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80' },
    { id: 2, name: 'Hyundai Tucson', year: 2024, price: 70, category: 'suv', image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80' },
    { id: 3, name: 'BMW X5', year: 2024, price: 135, category: 'lujo', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80' },
    { id: 4, name: 'Kia Rio', year: 2022, price: 40, category: 'economico', image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80' }
];

// Inicializar base de datos
let vehicles = JSON.parse(localStorage.getItem('vehicles')) || defaultVehicles;
if(!localStorage.getItem('vehicles')) localStorage.setItem('vehicles', JSON.stringify(defaultVehicles));

// 2. Renderizar Catálogo (Index)
function renderCatalog(filter = 'todos') {
    const grid = document.getElementById('vehicleGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const filtered = filter === 'todos' ? vehicles : vehicles.filter(v => v.category === filter);

    filtered.forEach(v => {
        grid.innerHTML += `
            <div class="car-card">
                <img src="${v.image}">
                <div class="car-info">
                    <span class="category-badge">${v.category}</span>
                    <h3>${v.name} (${v.year})</h3>
                    <p class="price">$${v.price}<span>/día</span></p>
                    <button onclick="checkAuth(${v.id})" class="btn-primary">Reservar Ahora</button>
                </div>
            </div>`;
    });
}

// 3. Renderizar Tabla (Admin)
function renderAdmin() {
    const table = document.getElementById('adminTableBody');
    if (!table) return;
    table.innerHTML = '';
    vehicles.forEach(v => {
        table.innerHTML += `
            <tr>
                <td><img src="${v.image}" width="50"></td>
                <td>${v.name}</td>
                <td>${v.category}</td>
                <td>$${v.price}</td>
                <td><button onclick="deleteCar(${v.id})" style="color:red; background:none; border:none; cursor:pointer">Eliminar</button></td>
            </tr>`;
    });
}

function deleteCar(id) {
    vehicles = vehicles.filter(v => v.id !== id);
    localStorage.setItem('vehicles', JSON.stringify(vehicles));
    renderAdmin();
}

// 4. Seguridad y Filtros
function checkAuth(id) {
    const user = localStorage.getItem('currentUser');
    if (!user) {
        alert("Inicia sesión para reservar");
        window.location.href = 'login.html';
    } else {
        localStorage.setItem('selectedCarId', id);
        window.location.href = 'checkout.html';
    }
}

function filterAction(cat, btn) {
    renderCatalog(cat);
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    renderCatalog();
    renderAdmin();
    const userLink = document.getElementById('user-auth-link');
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user && userLink) {
        userLink.innerHTML = `<span style="margin-right:10px">Hola, ${user.name}</span> <button onclick="logout()" class="logout-btn">Salir</button>`;
    }
});
