// Datos de tu proyecto viejo adaptados
const vehicles = [
    { id: 1, name: 'Toyota Corolla', year: 2023, price: 45, category: 'economico', image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=400&q=80' },
    { id: 2, name: 'Hyundai Tucson', year: 2024, price: 70, category: 'suv', image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=400&q=80' },
    { id: 3, name: 'BMW X5', year: 2024, price: 135, category: 'lujo', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=400&q=80' },
    { id: 4, name: 'Nissan Versa', year: 2024, price: 42, category: 'economico', image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=400&q=80' }
];

// Función para renderizar autos
function renderCars(filter = 'todos') {
    const grid = document.getElementById('vehicleGrid');
    if(!grid) return;
    grid.innerHTML = '';

    const filtered = filter === 'todos' ? vehicles : vehicles.filter(v => v.category === filter);

    filtered.forEach(car => {
        grid.innerHTML += `
            <div class="car-card">
                <img src="${car.image}" alt="${car.name}">
                <div class="car-info">
                    <span class="category-tag">${car.category}</span>
                    <h3>${car.name}</h3>
                    <p class="price">$${car.price}<span>/día</span></p>
                    <button onclick="handleReservation(${car.id})" class="btn-rent">Reservar Ahora</button>
                </div>
            </div>
        `;
    });
}

// Función mágica: Controla el acceso
function handleReservation(carId) {
    const user = localStorage.getItem('currentUser');
    
    if (!user) {
        alert("Debes iniciar sesión para realizar una reserva.");
        window.location.href = 'login.html';
    } else {
        // Si está logueado, lo mandamos al pago o detalle
        localStorage.setItem('selectedCar', carId);
        window.location.href = 'checkout.html';
    }
}

function filterCars(cat) {
    renderCars(cat);
    // Cambiar estado activo de botones
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.innerText.toLowerCase() === cat) btn.classList.add('active');
    });
}

// Al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    renderCars();
    
    // Cambiar el botón de la navbar si ya inició sesión
    const user = localStorage.getItem('currentUser');
    if(user) {
        const userData = JSON.parse(user);
        document.getElementById('auth-link').innerHTML = `
            <span style="color:white; margin-right:10px">Hola, ${userData.name}</span>
            <button onclick="logout()" class="logout-btn" style="background:#e74c3c">Salir</button>
        `;
    }
});

function logout() {
    localStorage.removeItem('currentUser');
    window.location.reload();
}
