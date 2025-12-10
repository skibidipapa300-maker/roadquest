const API_URL = 'https://roadquest.others.ccs4thyear.com/public/api';

// Axios Config
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
axios.defaults.headers.common['Accept'] = 'application/json';

const token = localStorage.getItem('token');
if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
} else {
    window.location.href = '../login.html';
}

$(document).ready(function() {
    checkStaff();

    // Check for login success toast
    if (sessionStorage.getItem('login_success') === 'true') {
        const Toast = Swal.mixin({
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.onmouseenter = Swal.stopTimer;
                toast.onmouseleave = Swal.resumeTimer;
            }
        });
        Toast.fire({
            icon: "success",
            title: "Signed in successfully"
        });
        sessionStorage.removeItem('login_success');
    }

    $('#staff-logout').on('click', function(e) {
        e.preventDefault();
        
        Swal.fire({
            title: 'Are you sure?',
            text: "You will be logged out of your account.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, logout!'
        }).then((result) => {
            if (result.isConfirmed) {
                axios.post(`${API_URL}/logout`)
                    .finally(() => {
                        localStorage.removeItem('user');
                        localStorage.removeItem('token');
                        sessionStorage.setItem('logout_success', 'true');
                        window.location.href = '../index.html';
                    });
            }
        });
    });

    // Dashboard Stats
    if ($('#pending-rentals').length) {
        loadDashboardStats();
    }

    // Rentals Management
    if ($('#staff-rentals-table').length) {
        loadStaffRentals();

        $('#staff-rental-search-form').on('submit', function(e) {
            e.preventDefault();
            const search = $('#staff-rental-search-input').val();
            const status = $('#staff-rental-status-filter').val();
            loadStaffRentals({ search, status });
        });
    }

    // Cars Management (Reuse most logic from admin but restricted if needed)
    if ($('#staff-cars-table').length) {
        loadStaffCars();

        $('#staff-car-search-form').on('submit', function(e) {
            e.preventDefault();
            const search = $('#staff-search-input').val();
            const status = $('#staff-status-filter').val();
            const transmission = $('#staff-transmission-filter').val();
            const fuel_type = $('#staff-fuel-filter').val();
            
            loadStaffCars({ search, status, transmission, fuel_type });
        });

        $('#add-car-form').on('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            formData.append('make', $('#make').val());
            formData.append('model', $('#model').val());
            formData.append('year', $('#year').val());
            formData.append('license_plate', $('#license_plate').val());
            formData.append('category', $('#category').val());
            formData.append('transmission', $('#transmission').val());
            formData.append('fuel_type', $('#fuel_type').val());
            formData.append('seat_capacity', $('#seat_capacity').val());
            formData.append('daily_rate', $('#daily_rate').val());
            formData.append('status', $('#status').val());
            
            const imageFile = $('#image')[0].files[0];
            if (imageFile) {
                formData.append('image', imageFile);
            }

            const carId = $('#car_id').val();
            
            if (carId) {
                // Update
                formData.append('_method', 'PUT');
                axios.post(`${API_URL}/staff/cars/${carId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                    .then(() => {
                        $('#carModal').modal('hide');
                        loadStaffCars();
                        alert('Car updated successfully');
                    })
                    .catch(err => alert('Failed to update car'));
            } else {
                // Create
                axios.post(`${API_URL}/staff/cars`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                    .then(() => {
                        $('#carModal').modal('hide');
                        loadStaffCars();
                        alert('Car created successfully');
                    })
                    .catch(err => alert('Failed to create car: ' + (err.response?.data?.message || '')));
            }
        });
    }
});

function checkStaff() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
        alert('Access Denied. Staff only.');
        window.location.href = '../index.html';
    }
}

function loadDashboardStats() {
    axios.get(`${API_URL}/cars`)
        .then(res => $('#available-cars').text(res.data.length))
        .catch(() => $('#available-cars').text('Error'));
    
    axios.get(`${API_URL}/rentals`)
        .then(res => {
            const pending = res.data.filter(r => r.rental_status === 'pending').length;
            $('#pending-rentals').text(pending);
        })
        .catch(() => $('#pending-rentals').text('Error'));
}

function loadStaffCars(params = {}) {
    // Spinner is handled by HTML default state or we can explicitly show it if needed for re-searches
    const tbody = $('#staff-cars-table tbody');
    const cardsContainer = $('#staff-cars-cards');
    // If we are re-searching, show spinner again
    if (params.search || params.status || params.transmission || params.fuel_type) {
        tbody.html(`
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `);
        cardsContainer.html(`
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `);
    }

    let url = `${API_URL}/cars`;
    const queryParams = new URLSearchParams();

    // Default to all=true if no status filter is applied, similar to admin
    if (params.status) {
        queryParams.append('status', params.status);
    } else {
        queryParams.append('all', 'true');
    }

    if (params.search) queryParams.append('search', params.search);
    if (params.transmission) queryParams.append('transmission', params.transmission);
    if (params.fuel_type) queryParams.append('fuel_type', params.fuel_type);

    if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
    }

    axios.get(url)
        .then(response => {
            const tbody = $('#staff-cars-table tbody');
            const cardsContainer = $('#staff-cars-cards');
            tbody.empty();
            cardsContainer.empty();
            const DEFAULT_CAR_IMAGE = '../images/default-car.svg';
            
            if (response.data.length === 0) {
                tbody.html('<tr><td colspan="6" class="text-center">No cars found.</td></tr>');
                cardsContainer.html('<div class="text-center p-4"><p>No cars found.</p></div>');
                return;
            }

            // Sort cars: Available > Maintenance > Rented
            const statusOrder = { 'available': 1, 'maintenance': 2, 'rented': 3 };
            response.data.sort((a, b) => {
                return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
            });

            response.data.forEach(car => {
                // Desktop Table Row
                tbody.append(`
                    <tr>
                        <td>${car.car_id}</td>
                        <td>
                            <img src="${car.image_url || DEFAULT_CAR_IMAGE}" alt="car" style="height: 30px; width: 50px; object-fit: cover;">
                            ${car.make} ${car.model}
                        </td>
                        <td>${car.license_plate}</td>
                        <td>${car.status}</td>
                        <td>₱${car.daily_rate}</td>
                        <td>
                            <button class="btn btn-sm btn-info" onclick="editCar(${car.car_id})">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteCar(${car.car_id})">Delete</button>
                        </td>
                    </tr>
                `);

                // Mobile Card View
                cardsContainer.append(`
                    <div class="card mb-3 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex align-items-center mb-3">
                                <img src="${car.image_url || DEFAULT_CAR_IMAGE}" alt="car" class="me-3" style="height: 60px; width: 100px; object-fit: cover;">
                                <div>
                                    <h5 class="card-title mb-0">${car.make} ${car.model}</h5>
                                    <small class="text-muted">ID: ${car.car_id}</small>
                                </div>
                            </div>
                            <hr>
                            <div class="mb-2">
                                <strong>License Plate:</strong> ${car.license_plate}
                            </div>
                            <div class="mb-2">
                                <strong>Status:</strong> <span class="badge bg-secondary">${car.status}</span>
                            </div>
                            <div class="mb-3">
                                <strong>Daily Rate:</strong> ₱${car.daily_rate}
                            </div>
                            <div class="d-grid gap-2 d-md-flex">
                                <button class="btn btn-sm btn-info flex-fill" onclick="editCar(${car.car_id})">Edit</button>
                                <button class="btn btn-sm btn-danger flex-fill" onclick="deleteCar(${car.car_id})">Delete</button>
                            </div>
                        </div>
                    </div>
                `);
            });
        });
}

function loadStaffRentals(params = {}) {
    const tbody = $('#staff-rentals-table tbody');
    const cardsContainer = $('#staff-rentals-cards');
    // Show spinner on reload
    if (params.search || params.status) {
        tbody.html(`
            <tr>
                <td colspan="8" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `);
        cardsContainer.html(`
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `);
    }
    
    let url = `${API_URL}/rentals`;
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    
    if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
    }

    axios.get(url)
        .then(response => {
            if (response.data.length === 0) {
                tbody.html('<tr><td colspan="8" class="text-center">No rentals found.</td></tr>');
                cardsContainer.html('<div class="text-center p-4"><p>No rentals found.</p></div>');
                return;
            }
            
            // Custom Sort Order: pending, approved, rented, Pending Return, returned, completed, cancelled, denied
            const statusOrder = {
                'pending': 1,
                'approved': 2,
                'rented': 3, 
                'active': 3, // treat active same as rented if used
                'Pending Return': 4,
                'returned': 5,
                'completed': 6,
                'cancelled': 7,
                'denied': 8
            };

            response.data.sort((a, b) => {
                return (statusOrder[a.rental_status] || 99) - (statusOrder[b.rental_status] || 99);
            });

            tbody.empty(); // Clear spinner
            cardsContainer.empty();
            response.data.forEach(rental => {
                const user = rental.user ? rental.user.username : 'Unknown';
                const car = rental.car ? `${rental.car.make} ${rental.car.model}` : 'Unknown';
                const statusColor = getStatusColor(rental.rental_status);
                
                // State Machine for Staff
                let actions = '';
                if (rental.rental_status === 'pending') {
                    actions = `
                        <button class="btn btn-sm btn-success mb-2" onclick="updateRentalStatus(${rental.rental_id}, 'approved')">Approve</button>
                        <button class="btn btn-sm btn-danger" onclick="updateRentalStatus(${rental.rental_id}, 'denied')">Deny</button>
                    `;
                } else if (rental.rental_status === 'Pending Return') {
                    actions = `
                        <button class="btn btn-sm btn-primary" onclick="updateRentalStatus(${rental.rental_id}, 'returned')">Confirm Returned</button>
                    `;
                } else if (rental.rental_status === 'returned') {
                    actions = `
                        <button class="btn btn-sm btn-success" onclick="updateRentalStatus(${rental.rental_id}, 'completed')">Complete Booking</button>
                    `;
                }

                const actionButton = actions ? `
                    <button class="btn btn-sm btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                        Action
                    </button>
                    <ul class="dropdown-menu">
                        ${rental.rental_status === 'pending' ? `
                            <li><a class="dropdown-item" href="#" onclick="updateRentalStatus(${rental.rental_id}, 'approved')">Approve</a></li>
                            <li><a class="dropdown-item" href="#" onclick="updateRentalStatus(${rental.rental_id}, 'denied')">Deny</a></li>
                        ` : ''}
                        ${rental.rental_status === 'Pending Return' ? `
                            <li><a class="dropdown-item" href="#" onclick="updateRentalStatus(${rental.rental_id}, 'returned')">Confirm Returned</a></li>
                        ` : ''}
                        ${rental.rental_status === 'returned' ? `
                            <li><a class="dropdown-item" href="#" onclick="updateRentalStatus(${rental.rental_id}, 'completed')">Complete Booking</a></li>
                        ` : ''}
                    </ul>
                ` : '<span class="text-muted">No actions</span>';

                // Desktop Table Row
                tbody.append(`
                    <tr>
                        <td>${rental.rental_id}</td>
                        <td>${user}</td>
                        <td>${car}</td>
                        <td>${new Date(rental.pickup_date).toLocaleDateString()}</td>
                        <td>${new Date(rental.return_date).toLocaleDateString()}</td>
                        <td>₱${rental.total_price}</td>
                        <td><span class="badge bg-${statusColor}">${rental.rental_status}</span></td>
                        <td>
                            ${actionButton}
                        </td>
                    </tr>
                `);

                // Mobile Card View
                cardsContainer.append(`
                    <div class="card mb-3 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">Rental #${rental.rental_id}</h5>
                            <hr>
                            <div class="mb-2">
                                <strong>User:</strong> ${user}
                            </div>
                            <div class="mb-2">
                                <strong>Car:</strong> ${car}
                            </div>
                            <div class="mb-2">
                                <strong>Pickup:</strong> ${new Date(rental.pickup_date).toLocaleDateString()}
                            </div>
                            <div class="mb-2">
                                <strong>Return:</strong> ${new Date(rental.return_date).toLocaleDateString()}
                            </div>
                            <div class="mb-2">
                                <strong>Total:</strong> ₱${rental.total_price}
                            </div>
                            <div class="mb-3">
                                <strong>Status:</strong> <span class="badge bg-${statusColor}">${rental.rental_status}</span>
                            </div>
                            ${actions ? `<div class="d-grid gap-2">${actions}</div>` : '<p class="text-muted mb-0">No actions available</p>'}
                        </div>
                    </div>
                `);
            });
        });
}

function getStatusColor(status) {
    switch(status) {
        case 'pending': return 'warning';
        case 'approved': return 'info';
        case 'active': 
        case 'rented': return 'primary';
        case 'Pending Return': return 'warning text-dark';
        case 'returned': return 'info text-dark';
        case 'completed': return 'success';
        case 'cancelled': 
        case 'denied': return 'danger';
        default: return 'secondary';
    }
}

window.updateRentalStatus = function(id, status) {
    if(confirm(`Are you sure you want to mark this rental as ${status}?`)) {
        axios.put(`${API_URL}/staff/rentals/${id}`, { rental_status: status })
            .then(() => {
                loadStaffRentals();
                alert('Status updated');
            })
            .catch(err => alert('Failed to update status'));
    }
}

// Reuse Edit Car Logic
window.editCar = function(id) {
    axios.get(`${API_URL}/cars/${id}`).then(res => {
        const car = res.data;
        const DEFAULT_CAR_IMAGE = '../images/default-car.svg';

        $('#car_id').val(car.car_id);
        $('#make').val(car.make);
        $('#model').val(car.model);
        $('#year').val(car.year);
        $('#license_plate').val(car.license_plate);
        $('#category').val(car.category);
        $('#transmission').val(car.transmission);
        $('#fuel_type').val(car.fuel_type);
        $('#seat_capacity').val(car.seat_capacity);
        $('#daily_rate').val(car.daily_rate);
        $('#status').val(car.status);
        
        if(car.image_url) {
            $('#current-image-preview').html(`<img src="${car.image_url}" style="max-height: 100px;">`);
        } else {
            $('#current-image-preview').html(`<img src="${DEFAULT_CAR_IMAGE}" style="max-height: 100px;">`);
        }
        
        $('#modalTitle').text('Edit Car');
        $('#carModal').modal('show');
    });
};

function openAddCarModal() {
    $('#car_id').val('');
    $('#add-car-form')[0].reset();
    $('#current-image-preview').empty();
    $('#modalTitle').text('Add New Car');
    $('#carModal').modal('show');
}

window.deleteCar = function(id) {
    if(confirm('Are you sure you want to delete this car? This action cannot be undone.')) {
        axios.delete(`${API_URL}/staff/cars/${id}`)
            .then(() => {
                loadStaffCars();
                alert('Car deleted successfully');
            })
            .catch(err => alert('Error deleting car: ' + (err.response?.data?.message || err.message)));
    }
};

