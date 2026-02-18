/* script.js - ĐÃ SỬA LỖI NÚT LOGIN */

document.addEventListener('DOMContentLoaded', () => {
    console.log("Script loaded - Ready for Login");

    // --- 1. LẤY CÁC PHẦN TỬ DOM ---
    const loginOverlay = document.getElementById('loginOverlay');
    const mainApp = document.querySelector('.main-app-container');
    const loginMsg = document.getElementById('loginMsg');
    
    // Nút và Input
    const mainAuthBtn = document.getElementById('mainAuthBtn');
    const toggleAuthBtn = document.getElementById('toggleAuthBtn');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const authTitle = document.getElementById('authTitle');

    // Biến trạng thái
    let isRegisterMode = false;

    // --- 2. XỬ LÝ SỰ KIỆN CHUYỂN ĐỔI (LOGIN <-> REGISTER) ---
    if(toggleAuthBtn) {
        toggleAuthBtn.addEventListener('click', () => {
            isRegisterMode = !isRegisterMode;
            // Xóa thông báo lỗi cũ
            if(loginMsg) loginMsg.textContent = "";

            if (isRegisterMode) {
                authTitle.textContent = "SYSTEM REGISTER";
                mainAuthBtn.textContent = "REGISTER";
                toggleAuthBtn.textContent = "ALREADY HAVE ACCOUNT? LOGIN";
                emailInput.placeholder = "CHOOSE USER ID";
                mainAuthBtn.style.backgroundColor = "#3b82f6"; // Màu xanh dương
            } else {
                authTitle.textContent = "SYSTEM LOGIN";
                mainAuthBtn.textContent = "LOGIN";
                toggleAuthBtn.textContent = "NEW OPERATOR? REGISTER";
                emailInput.placeholder = "ENTER ID";
                mainAuthBtn.style.backgroundColor = "#0ecb81"; // Màu xanh lá
            }
        });
    }

    // --- 3. XỬ LÝ SỰ KIỆN NÚT LOGIN (QUAN TRỌNG) ---
    if(mainAuthBtn) {
        mainAuthBtn.addEventListener('click', function(e) {
            e.preventDefault(); // Ngăn form submit mặc định (nếu có)
            console.log("Login button clicked!");

            const email = emailInput.value.trim();
            const password = passInput.value.trim();

            // >>> CASE 1: ĐĂNG NHẬP KHÁCH (Không nhập gì) <<<
            if (!email && !password && !isRegisterMode) {
                console.log("Guest login activated");
                performLogin({
                    name: "GUEST OPERATOR",
                    id: "GUEST-MODE",
                    email: "guest@stablecast.io",
                    role: "Visitor"
                });
                return;
            }

            // Validate dữ liệu
            if (!email || !password) {
                showMsg("Vui lòng nhập ID và Password!", "error");
                return;
            }

            // >>> CASE 2: ĐĂNG KÝ (REGISTER) <<<
            if (isRegisterMode) {
                if (localStorage.getItem('user_' + email)) {
                    showMsg("Tài khoản này đã tồn tại!", "error");
                } else {
                    const newUser = {
                        email: email,
                        password: password,
                        name: "Operator " + Math.floor(Math.random() * 999),
                        id: "OP-" + Date.now().toString().slice(-4)
                    };
                    localStorage.setItem('user_' + email, JSON.stringify(newUser));
                    
                    showMsg("Đăng ký thành công! Hãy đăng nhập.", "success");
                    // Tự động chuyển về tab Login
                    setTimeout(() => { toggleAuthBtn.click(); emailInput.value = email; passInput.value = ""; }, 1000);
                }
            } 
            // >>> CASE 3: ĐĂNG NHẬP (LOGIN) <<<
            else {
                // Admin cứng
                if (email === "admin" && password === "123") {
                    performLogin({ name: "ADMINISTRATOR", id: "ADMIN", email: "admin@system.com" });
                    return;
                }

                // Kiểm tra LocalStorage
                const storedUser = localStorage.getItem('user_' + email);
                if (storedUser) {
                    const userObj = JSON.parse(storedUser);
                    if (userObj.password === password) {
                        performLogin(userObj);
                    } else {
                        showMsg("Sai mật khẩu!", "error");
                    }
                } else {
                    showMsg("Tài khoản không tồn tại!", "error");
                }
            }
        });
    }

    // Hỗ trợ ấn Enter
    if(passInput) {
        passInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') mainAuthBtn.click();
        });
    }


    // --- 4. HÀM XỬ LÝ GIAO DIỆN SAU KHI LOGIN ---
    function showMsg(text, type) {
        if(!loginMsg) return;
        loginMsg.textContent = text;
        loginMsg.style.color = type === 'success' ? '#0ecb81' : '#f6465d';
    }

    function performLogin(user) {
        showMsg("AUTHENTICATION SUCCESSFUL...", "success");
        
        setTimeout(() => {
            // Ẩn màn hình Login
            loginOverlay.style.opacity = "0";
            
            setTimeout(() => {
                loginOverlay.style.display = "none";
                mainApp.style.display = "block"; // Hiện App chính
                
                // Hiệu ứng hiện dần
                setTimeout(() => { mainApp.style.opacity = "1"; }, 50);
                
                // Điền thông tin Profile
                document.getElementById('profile-name-txt').textContent = user.name;
                document.getElementById('profile-id-txt').textContent = user.id;
                document.getElementById('profile-email-txt').textContent = user.email;

                // Khởi động biểu đồ (quan trọng để tránh lỗi chart)
                initChart();

            }, 500);
        }, 800);
    }

    // --- 5. HÀM VẼ BIỂU ĐỒ ĐƠN GIẢN ---
    function initChart() {
        const ctx = document.getElementById('mainChart');
        if (!ctx) return;
        
        // Kiểm tra thư viện Chart.js đã tải chưa
        if (typeof Chart === 'undefined') {
            console.error("Chart.js chưa tải xong!");
            return;
        }

        // Dữ liệu mẫu
        const data = [42000, 42100, 41800, 42200, 42500, 42300, 42800];
        const labels = ["10:00", "10:05", "10:10", "10:15", "10:20", "10:25", "10:30"];

        new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'BTC/USDT',
                    data: data,
                    borderColor: '#0ecb81',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(0, 'rgba(14, 203, 129, 0.2)');
                        gradient.addColorStop(1, 'rgba(14, 203, 129, 0)');
                        return gradient;
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    x: { display: false }, 
                    y: { position: 'right', grid: { color: '#222' } } 
                }
            }
        });
        
        // Cập nhật giá hiển thị
        document.getElementById('btcPrice').innerText = "42,800.00";
    }

    // --- 6. LOGIC CHUYỂN TAB ---
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
});
