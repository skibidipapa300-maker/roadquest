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
    checkAdmin();

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

    $('#admin-logout').on('click', function(e) {
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
    if ($('#total-cars').length) {
        loadDashboardStats();
        loadActiveRentals();

        // Active Rentals Search and Filter
        $('#admin-active-rental-search-form').on('submit', function(e) {
            e.preventDefault();
            const search = $('#admin-active-rental-search-input').val();
            const status = $('#admin-active-rental-status-filter').val();
            loadActiveRentals({ search, status });
        });
    }

    // Cars Management
    if ($('#admin-cars-table').length) {
        loadAdminCars();

        $('#admin-car-search-form').on('submit', function(e) {
            e.preventDefault();
            const search = $('#admin-search-input').val();
            const status = $('#admin-status-filter').val();
            const transmission = $('#admin-transmission-filter').val();
            const fuel_type = $('#admin-fuel-filter').val();
            
            loadAdminCars({ search, status, transmission, fuel_type });
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
                // Laravel method spoofing for PUT with FormData
                formData.append('_method', 'PUT');
                
                axios.post(`${API_URL}/admin/cars/${carId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                    .then(() => {
                        $('#carModal').modal('hide');
                        loadAdminCars();
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
                            title: "Car updated successfully"
                        });
                    })
                    .catch(err => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Failed to update car',
                            text: err.response?.data?.message || 'An error occurred'
                        });
                    });
            } else {
                // Create
                axios.post(`${API_URL}/admin/cars`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                    .then(() => {
                        $('#carModal').modal('hide');
                        loadAdminCars();
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
                            title: "Car created successfully"
                        });
                    })
                    .catch(err => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Failed to create car',
                            text: err.response?.data?.message || 'An error occurred'
                        });
                    });
            }
        });
    }

    // Users Management
    if ($('#admin-users-table').length) {
        loadAdminUsers();

        $('#admin-user-search-form').on('submit', function(e) {
            e.preventDefault();
            const search = $('#admin-user-search-input').val();
            const role = $('#admin-role-filter').val();
            const is_verified = $('#admin-verified-filter').val();
            
            loadAdminUsers({ search, role, is_verified });
        });

        $('#user-form').on('submit', function(e) {
            e.preventDefault();
            const userId = $('#user_id').val();
            // Combine first_name and last_name into full_name
            const fullName = ($('#first_name').val().trim() + ' ' + $('#last_name').val().trim()).trim();
            const formData = {
                username: $('#username').val(),
                full_name: fullName,
                email: $('#email').val(),
                password: $('#password').val(),
                role: $('#role').val(),
                is_verified: $('#is_verified').val()
            };

            // Remove password if empty (for updates)
            if (!formData.password) delete formData.password;

            if (userId) {
                // Update User
                axios.put(`${API_URL}/admin/users/${userId}`, formData)
                    .then(() => {
                        $('#userModal').modal('hide');
                        loadAdminUsers();
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
                            title: "User updated successfully"
                        });
                    })
                    .catch(err => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Failed to update user',
                            text: err.response?.data?.message || 'An error occurred'
                        });
                    });
            } else {
                // Create User
                axios.post(`${API_URL}/admin/users`, formData)
                    .then(() => {
                        $('#userModal').modal('hide');
                        loadAdminUsers();
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
                            title: "User created successfully"
                        });
                    })
                    .catch(err => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Failed to create user',
                            text: err.response?.data?.message || 'An error occurred'
                        });
                    });
            }
        });
    }

    // History Management
    if ($('#admin-history-table').length) {
        loadAdminHistory();

        $('#history-search-form').on('submit', function(e) {
            e.preventDefault();
            const search = $('#history-search-input').val();
            const status = $('#history-status-filter').val();
            loadAdminHistory({ search, status });
        });
    }
});

function checkAdmin() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
        Swal.fire({
            icon: 'error',
            title: 'Access Denied',
            text: 'Admins only.',
            confirmButtonText: 'OK'
        }).then(() => {
            window.location.href = '../index.html';
        });
    }
}

function loadDashboardStats() {
    // Getting counts manually since we don't have a stats endpoint
    axios.get(`${API_URL}/cars?all=true`)
        .then(res => $('#total-cars').text(res.data.length))
        .catch(() => $('#total-cars').text('Error'));
    
    axios.get(`${API_URL}/admin/users`)
        .then(res => $('#total-users').text(res.data.length))
        .catch(() => $('#total-users').text('Error'));
        
    // Count only active rentals (exclude completed, cancelled, denied)
    axios.get(`${API_URL}/rentals`) 
        .then(res => {
            const activeRentals = res.data.filter(r => 
                !['completed', 'cancelled', 'denied'].includes(r.rental_status?.toLowerCase())
            );
            $('#total-rentals').text(activeRentals.length);
        })
        .catch(() => $('#total-rentals').text('Error')); 
}

function loadActiveRentals(params = {}) {
    const tbody = $('#admin-active-rentals-table tbody');
    const cardsContainer = $('#admin-active-rentals-cards');
    
    // Show spinner on reload
    if (params.search || params.status) {
        tbody.html(`
            <tr>
                <td colspan="7" class="text-center">
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
            tbody.empty();
            cardsContainer.empty();
            
            // Filter out completed, cancelled, and denied rentals
            let activeRentals = response.data.filter(r => 
                !['completed', 'cancelled', 'denied'].includes(r.rental_status?.toLowerCase())
            );
            
            // Apply status filter if provided (client-side for active rentals)
            if (params.status) {
                activeRentals = activeRentals.filter(r => 
                    r.rental_status?.toLowerCase() === params.status.toLowerCase()
                );
            }
            
            // Apply search filter if provided (client-side)
            if (params.search) {
                const searchLower = params.search.toLowerCase();
                activeRentals = activeRentals.filter(r => {
                    const userMatch = r.user?.username?.toLowerCase().includes(searchLower);
                    const carMake = r.car?.make?.toLowerCase().includes(searchLower);
                    const carModel = r.car?.model?.toLowerCase().includes(searchLower);
                    return userMatch || carMake || carModel;
                });
            }
            
            // Custom Sort Order: pending, approved, rented, Pending Return, returned
            const statusOrder = {
                'pending': 1,
                'approved': 2,
                'rented': 3, 
                'active': 3, // treat active same as rented if used
                'Pending Return': 4,
                'returned': 5
            };

            activeRentals.sort((a, b) => {
                const orderA = statusOrder[a.rental_status] || 99;
                const orderB = statusOrder[b.rental_status] || 99;
                return orderA - orderB;
            });
            
            if (activeRentals.length === 0) {
                tbody.append('<tr><td colspan="7" class="text-center">No active rentals.</td></tr>');
                cardsContainer.html('<div class="text-center p-4"><p>No active rentals.</p></div>');
                return;
            }

            activeRentals.forEach(rental => {
                const statusClass = 
                    rental.rental_status === 'pending' ? 'bg-warning' : 
                    rental.rental_status === 'approved' ? 'bg-info' : 
                    rental.rental_status === 'rented' ? 'bg-primary' : 
                    rental.rental_status === 'pending return' ? 'bg-secondary' :
                    rental.rental_status === 'returned' ? 'bg-success' :
                    'bg-secondary';

                // Desktop Table Row
                tbody.append(`
                    <tr>
                        <td>${rental.rental_id}</td>
                        <td>${rental.user ? rental.user.username : 'N/A'}</td>
                        <td>${rental.car ? `${rental.car.make} ${rental.car.model}` : 'Deleted Car'}</td>
                        <td>${new Date(rental.pickup_date).toLocaleDateString()}</td>
                        <td>${new Date(rental.return_date).toLocaleDateString()}</td>
                        <td>₱${rental.total_price}</td>
                        <td><span class="badge ${statusClass}">${rental.rental_status}</span></td>
                    </tr>
                `);

                // Mobile Card View
                cardsContainer.append(`
                    <div class="card mb-3 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">Rental #${rental.rental_id}</h5>
                            <hr>
                            <div class="mb-2">
                                <strong>Customer:</strong> ${rental.user ? rental.user.username : 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Car:</strong> ${rental.car ? `${rental.car.make} ${rental.car.model}` : 'Deleted Car'}
                            </div>
                            <div class="mb-2">
                                <strong>Pickup Date:</strong> ${new Date(rental.pickup_date).toLocaleDateString()}
                            </div>
                            <div class="mb-2">
                                <strong>Return Date:</strong> ${new Date(rental.return_date).toLocaleDateString()}
                            </div>
                            <div class="mb-2">
                                <strong>Total Price:</strong> ₱${rental.total_price}
                            </div>
                            <div class="mb-2">
                                <strong>Status:</strong> <span class="badge ${statusClass}">${rental.rental_status}</span>
                            </div>
                        </div>
                    </div>
                `);
            });
        })
        .catch(err => {
            console.error(err);
            $('#admin-active-rentals-table tbody').html('<tr><td colspan="7" class="text-center text-danger">Failed to load active rentals.</td></tr>');
            $('#admin-active-rentals-cards').html('<div class="text-center p-4 text-danger"><p>Failed to load active rentals.</p></div>');
        });
}

const DEFAULT_CAR_IMAGE = '../images/default-car.svg';

function loadAdminCars(params = {}) {
    const tbody = $('#admin-cars-table tbody');
    const cardsContainer = $('#admin-cars-cards');
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

    let url = `${API_URL}/cars?all=true`;
    const queryParams = new URLSearchParams();

    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.transmission) queryParams.append('transmission', params.transmission);

    // If filters are applied, we need to append them.
    // Note: The backend uses `status` parameter. If `status` is present, it filters by it. 
    // If `all` is present (and no status), it shows all.
    // Our logic above starts with all=true. If status is appended, Laravel's CarController prioritizes status filter over 'all' check.
    // Let's construct the query properly.
    
    let finalUrl = `${API_URL}/cars`;
    let finalParams = new URLSearchParams();
    
    if (params.status) {
        finalParams.append('status', params.status);
    } else {
        finalParams.append('all', 'true');
    }

    if (params.search) finalParams.append('search', params.search);
    if (params.transmission) finalParams.append('transmission', params.transmission);
    if (params.fuel_type) finalParams.append('fuel_type', params.fuel_type);

    if (finalParams.toString()) {
        finalUrl += `?${finalParams.toString()}`;
    }

    axios.get(finalUrl)
        .then(response => {
            const tbody = $('#admin-cars-table tbody');
            const cardsContainer = $('#admin-cars-cards');
            tbody.empty();
            cardsContainer.empty();
            
            if (response.data.length === 0) {
                tbody.append('<tr><td colspan="6" class="text-center">No cars found.</td></tr>');
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

function loadAdminUsers(params = {}) {
    const tbody = $('#admin-users-table tbody');
    const cardsContainer = $('#admin-users-cards');
    if (params.search || params.role || params.is_verified) {
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

    let url = `${API_URL}/admin/users`;
    const queryParams = new URLSearchParams();

    if (params.search) queryParams.append('search', params.search);
    if (params.role) queryParams.append('role', params.role);
    if (params.is_verified) queryParams.append('is_verified', params.is_verified);

    if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
    }

    axios.get(url)
        .then(response => {
            let users = response.data;
            const tbody = $('#admin-users-table tbody');
            const cardsContainer = $('#admin-users-cards');
            tbody.empty();
            cardsContainer.empty();

            if (users.length === 0) {
                tbody.append('<tr><td colspan="6" class="text-center">No users found.</td></tr>');
                cardsContainer.html('<div class="text-center p-4"><p>No users found.</p></div>');
                return;
            }

            // Sort: Admin > Staff > Customer
            const roleOrder = { 'admin': 1, 'staff': 2, 'customer': 3 };
            users.sort((a, b) => {
                return (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99);
            });

            users.forEach(user => {
                let deleteBtn = '';
                if (user.user_id != 6) {
                    deleteBtn = `<button class="btn btn-sm btn-danger" onclick="deleteUser(${user.user_id})">Delete</button>`;
                }

                // Desktop Table Row
                tbody.append(`
                    <tr>
                        <td>${user.user_id}</td>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${user.role}</td>
                        <td>${user.is_verified ? 'Yes' : 'No'}</td>
                        <td>
                            <button class="btn btn-sm btn-info" onclick="editUser(${user.user_id})">Edit</button>
                            ${deleteBtn}
                        </td>
                    </tr>
                `);

                // Mobile Card View
                cardsContainer.append(`
                    <div class="card mb-3 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">${user.username}</h5>
                            <hr>
                            <div class="mb-2">
                                <strong>ID:</strong> ${user.user_id}
                            </div>
                            <div class="mb-2">
                                <strong>Email:</strong> ${user.email}
                            </div>
                            <div class="mb-2">
                                <strong>Role:</strong> <span class="badge bg-primary">${user.role}</span>
                            </div>
                            <div class="mb-3">
                                <strong>Verified:</strong> ${user.is_verified ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-danger">No</span>'}
                            </div>
                            <div class="d-grid gap-2 d-md-flex">
                                <button class="btn btn-sm btn-info flex-fill" onclick="editUser(${user.user_id})">Edit</button>
                                ${deleteBtn ? `<button class="btn btn-sm btn-danger flex-fill" onclick="deleteUser(${user.user_id})">Delete</button>` : ''}
                            </div>
                        </div>
                    </div>
                `);
            });
        });
}

// Global functions for onclick
window.editCar = function(id) {
    axios.get(`${API_URL}/cars/${id}`).then(res => {
        const car = res.data;
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

window.deleteCar = function(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            axios.delete(`${API_URL}/admin/cars/${id}`)
                .then(() => {
                    loadAdminCars();
                    Swal.fire(
                        'Deleted!',
                        'The car has been deleted.',
                        'success'
                    );
                })
                .catch(err => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error deleting car',
                        text: err.response?.data?.message || 'An error occurred'
                    });
                });
        }
    });
};

window.editUser = function(id) {
    axios.get(`${API_URL}/admin/users/${id}`).then(res => {
        const user = res.data;
        $('#user_id').val(user.user_id);
        $('#username').val(user.username);
        // Split full_name into first_name and last_name
        const nameParts = (user.full_name || '').trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        $('#first_name').val(firstName);
        $('#last_name').val(lastName);
        $('#email').val(user.email);
        $('#password').val(''); // Clear password field
        $('#role').val(user.role);
        $('#is_verified').val(user.is_verified ? 1 : 0);
        
        $('.modal-title').text('Edit User');
        $('#userModal').modal('show');
    });
};

window.openAddUserModal = function() {
    $('#user_id').val('');
    $('#user-form')[0].reset();
    $('.modal-title').text('Add New User');
    $('#userModal').modal('show');
};

window.deleteUser = function(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "This will delete the user and all their data. You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            axios.delete(`${API_URL}/admin/users/${id}`)
                .then(() => {
                    loadAdminUsers();
                    Swal.fire(
                        'Deleted!',
                        'The user has been deleted.',
                        'success'
                    );
                })
                .catch(err => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error deleting user',
                        text: err.response?.data?.message || 'An error occurred'
                    });
                });
        }
    });
};

