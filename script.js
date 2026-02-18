/* script.js - BASIC AUTHENTICATION ONLY */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. KHAI BÁO CÁC PHẦN TỬ DOM (Dựa trên HTML của bạn) ---
    const loginOverlay = document.getElementById('loginOverlay');
    const mainApp = document.querySelector('.main-app-container');
    
    // Form & Buttons
    const authTitle = document.getElementById('authTitle');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const mainAuthBtn = document.getElementById('mainAuthBtn');
    const toggleAuthBtn = document.getElementById('toggleAuthBtn');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    
    // Tạo div hiển thị thông báo lỗi (nếu chưa có trong HTML)
    let loginMsg = document.getElementById('loginMsg');
    if (!loginMsg) {
        loginMsg = document.createElement('div');
        loginMsg.id = 'loginMsg';
        loginMsg.style.marginTop = '15px';
        loginMsg.style.minHeight = '20px';
        loginMsg.style.fontSize = '0.9rem';
        document.querySelector('.login-box').appendChild(loginMsg);
    }

    // Biến trạng thái: false = Đang ở màn Login, true = Đang ở màn Register
    let isRegisterMode = false;

    // --- 2. XỬ LÝ CHUYỂN ĐỔI GIỮA LOGIN VÀ REGISTER ---
    toggleAuthBtn.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        loginMsg.textContent = ""; // Xóa thông báo lỗi cũ

        if (isRegisterMode) {
            // Chuyển sang giao diện Đăng ký
            authTitle.textContent = "SYSTEM REGISTER";
            mainAuthBtn.textContent = "REGISTER ACCESS";
            toggleAuthBtn.textContent = "ALREADY HAVE AN ACCOUNT? LOGIN";
            emailInput.placeholder = "ENTER NEW ID / EMAIL";
            authTitle.style.borderBottomColor = "#3b82f6"; // Đổi màu xanh dương
            mainAuthBtn.style.background = "#3b82f6";
        } else {
            // Chuyển về giao diện Đăng nhập
            authTitle.textContent = "SYSTEM LOGIN";
            mainAuthBtn.textContent = "LOGIN";
            toggleAuthBtn.textContent = "NEW OPERATOR? REGISTER ACCESS";
            emailInput.placeholder = "ENTER ID";
            authTitle.style.borderBottomColor = "#0ecb81"; // Đổi về màu xanh lá
            mainAuthBtn.style.background = "#0ecb81";
        }
    });

    // --- 3. XỬ LÝ SỰ KIỆN KHI BẤM NÚT LOGIN/REGISTER ---
    mainAuthBtn.addEventListener('click', handleMainAuth);

    // Hỗ trợ bấm phím Enter để login
    passInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleMainAuth();
    });

    function handleMainAuth() {
        const email = emailInput.value.trim();
        const password = passInput.value.trim();

        // >>> TRƯỜNG HỢP 1: GUEST LOGIN (Để trống cả 2 ô) <<<
        if (!email && !password && !isRegisterMode) {
            loginSuccess({
                name: "GUEST OPERATOR",
                id: "GUEST-MODE",
                email: "guest@stablecast.io",
                role: "Visitor"
            });
            return;
        }

        // Validate cơ bản
        if (!email || !password) {
            showError("Please enter ID and Passcode.");
            return;
        }

        // >>> TRƯỜNG HỢP 2: ĐĂNG KÝ TÀI KHOẢN <<<
        if (isRegisterMode) {
            // Kiểm tra xem ID này đã tồn tại trong bộ nhớ trình duyệt chưa
            if (localStorage.getItem('user_' + email)) {
                showError("ID already exists. Please choose another.");
            } else {
                // Tạo user mới
                const newUser = {
                    email: email,
                    password: password,
                    name: "Operator " + Math.floor(Math.random() * 1000), // Tên ngẫu nhiên
                    id: "OP-" + Date.now().toString().slice(-6), // ID ngẫu nhiên
                    role: "Trader"
                };
                
                // Lưu vào LocalStorage
                localStorage.setItem('user_' + email, JSON.stringify(newUser));
                
                showSuccess("Register Success! Switching to Login...");
                
                // Tự động chuyển về màn hình login sau 1 giây
                setTimeout(() => {
                    toggleAuthBtn.click(); // Giả lập bấm nút chuyển tab
                    emailInput.value = email; // Điền sẵn email
                    passInput.value = "";
                }, 1000);
            }
        } 
        // >>> TRƯỜNG HỢP 3: ĐĂNG NHẬP <<<
        else {
            // 3.1 Check tài khoản ADMIN cứng (Test nhanh)
            if (email === "admin" && password === "123") {
                loginSuccess({
                    name: "ADMINISTRATOR",
                    id: "DE200247",
                    email: "toanpbs@fpt.edu.vn",
                    role: "Lead Developer"
                });
                return;
            }

            // 3.2 Check tài khoản đã đăng ký (trong LocalStorage)
            const storedUser = localStorage.getItem('user_' + email);
            if (storedUser) {
                const userObj = JSON.parse(storedUser);
                if (userObj.password === password) {
                    loginSuccess(userObj);
                } else {
                    showError("Incorrect Passcode.");
                }
            } else {
                showError("User ID not found.");
            }
        }
    }

    // --- 4. HÀM XỬ LÝ KHI ĐĂNG NHẬP THÀNH CÔNG ---
    function loginSuccess(userData) {
        showSuccess("AUTHENTICATION SUCCESSFUL...");
        
        // Hiệu ứng chuyển cảnh
        setTimeout(() => {
            loginOverlay.style.transition = "opacity 0.5s ease";
            loginOverlay.style.opacity = "0";
            
            setTimeout(() => {
                loginOverlay.style.display = "none";
                mainApp.style.display = "block";
                
                // Fade-in App chính
                setTimeout(() => { mainApp.style.opacity = "1"; }, 50);

                // Cập nhật thông tin lên giao diện Profile
                updateProfileUI(userData);
                
                // Khởi động các chức năng bên trong (Biểu đồ, Tab...)
                initAppFunctions();
            }, 500);
        }, 800);
    }

    // Cập nhật giao diện Profile
    function updateProfileUI(user) {
        document.getElementById('profile-name-txt').textContent = user.name;
        document.getElementById('profile-id-txt').textContent = user.id;
        document.getElementById('profile-email-txt').textContent = user.email;
        if(user.role) document.getElementById('profile-role-txt').textContent = user.role + " | StableCast";
        
        // Nếu user có avatar riêng (ví dụ admin) thì set, ko thì giữ mặc định
        if(user.avatar) document.getElementById('profile-avatar-img').src = user.avatar;
    }

    // --- 5. CÁC HÀM TIỆN ÍCH HIỂN THỊ THÔNG BÁO ---
    function showError(msg) {
        loginMsg.textContent = msg;
        loginMsg.style.color = "#f6465d"; // Màu đỏ
    }

    function showSuccess(msg) {
        loginMsg.textContent = msg;
        loginMsg.style.color = "#0ecb81"; // Màu xanh
    }

    // --- 6. VÔ HIỆU HÓA NÚT GOOGLE (THEO YÊU CẦU) ---
    if(googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            alert("Tính năng đăng nhập Google đang bảo trì. Vui lòng sử dụng đăng nhập thông thường.");
        });
    }

    // =========================================================
    // PHẦN LOGIC CỦA ỨNG DỤNG SAU KHI ĐĂNG NHẬP (TAB, CHART...)
    // =========================================================
    function initAppFunctions() {
        
        // 1. Logic chuyển Tab (Terminal / Community / Profile)
        const navBtns = document.querySelectorAll('.nav-btn');
        const views = document.querySelectorAll('.view-section');

        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                navBtns.forEach(b => b.classList.remove('active'));
                views.forEach(v => v.classList.remove('active-view'));
                
                btn.classList.add('active');
                
                if(btn.id === 'btn-terminal') document.getElementById('dashboard-view').classList.add('active-view');
                if(btn.id === 'btn-community') document.getElementById('community-view').classList.add('active-view');
                if(btn.id === 'btn-profile') document.getElementById('profile-view').classList.add('active-view');
            });
        });

        // 2. Vẽ Biểu đồ Chart.js
        const ctx = document.getElementById('mainChart');
        if (ctx) {
            // Tạo dữ liệu giả lập cho biểu đồ
            const labels = Array.from({length: 20}, (_, i) => i + 1);
            const data = Array.from({length: 20}, () => 40000 + Math.random() * 2000);

            new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'BTC/USDT',
                        data: data,
                        borderColor: '#0ecb81',
                        backgroundColor: 'rgba(14, 203, 129, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { display: false }, 
                        y: { display: false }
                    },
                    animation: { duration: 1500 }
                }
            });

            // Cập nhật các con số ngẫu nhiên cho sinh động
            document.getElementById('btcPrice').innerText = "42,350.00";
            document.getElementById('predPrice').innerText = "42,800.50";
            document.getElementById('stopLoss').innerText = "41,500";
            document.getElementById('takeProfit').innerText = "43,200";
        }
    }
});
