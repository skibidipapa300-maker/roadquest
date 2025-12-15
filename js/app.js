const API_URL = 'https://roadquest.others.ccs4thyear.com/public/api';
const DEFAULT_CAR_IMAGE = 'images/default-car.svg';

// Axios Config
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
axios.defaults.headers.common['Accept'] = 'application/json';

// Add token to requests if available
const token = localStorage.getItem('token');
if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

$(document).ready(function() {
    checkAuth();

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

    // Check for logout success toast
    if (sessionStorage.getItem('logout_success') === 'true') {
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
            title: "Signed out successfully"
        });
        sessionStorage.removeItem('logout_success');
    }

    // Toggle Password Visibility
    $(document).on('click', '#togglePassword', function() {
        const passwordInput = $('#password');
        const icon = $(this).find('i');
        
        if (passwordInput.attr('type') === 'password') {
            passwordInput.attr('type', 'text');
            icon.removeClass('bi-eye').addClass('bi-eye-slash');
        } else {
            passwordInput.attr('type', 'password');
            icon.removeClass('bi-eye-slash').addClass('bi-eye');
        }
    });

    // Login
    $('#login-form').on('submit', function(e) {
        e.preventDefault();
        const username = $('#username').val();
        const password = $('#password').val();

        axios.post(`${API_URL}/login`, { username, password })
            .then(response => {
                localStorage.setItem('user', JSON.stringify(response.data.user));
                localStorage.setItem('token', response.data.token);
                
                // Update axios default header immediately
                axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
                
                // Set flag for toast
                sessionStorage.setItem('login_success', 'true');

                if (response.data.user.role === 'admin') {
                    window.location.href = 'admin/index.html';
                } else if (response.data.user.role === 'staff') {
                    window.location.href = 'staff/index.html';
                } else {
                    window.location.href = 'index.html';
                }
            })
            .catch(error => {
                let msg = error.response?.data?.message || 'Login failed';
                
                // If account is not verified, redirect to verify page
                if (error.response?.status === 403 && (msg.includes('not verified') || msg.includes('verify'))) {
                    $('#login-alert').text('Account not verified. Redirecting to verification page...').removeClass('d-none').removeClass('alert-danger').addClass('alert-warning');
                    setTimeout(() => {
                        window.location.href = `verify.html?username=${encodeURIComponent(username)}`;
                    }, 1500);
                } else {
                    $('#login-alert').text(msg).removeClass('d-none');
                }
            });
    });

    // Register
    $('#register-form').on('submit', function(e) {
        e.preventDefault();
        const data = {
            first_name: $('#first_name').val(),
            last_name: $('#last_name').val(),
            username: $('#username').val(),
            email: $('#email').val(),
            password: $('#password').val()
        };

        axios.post(`${API_URL}/register`, data)
            .then(response => {
                Swal.fire({
                    icon: 'success',
                    title: 'Registration Successful!',
                    text: 'Please check your email for the verification code.',
                    confirmButtonText: 'OK'
                }).then(() => {
                    // Redirect to verify page with username
                    window.location.href = `verify.html?username=${data.username}`;
                });
            })
            .catch(error => {
                let msg = 'Registration failed';
                if(error.response?.data?.errors) {
                     msg = Object.values(error.response.data.errors).flat().join('\n');
                } else if (error.response?.data?.error) {
                     msg = error.response.data.error;
                } else if (error.response?.data?.message) {
                     msg = error.response.data.message;
                }
                $('#register-alert').text(msg).removeClass('d-none');
            });
    });

    // Verify OTP
    $('#verify-form').on('submit', function(e) {
        e.preventDefault();
        const username = $('#verify-username').val();
        const otp_code = $('#otp_code').val();

        if(!username) {
            $('#verify-alert').text('Username missing. Please register again or follow the link from login.').removeClass('d-none');
            return;
        }

        axios.post(`${API_URL}/verify-otp`, { username, otp_code })
            .then(response => {
                Swal.fire({
                    icon: 'success',
                    title: 'Verification Successful!',
                    text: 'You can now login.',
                    confirmButtonText: 'OK'
                }).then(() => {
                    window.location.href = 'login.html';
                });
            })
            .catch(error => {
                let msg = error.response?.data?.message || 'Verification failed';
                $('#verify-alert').text(msg).removeClass('d-none');
            });
    });

    // Resend OTP
    $('#resend-otp-btn').on('click', function(e) {
        e.preventDefault();
        const username = $('#verify-username').val();

        if(!username) {
            $('#verify-alert').text('Username missing. Please register again or follow the link from login.').removeClass('d-none');
            return;
        }

        const btn = $(this);
        const originalText = btn.html();
        btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Sending...');

        axios.post(`${API_URL}/resend-otp`, { username })
            .then(response => {
                $('#verify-alert').removeClass('alert-danger').addClass('alert-success').text(response.data.message).removeClass('d-none');
                btn.prop('disabled', false).html(originalText);
                
                // Clear the alert after 5 seconds
                setTimeout(() => {
                    $('#verify-alert').addClass('d-none');
                }, 5000);
            })
            .catch(error => {
                let msg = error.response?.data?.message || 'Failed to resend OTP';
                $('#verify-alert').removeClass('alert-success').addClass('alert-danger').text(msg).removeClass('d-none');
                btn.prop('disabled', false).html(originalText);
            });
    });

    // Forgot Password
    $('#forgot-password-form').on('submit', function(e) {
        e.preventDefault();
        const email = $('#forgot-email').val();
        $('#forgot-alert').addClass('d-none');

        axios.post(`${API_URL}/forgot-password`, { email })
            .then(response => {
                window.location.href = `reset-password.html?email=${email}&sent=true`;
            })
            .catch(error => {
                let msg = error.response?.data?.message || 'Failed to send reset code.';
                $('#forgot-alert').text(msg).removeClass('d-none');
            });
    });

    // Reset Password - Step 1: Verify OTP
    $('#verify-otp-form').on('submit', function(e) {
        e.preventDefault();
        const email = $('#reset-email').val();
        const otp = $('#otp_code').val();
        $('#reset-alert').addClass('d-none');

        axios.post(`${API_URL}/verify-reset-otp`, { email, otp_code: otp })
            .then(response => {
                $('#reset-alert').removeClass('alert-info alert-danger').addClass('alert-success').text(response.data.message).removeClass('d-none');
                $('#verify-otp-form').addClass('d-none');
                $('#reset-password-form').removeClass('d-none');
            })
            .catch(error => {
                let msg = error.response?.data?.message || 'Verification failed.';
                $('#reset-alert').removeClass('alert-info alert-success').addClass('alert-danger').text(msg).removeClass('d-none');
            });
    });

    // Reset Password - Step 2: Set New Password
    $('#reset-password-form').on('submit', function(e) {
        e.preventDefault();
        
        const newPassword = $('#new_password').val();
        const confirmPassword = $('#new_password_confirmation').val();

        if (newPassword !== confirmPassword) {
            $('#reset-alert').removeClass('alert-info alert-success').addClass('alert-danger').text('Passwords do not match.').removeClass('d-none');
            return;
        }

        const data = {
            email: $('#reset-email').val(),
            otp_code: $('#otp_code').val(),
            new_password: newPassword,
            new_password_confirmation: confirmPassword
        };
        
        $('#reset-alert').addClass('d-none');

        axios.post(`${API_URL}/reset-password`, data)
            .then(response => {
                alert(response.data.message);
                window.location.href = 'login.html';
            })
            .catch(error => {
                let msg = error.response?.data?.message || 'Reset failed.';
                if (error.response?.data?.errors) {
                    msg = Object.values(error.response.data.errors).flat().join('\n');
                }
                $('#reset-alert').removeClass('alert-info alert-success').addClass('alert-danger').text(msg).removeClass('d-none');
            });
    });

    // Logout
    $('#auth-logout').on('click', function(e) {
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
                    .then(() => {
                        finalizeLogout();
                    })
                    .catch(() => {
                        // Even if server fails, logout locally
                        finalizeLogout();
                    });
            }
        });
    });

    // Load Featured Cars (Index)
    if ($('#featured-cars').length) {
        loadCars(true);
    }

    // Load Popular Cars (Index)
    if ($('#popular-cars').length) {
        loadPopularCars();
    }

    // Load All Cars (Cars page)
    if ($('#cars-list').length) {
        // Default search needs all=true to match the new default filter
        loadCars(false, { status: 'all' });

        // Handle Search Form
        $('#car-search-form').on('submit', function(e) {
            e.preventDefault();
            const search = $('#search-input').val();
            const status = $('#status-filter').val();
            const transmission = $('#transmission-filter').val();
            const fuel_type = $('#fuel-filter').val();
            
            loadCars(false, { search, status, transmission, fuel_type });
        });
    }

    // Booking Modal
    $('#bookingModal').on('show.bs.modal', function (event) {
        const button = $(event.relatedTarget);
        
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            event.preventDefault(); 
            $(this).modal('hide');
            alert('Please login to book a car.');
            window.location.href = 'login.html';
            return;
        }

        const carId = button.data('car-id');
        const carName = button.data('car-name');
        const dailyRate = button.data('daily-rate');

        const modal = $(this);
        modal.find('#modal-car-name').text(carName);
        modal.find('#booking-car-id').val(carId);
        modal.find('#booking-car-id').data('rate', dailyRate);
        modal.find('#total-price').text('0.00');

        // Set min date to tomorrow for pickup
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        // Adjust for timezone offset to ensure the date string is correct for the user's local time
        const offset = tomorrow.getTimezoneOffset();
        const adjustedDate = new Date(tomorrow.getTime() - (offset*60*1000));
        const minDate = adjustedDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
        
        modal.find('#pickup-date').attr('min', minDate);
        modal.find('#pickup-date').val(''); // Reset value
        modal.find('#return-date').val(''); 
        modal.find('#return-date').attr('min', minDate);
    });

    // Calculate Price & Dynamic Date Constraints
    $('#pickup-date').on('change', function() {
        const pickupVal = $(this).val();
        if (pickupVal) {
            // Require return date to be at least the next day
            const pickupDate = new Date(pickupVal);
            const nextDay = new Date(pickupDate);
            nextDay.setDate(pickupDate.getDate() + 1);
            const offset = nextDay.getTimezoneOffset();
            const adjusted = new Date(nextDay.getTime() - (offset * 60 * 1000));
            const minReturn = adjusted.toISOString().split('T')[0];
            $('#return-date').attr('min', minReturn);

            // Clear invalid return selection
            const currentReturn = $('#return-date').val();
            if (currentReturn && new Date(currentReturn) <= pickupDate) {
                $('#return-date').val('');
            }
        }
        calculatePrice();
    });

    $('#return-date').on('change', calculatePrice);

    function calculatePrice() {
        const pickup = new Date($('#pickup-date').val());
        const dropoff = new Date($('#return-date').val());
        const rate = $('#booking-car-id').data('rate');

        if (pickup && dropoff && dropoff > pickup) {
            const diffTime = Math.abs(dropoff - pickup);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            const total = diffDays * rate;
            $('#total-price').text(total.toFixed(2));
        } else {
            $('#total-price').text('0.00');
        }
    }

    // Submit Booking
    $('#booking-form').on('submit', function(e) {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            Swal.fire({
                icon: 'warning',
                title: 'Login Required',
                text: 'Please login to book a car.',
                confirmButtonText: 'Go to Login'
            }).then(() => {
                window.location.href = 'login.html';
            });
            return;
        }

        const pickupDate = $('#pickup-date').val();
        const returnDate = $('#return-date').val();

        if (!pickupDate || !returnDate) {
            Swal.fire({
                icon: 'warning',
                title: 'Dates required',
                text: 'Please select both pickup and return dates.'
            });
            return;
        }

        const pickup = new Date(pickupDate);
        const dropoff = new Date(returnDate);
        if (dropoff <= pickup) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid dates',
                text: 'Return date must be after pickup date.'
            });
            return;
        }

        const data = {
            user_id: user.user_id,
            car_id: $('#booking-car-id').val(),
            pickup_date: pickupDate,
            return_date: returnDate
        };

        axios.post(`${API_URL}/rentals`, data)
            .then(response => {
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
                    title: "Booking successful!"
                });
                $('#bookingModal').modal('hide');
                $('#booking-form')[0].reset();
            })
            .catch(error => {
                if (error.response?.status === 401) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Session Expired',
                        text: 'Please login again.',
                        confirmButtonText: 'OK'
                    }).then(() => {
                        finalizeLogout();
                    });
                    return;
                }
                
                const errorMessage = error.response?.data?.message || error.message;
                
                // Check if it's a duplicate booking error (overlapping dates)
                if (errorMessage.includes('already booked this car') || errorMessage.includes('overlapping dates')) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Booking Conflict',
                        text: errorMessage,
                        confirmButtonText: 'OK'
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Booking Failed',
                        text: errorMessage,
                        confirmButtonText: 'OK'
                    });
                }
            });
    });
});

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    if (user && token) {
        $('#auth-login, #auth-register').addClass('d-none');
        $('#auth-logout').removeClass('d-none');
        $('#nav-profile').removeClass('d-none');
        $('#nav-my-rentals').removeClass('d-none'); // Added this
    } else {
        $('#auth-login, #auth-register').removeClass('d-none');
        $('#auth-logout').addClass('d-none');
        $('#nav-profile').addClass('d-none');
        $('#nav-my-rentals').addClass('d-none'); // Added this
    }
}

function finalizeLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    checkAuth();
    sessionStorage.setItem('logout_success', 'true');
    window.location.href = 'index.html';
}

function loadCars(featured = false, params = {}) {
    let url = `${API_URL}/cars`;
    const queryParams = new URLSearchParams();

    if (params.search) queryParams.append('search', params.search);
    if (params.status) {
        if (params.status === 'all') {
            queryParams.append('all', 'true');
        } else {
            queryParams.append('status', params.status);
        }
    }
    if (params.transmission) queryParams.append('transmission', params.transmission);
    if (params.fuel_type) queryParams.append('fuel_type', params.fuel_type);

    // Append params to URL if they exist
    if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
    }

    axios.get(url)
        .then(response => {
            const cars = response.data;
            let displayCars = featured ? cars.slice(0, 3) : cars;

            // Sort cars by status: Available > Rented > Maintenance
            // This sort applies to the displayed cars (either all or filtered)
            if (!featured) {
                const statusOrder = { 'available': 1, 'rented': 2, 'maintenance': 3 };
                displayCars.sort((a, b) => {
                    return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
                });
            }

            if (displayCars.length === 0) {
                if (featured) {
                    $('#featured-cars').html('<div class="col-12 text-center"><p>No cars found matching criteria.</p></div>');
                    $('#featured-cars-carousel .carousel-inner').html('<div class="carousel-item active"><div class="text-center p-4"><p>No cars found matching criteria.</p></div></div>');
                } else {
                    $('#cars-list').html('<div class="col-12 text-center"><p>No cars found matching criteria.</p></div>');
                }
                return;
            }

            if (featured) {
                // Featured cars - populate both grid and carousel
                const gridContainer = $('#featured-cars');
                const carouselContainer = $('#featured-cars-carousel .carousel-inner');
                gridContainer.empty();
                carouselContainer.empty();

                displayCars.forEach((car, index) => {
                    const isAvailable = car.status === 'available';
                    const bookBtnDisabled = isAvailable ? '' : 'disabled';
                    const bookBtnText = isAvailable ? 'Book Now' : car.status.charAt(0).toUpperCase() + car.status.slice(1);
                    const btnClass = isAvailable ? 'btn-primary' : 'btn-secondary';
                    const isActive = index === 0 ? 'active' : '';

                    // Desktop Grid View
                    const carHtml = `
                        <div class="col-md-4 mb-4">
                            <div class="card h-100 shadow-sm">
                                <img src="${car.image_url || DEFAULT_CAR_IMAGE}" class="card-img-top" alt="${car.make} ${car.model}" style="object-fit: cover; height: 200px;">
                                <div class="card-body d-flex flex-column">
                                    <h5 class="card-title">${car.make} ${car.model}</h5>
                                    <p class="card-text">
                                        <span class="badge bg-secondary">${car.category}</span>
                                        <span class="badge bg-info text-dark">${car.transmission}</span>
                                        <span class="badge ${isAvailable ? 'bg-success' : 'bg-danger'}">${car.status}</span>
                                    </p>
                                    <p class="card-text mt-auto">
                                        <strong>₱${car.daily_rate}/day</strong>
                                    </p>
                                    <div class="d-flex gap-2 mt-2">
                                        <button class="btn btn-outline-primary flex-grow-1" 
                                            onclick="showCarDetails(${car.car_id})">
                                            Details
                                        </button>
                                        <button class="btn ${btnClass} flex-grow-1" 
                                            data-bs-toggle="modal" 
                                            data-bs-target="#bookingModal"
                                            data-car-id="${car.car_id}"
                                            data-car-name="${car.make} ${car.model}"
                                            data-daily-rate="${car.daily_rate}"
                                            ${bookBtnDisabled}>
                                            ${bookBtnText}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    gridContainer.append(carHtml);

                    // Mobile Carousel View
                    const carouselHtml = `
                        <div class="carousel-item ${isActive}">
                            <div class="px-3">
                                <div class="card shadow-sm">
                                    <img src="${car.image_url || DEFAULT_CAR_IMAGE}" class="card-img-top" alt="${car.make} ${car.model}" style="object-fit: cover; height: 250px;">
                                    <div class="card-body">
                                        <h5 class="card-title">${car.make} ${car.model}</h5>
                                        <p class="card-text">
                                            <span class="badge bg-secondary">${car.category}</span>
                                            <span class="badge bg-info text-dark">${car.transmission}</span>
                                            <span class="badge ${isAvailable ? 'bg-success' : 'bg-danger'}">${car.status}</span>
                                        </p>
                                        <p class="card-text">
                                            <strong>₱${car.daily_rate}/day</strong>
                                        </p>
                                        <div class="d-flex gap-2">
                                            <button class="btn btn-outline-primary flex-grow-1" 
                                                onclick="showCarDetails(${car.car_id})">
                                                Details
                                            </button>
                                            <button class="btn ${btnClass} flex-grow-1" 
                                                data-bs-toggle="modal" 
                                                data-bs-target="#bookingModal"
                                                data-car-id="${car.car_id}"
                                                data-car-name="${car.make} ${car.model}"
                                                data-daily-rate="${car.daily_rate}"
                                                ${bookBtnDisabled}>
                                                ${bookBtnText}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    carouselContainer.append(carouselHtml);
                });
            } else {
                // Regular cars list - just populate the grid
                const container = $('#cars-list');
                container.empty();

                displayCars.forEach(car => {
                    const isAvailable = car.status === 'available';
                    const bookBtnDisabled = isAvailable ? '' : 'disabled';
                    const bookBtnText = isAvailable ? 'Book Now' : car.status.charAt(0).toUpperCase() + car.status.slice(1);
                    const btnClass = isAvailable ? 'btn-primary' : 'btn-secondary';

                    const carHtml = `
                        <div class="col-md-4 mb-4">
                            <div class="card h-100 shadow-sm">
                                <img src="${car.image_url || DEFAULT_CAR_IMAGE}" class="card-img-top" alt="${car.make} ${car.model}" style="object-fit: cover; height: 200px;">
                                <div class="card-body d-flex flex-column">
                                    <h5 class="card-title">${car.make} ${car.model}</h5>
                                    <p class="card-text">
                                        <span class="badge bg-secondary">${car.category}</span>
                                        <span class="badge bg-info text-dark">${car.transmission}</span>
                                        <span class="badge ${isAvailable ? 'bg-success' : 'bg-danger'}">${car.status}</span>
                                    </p>
                                    <p class="card-text mt-auto">
                                        <strong>₱${car.daily_rate}/day</strong>
                                    </p>
                                    <div class="d-flex gap-2 mt-2">
                                        <button class="btn btn-outline-primary flex-grow-1" 
                                            onclick="showCarDetails(${car.car_id})">
                                            Details
                                        </button>
                                        <button class="btn ${btnClass} flex-grow-1" 
                                            data-bs-toggle="modal" 
                                            data-bs-target="#bookingModal"
                                            data-car-id="${car.car_id}"
                                            data-car-name="${car.make} ${car.model}"
                                            data-daily-rate="${car.daily_rate}"
                                            ${bookBtnDisabled}>
                                            ${bookBtnText}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    container.append(carHtml);
                });
            }
        })
        .catch(error => {
            console.error('Error loading cars:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
            const statusCode = error.response?.status || 'N/A';
            
            if (featured) {
                $('#featured-cars').html(`
                    <div class="col-12 text-center text-danger">
                        <p><strong>Failed to load cars</strong></p>
                        <p class="small">Error: ${errorMsg}</p>
                        <p class="small">Status: ${statusCode}</p>
                        <p class="small">API: ${API_URL}/cars</p>
                        <p class="small mt-2"><a href="${API_URL}/cars" target="_blank">Test API directly</a></p>
                    </div>
                `);
                $('#featured-cars-carousel .carousel-inner').html(`
                    <div class="carousel-item active">
                        <div class="text-center p-4 text-danger">
                            <p><strong>Failed to load cars</strong></p>
                            <p class="small">Error: ${errorMsg}</p>
                        </div>
                    </div>
                `);
            } else {
                $('#cars-list').html(`
                    <div class="col-12 text-center text-danger">
                        <p><strong>Failed to load cars</strong></p>
                        <p class="small">Error: ${errorMsg}</p>
                        <p class="small">Status: ${statusCode}</p>
                        <p class="small"><a href="${API_URL}/cars" target="_blank">Test API directly</a></p>
                    </div>
                `);
            }
        });
}

function loadPopularCars() {
    axios.get(`${API_URL}/cars/popular?limit=3`)
        .then(response => {
            const cars = response.data;
            const gridContainer = $('#popular-cars');
            const carouselContainer = $('#popular-cars-carousel .carousel-inner');
            
            gridContainer.empty();
            carouselContainer.empty();

            if (cars.length === 0) {
                gridContainer.html('<div class="col-12 text-center"><p>No popular cars found.</p></div>');
                carouselContainer.html('<div class="carousel-item active"><div class="text-center p-4"><p>No popular cars found.</p></div></div>');
                return;
            }

            cars.forEach((car, index) => {
                const isAvailable = car.status === 'available';
                const bookBtnDisabled = isAvailable ? '' : 'disabled';
                const bookBtnText = isAvailable ? 'Book Now' : car.status.charAt(0).toUpperCase() + car.status.slice(1);
                const btnClass = isAvailable ? 'btn-primary' : 'btn-secondary';
                const rentalCount = car.rental_count || 0;
                const isActive = index === 0 ? 'active' : '';

                // Desktop Grid View
                const carHtml = `
                    <div class="col-md-4 mb-4">
                        <div class="card h-100 shadow-sm">
                            <div class="position-relative">
                                <img src="${car.image_url || DEFAULT_CAR_IMAGE}" class="card-img-top" alt="${car.make} ${car.model}" style="object-fit: cover; height: 200px;">
                                ${rentalCount > 0 ? `<span class="badge bg-warning position-absolute top-0 end-0 m-2">${rentalCount} Rentals</span>` : ''}
                            </div>
                            <div class="card-body d-flex flex-column">
                                <h5 class="card-title">${car.make} ${car.model}</h5>
                                <p class="card-text">
                                    <span class="badge bg-secondary">${car.category}</span>
                                    <span class="badge bg-info text-dark">${car.transmission}</span>
                                    <span class="badge ${isAvailable ? 'bg-success' : 'bg-danger'}">${car.status}</span>
                                </p>
                                <p class="card-text mt-auto">
                                    <strong>₱${car.daily_rate}/day</strong>
                                </p>
                                <div class="d-flex gap-2 mt-2">
                                    <button class="btn btn-outline-primary flex-grow-1" 
                                        onclick="showCarDetails(${car.car_id})">
                                        Details
                                    </button>
                                    <button class="btn ${btnClass} flex-grow-1" 
                                        data-bs-toggle="modal" 
                                        data-bs-target="#bookingModal"
                                        data-car-id="${car.car_id}"
                                        data-car-name="${car.make} ${car.model}"
                                        data-daily-rate="${car.daily_rate}"
                                        ${bookBtnDisabled}>
                                        ${bookBtnText}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                gridContainer.append(carHtml);

                // Mobile Carousel View
                const carouselHtml = `
                    <div class="carousel-item ${isActive}">
                        <div class="px-3">
                            <div class="card shadow-sm">
                                <div class="position-relative">
                                    <img src="${car.image_url || DEFAULT_CAR_IMAGE}" class="card-img-top" alt="${car.make} ${car.model}" style="object-fit: cover; height: 250px;">
                                    ${rentalCount > 0 ? `<span class="badge bg-warning position-absolute top-0 end-0 m-2">${rentalCount} Rentals</span>` : ''}
                                </div>
                                <div class="card-body">
                                    <h5 class="card-title">${car.make} ${car.model}</h5>
                                    <p class="card-text">
                                        <span class="badge bg-secondary">${car.category}</span>
                                        <span class="badge bg-info text-dark">${car.transmission}</span>
                                        <span class="badge ${isAvailable ? 'bg-success' : 'bg-danger'}">${car.status}</span>
                                    </p>
                                    <p class="card-text">
                                        <strong>₱${car.daily_rate}/day</strong>
                                    </p>
                                    <div class="d-flex gap-2">
                                        <button class="btn btn-outline-primary flex-grow-1" 
                                            onclick="showCarDetails(${car.car_id})">
                                            Details
                                        </button>
                                        <button class="btn ${btnClass} flex-grow-1" 
                                            data-bs-toggle="modal" 
                                            data-bs-target="#bookingModal"
                                            data-car-id="${car.car_id}"
                                            data-car-name="${car.make} ${car.model}"
                                            data-daily-rate="${car.daily_rate}"
                                            ${bookBtnDisabled}>
                                            ${bookBtnText}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                carouselContainer.append(carouselHtml);
            });
        })
        .catch(error => {
            console.error('Error loading popular cars:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
            const statusCode = error.response?.status || 'N/A';
            
            $('#popular-cars').html(`
                <div class="col-12 text-center text-danger">
                    <p><strong>Failed to load popular cars</strong></p>
                    <p class="small">Error: ${errorMsg}</p>
                    <p class="small">Status: ${statusCode}</p>
                    <p class="small"><a href="${API_URL}/cars/popular?limit=3" target="_blank">Test API directly</a></p>
                </div>
            `);
            $('#popular-cars-carousel .carousel-inner').html(`
                <div class="carousel-item active">
                    <div class="text-center p-4 text-danger">
                        <p><strong>Failed to load popular cars</strong></p>
                        <p class="small">Error: ${errorMsg}</p>
                    </div>
                </div>
            `);
        });
}

// Global function to be accessible from onclick
window.showCarDetails = function(id) {
    axios.get(`${API_URL}/cars/${id}`)
        .then(response => {
            const car = response.data;
            
            // Populate Modal
            $('#details-car-name').text(`${car.make} ${car.model}`);
            $('#details-car-image').attr('src', car.image_url || DEFAULT_CAR_IMAGE);
            $('#details-make-model').text(`${car.make} ${car.model}`);
            $('#details-category').text(car.category);
            $('#details-year').text(car.year);
            $('#details-transmission').text(car.transmission);
            $('#details-fuel').text(car.fuel_type);
            $('#details-seats').text(car.seat_capacity);
            $('#details-rate').text(car.daily_rate);
            
            const statusBadge = car.status === 'available' 
                ? '<span class="badge bg-success">Available for Rent</span>' 
                : `<span class="badge bg-secondary">${car.status}</span>`;
            $('#details-status').html(statusBadge);

            // Show Modal
            $('#carDetailsModal').modal('show');
        })
        .catch(error => {
            alert('Failed to load car details');
            console.error(error);
        });
}