// Clear modal when opening for add
function openAddCarModal() {
    $('#car_id').val('');
    $('#add-car-form')[0].reset();
    $('#current-image-preview').empty();
    $('#modalTitle').text('Add New Car');
    $('#carModal').modal('show');
}

function loadAdminHistory(params = {}) {
    const tbody = $('#admin-history-table tbody');
    const cardsContainer = $('#admin-history-cards');
    // Spinner is default in HTML or show if re-loading
    if (params.search || params.status) {
        tbody.html(`
            <tr>
                <td colspan="7" class="text-center">
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
            const cardsContainer = $('#admin-history-cards');
            tbody.empty();
            cardsContainer.empty();
            // Filter client side if needed, but backend handles search/status now.
            // However, default view should only be completed/cancelled/denied
            
            let filteredRentals = response.data;
            
            // If no specific status filter is applied by user, apply default view filter
            if (!params.status) {
                filteredRentals = filteredRentals.filter(r => 
                    ['cancelled', 'denied', 'completed'].includes(r.rental_status)
                );
            }
            
            // Sort rentals: completed first, cancelled next, denied last
            const statusOrder = { 'completed': 1, 'cancelled': 2, 'denied': 3 };
            filteredRentals.sort((a, b) => {
                const orderA = statusOrder[a.rental_status?.toLowerCase()] || 999;
                const orderB = statusOrder[b.rental_status?.toLowerCase()] || 999;
                return orderA - orderB;
            });
            
            if (filteredRentals.length === 0) {
                tbody.append('<tr><td colspan="7" class="text-center">No history available.</td></tr>');
                cardsContainer.html('<div class="text-center p-4"><p>No history available.</p></div>');
                return;
            }

            filteredRentals.forEach(rental => {
                const statusClass = 
                    rental.rental_status === 'completed' ? 'bg-success' : 
                    rental.rental_status === 'cancelled' ? 'bg-danger' : 
                    rental.rental_status === 'denied' ? 'bg-danger' :
                    'bg-warning';

                // Desktop Table Row
                tbody.append(`
                    <tr>
                        <td>${rental.rental_id}</td>
                        <td>${rental.user ? rental.user.username : 'N/A'}</td>
                        <td>${rental.car ? `${rental.car.make} ${rental.car.model}` : 'Deleted Car'}</td>
                        <td>
                            ${new Date(rental.pickup_date).toLocaleDateString()} - 
                            ${new Date(rental.return_date).toLocaleDateString()}
                        </td>
                        <td>₱${rental.total_price}</td>
                        <td><span class="badge ${statusClass}">${rental.rental_status}</span></td>
                        <td>
                            <button class="btn btn-sm btn-danger" onclick="deleteRental(${rental.rental_id})">Delete</button>
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
                                <strong>Customer:</strong> ${rental.user ? rental.user.username : 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Car:</strong> ${rental.car ? `${rental.car.make} ${rental.car.model}` : 'Deleted Car'}
                            </div>
                            <div class="mb-2">
                                <strong>Dates:</strong><br>
                                ${new Date(rental.pickup_date).toLocaleDateString()} - ${new Date(rental.return_date).toLocaleDateString()}
                            </div>
                            <div class="mb-2">
                                <strong>Total Price:</strong> ₱${rental.total_price}
                            </div>
                            <div class="mb-2">
                                <strong>Status:</strong> <span class="badge ${statusClass}">${rental.rental_status}</span>
                            </div>
                            <div class="d-grid">
                                <button class="btn btn-sm btn-danger" onclick="deleteRental(${rental.rental_id})">Delete</button>
                            </div>
                        </div>
                    </div>
                `);
            });
        })
        .catch(err => {
            console.error(err);
            $('#admin-history-table tbody').html('<tr><td colspan="7" class="text-center text-danger">Failed to load history.</td></tr>');
            $('#admin-history-cards').html('<div class="text-center p-4 text-danger"><p>Failed to load history.</p></div>');
        });
}

window.deleteRental = function(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You want to delete this rental record? This cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            axios.delete(`${API_URL}/admin/rentals/${id}`)
                .then(() => {
                    loadAdminHistory();
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
                        title: "Rental deleted successfully"
                    });
                })
                .catch(err => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error deleting rental',
                        text: err.response?.data?.message || 'An error occurred'
                    });
                });
        }
    });
};
