/* script.js */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. KHAI BÁO CÁC PHẦN TỬ (Dựa trên HTML cũ của bạn) ---
    const loginOverlay = document.getElementById('loginOverlay');
    const mainApp = document.querySelector('.main-app-container');
    
    // Form Elements
    const authTitle = document.getElementById('authTitle');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const mainAuthBtn = document.getElementById('mainAuthBtn');
    const toggleAuthBtn = document.getElementById('toggleAuthBtn');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const loginMsg = document.getElementById('loginMsg'); 

    // Biến trạng thái: False = Login, True = Register
    let isRegisterMode = false;

    // --- 2. XỬ LÝ CHUYỂN ĐỔI LOGIN <-> REGISTER ---
    toggleAuthBtn.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        loginMsg.textContent = ""; // Xóa thông báo cũ

        if (isRegisterMode) {
            authTitle.textContent = "SYSTEM REGISTER";
            mainAuthBtn.textContent = "REGISTER ACCESS";
            toggleAuthBtn.textContent = "ALREADY HAVE AN ACCOUNT? LOGIN";
            emailInput.placeholder = "ENTER NEW ID / EMAIL";
            authTitle.style.borderBottomColor = "#3b82f6"; // Màu xanh dương
        } else {
            authTitle.textContent = "SYSTEM LOGIN";
            mainAuthBtn.textContent = "LOGIN";
            toggleAuthBtn.textContent = "NEW OPERATOR? REGISTER ACCESS";
            emailInput.placeholder = "ENTER ID";
            authTitle.style.borderBottomColor = "#0ecb81"; // Màu xanh lá
        }
    });

    // --- 3. XỬ LÝ NÚT LOGIN / REGISTER (Nút xanh) ---
    mainAuthBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        const password = passInput.value.trim();

        // [CASE 1] ĐĂNG NHẬP KHÁCH (Không nhập gì)
        if (!email && !password && !isRegisterMode) {
            performLogin({
                name: "GUEST OPERATOR",
                id: "GUEST-MODE",
                email: "guest@stablecast.io",
                role: "Visitor"
            });
            return;
        }

        if (!email || !password) {
            showMsg("Please enter Credentials.", "error");
            return;
        }

        // [CASE 2] ĐĂNG KÝ
        if (isRegisterMode) {
            if (localStorage.getItem('user_' + email)) {
                showMsg("ID already exists!", "error");
            } else {
                const newUser = {
                    email: email,
                    password: password,
                    name: "Operator " + Math.floor(Math.random() * 1000),
                    id: "OP-" + Math.floor(Math.random() * 9000 + 1000),
                    role: "Trader"
                };
                localStorage.setItem('user_' + email, JSON.stringify(newUser));
                
                showMsg("Register Success! Switching to Login...", "success");
                setTimeout(() => {
                    toggleAuthBtn.click();
                    emailInput.value = email;
                    passInput.value = "";
                }, 1000);
            }
        } 
        // [CASE 3] ĐĂNG NHẬP THƯỜNG
        else {
            if (email === "admin" && password === "123") {
                performLogin({
                    name: "ADMINISTRATOR",
                    id: "DE200247",
                    email: "toanpbs@fpt.edu.vn",
                    role: "Lead Developer"
                });
                return;
            }

            const storedUser = localStorage.getItem('user_' + email);
            if (storedUser) {
                const userObj = JSON.parse(storedUser);
                if (userObj.password === password) {
                    performLogin(userObj);
                } else {
                    showMsg("Invalid Passcode.", "error");
                }
            } else {
                showMsg("User not found.", "error");
            }
        }
    });

    // --- 4. XỬ LÝ GOOGLE LOGIN (ĐÃ SỬA LỖI REDIRECT) ---
    googleLoginBtn.addEventListener('click', () => {
        // Thay vì chuyển trang (window.location), ta giả lập quá trình xác thực
        const originalText = googleLoginBtn.innerHTML;
        googleLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CONNECTING GOOGLE...';
        googleLoginBtn.style.opacity = "0.8";

        setTimeout(() => {
            // Giả lập dữ liệu trả về từ Google thành công
            const googleUser = {
                name: "Phan Bá Song Toàn (Google)", // Tên lấy từ Google
                id: "GG-200247",
                email: "phanbasongtoan112@gmail.com", // Email trong ảnh của bạn
                role: "Verified User",
                // Avatar mặc định của Google
                avatar: "https://lh3.googleusercontent.com/a/default-user=s96-c" 
            };
            
            performLogin(googleUser);
            
            // Reset nút (phòng khi user logout ra lại)
            googleLoginBtn.innerHTML = originalText;
            googleLoginBtn.style.opacity = "1";
        }, 1500); // Đợi 1.5s cho giống thật
    });

    // Phím Enter
    passInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') mainAuthBtn.click();
    });

    // --- CÁC HÀM HỖ TRỢ ---
    function showMsg(text, type) {
        loginMsg.textContent = text;
        loginMsg.style.color = type === 'success' ? '#0ecb81' : '#f6465d';
    }

    function performLogin(userData) {
        loginMsg.style.color = "#0ecb81";
        loginMsg.textContent = "AUTHENTICATION SUCCESSFUL...";
        
        setTimeout(() => {
            loginOverlay.style.transition = "opacity 0.5s ease";
            loginOverlay.style.opacity = "0";
            
            setTimeout(() => {
                loginOverlay.style.display = "none";
                mainApp.style.display = "block";
                setTimeout(() => { mainApp.style.opacity = "1"; }, 50);

                updateProfileUI(userData);
                initDashboard(); // Khởi tạo biểu đồ & tab
            }, 500);
        }, 800);
    }

    function updateProfileUI(user) {
        document.getElementById('profile-name-txt').textContent = user.name;
        document.getElementById('profile-id-txt').textContent = user.id;
        document.getElementById('profile-email-txt').textContent = user.email;
        if(user.role) document.getElementById('profile-role-txt').textContent = user.role + " | StableCast";
        if(user.avatar) document.getElementById('profile-avatar-img').src = user.avatar;
    }

    // --- LOGIC APP CHÍNH (TAB & CHART) ---
    function initDashboard() {
        // 1. Chuyển Tab
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

        // 2. Vẽ Chart
        const ctx = document.getElementById('mainChart');
        if (ctx) {
            const labels = Array.from({length: 30}, (_, i) => i + 1);
            const data = Array.from({length: 30}, () => 40000 + Math.random() * 2000);

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
                    scales: { x: { display: false }, y: { display: false } },
                    animation: { duration: 1500 }
                }
            });

            // Update số liệu
            document.getElementById('btcPrice').innerText = "42,350.00";
            document.getElementById('predPrice').innerText = "42,800.50";
            document.getElementById('stopLoss').innerText = "41,500";
            document.getElementById('takeProfit').innerText = "43,200";
        }
    }
});
