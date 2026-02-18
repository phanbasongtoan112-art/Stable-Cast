/* script.js - BASIC AUTH & LIVE CHART */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. KHAI BÁO BIẾN CHUNG ---
    const loginOverlay = document.getElementById('loginOverlay');
    const mainApp = document.querySelector('.main-app-container');
    const btcPriceEl = document.getElementById('btcPrice');
    const predPriceEl = document.getElementById('predPrice');
    let chartInstance = null; // Biến giữ biểu đồ để cập nhật
    let priceInterval = null; // Biến giữ timer cập nhật giá

    // Form & Auth Elements
    const authTitle = document.getElementById('authTitle');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const mainAuthBtn = document.getElementById('mainAuthBtn');
    const toggleAuthBtn = document.getElementById('toggleAuthBtn');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    
    // Tạo div thông báo lỗi nếu chưa có
    let loginMsg = document.getElementById('loginMsg');
    if (!loginMsg) {
        loginMsg = document.createElement('div');
        loginMsg.id = 'loginMsg';
        loginMsg.style.marginTop = '15px';
        loginMsg.style.minHeight = '20px';
        loginMsg.style.fontSize = '0.9rem';
        document.querySelector('.login-box').appendChild(loginMsg);
    }

    let isRegisterMode = false;

    // --- 2. XỬ LÝ AUTHENTICATION (LOGIN/REGISTER) ---
    
    toggleAuthBtn.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        loginMsg.textContent = "";
        if (isRegisterMode) {
            authTitle.textContent = "SYSTEM REGISTER";
            mainAuthBtn.textContent = "REGISTER ACCESS";
            toggleAuthBtn.textContent = "ALREADY HAVE AN ACCOUNT? LOGIN";
            emailInput.placeholder = "ENTER NEW ID";
            authTitle.style.borderBottomColor = "#3b82f6";
            mainAuthBtn.style.background = "#3b82f6";
        } else {
            authTitle.textContent = "SYSTEM LOGIN";
            mainAuthBtn.textContent = "LOGIN";
            toggleAuthBtn.textContent = "NEW OPERATOR? REGISTER ACCESS";
            emailInput.placeholder = "ENTER ID";
            authTitle.style.borderBottomColor = "#0ecb81";
            mainAuthBtn.style.background = "#0ecb81";
        }
    });

    mainAuthBtn.addEventListener('click', handleMainAuth);
    passInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleMainAuth(); });

    function handleMainAuth() {
        const email = emailInput.value.trim();
        const password = passInput.value.trim();

        // Guest Login
        if (!email && !password && !isRegisterMode) {
            loginSuccess({ name: "GUEST OPERATOR", id: "GUEST", email: "guest@stablecast.io", role: "Visitor" });
            return;
        }

        if (!email || !password) { showError("Please enter credentials."); return; }

        if (isRegisterMode) {
            // Register
            if (localStorage.getItem('user_' + email)) {
                showError("ID exists.");
            } else {
                const newUser = { email, password, name: "Operator " + Math.floor(Math.random()*1000), id: "OP-"+Date.now() };
                localStorage.setItem('user_' + email, JSON.stringify(newUser));
                showSuccess("Registered! Logging in...");
                setTimeout(() => { toggleAuthBtn.click(); emailInput.value = email; passInput.value = ""; }, 1000);
            }
        } else {
            // Login
            if (email === "admin" && password === "123") {
                loginSuccess({ name: "ADMINISTRATOR", id: "ADMIN", email: "admin@sys.com", role: "Admin" });
                return;
            }
            const stored = localStorage.getItem('user_' + email);
            if (stored && JSON.parse(stored).password === password) {
                loginSuccess(JSON.parse(stored));
            } else {
                showError("Invalid credentials.");
            }
        }
    }

    function loginSuccess(userData) {
        showSuccess("AUTHENTICATION SUCCESSFUL...");
        setTimeout(() => {
            loginOverlay.style.opacity = "0";
            setTimeout(() => {
                loginOverlay.style.display = "none";
                mainApp.style.display = "block";
                setTimeout(() => mainApp.style.opacity = "1", 50);
                
                // Update Profile UI
                document.getElementById('profile-name-txt').textContent = userData.name;
                document.getElementById('profile-id-txt').textContent = userData.id;
                
                // === KÍCH HOẠT BIỂU ĐỒ ===
                initLiveChart(); 
                
            }, 500);
        }, 800);
    }

    function showError(msg) { loginMsg.textContent = msg; loginMsg.style.color = "#f6465d"; }
    function showSuccess(msg) { loginMsg.textContent = msg; loginMsg.style.color = "#0ecb81"; }
    
    if(googleLoginBtn) googleLoginBtn.addEventListener('click', () => alert("Feature maintenance."));


    // =========================================================================
    // 3. LOGIC BIỂU ĐỒ ĐỘNG (LIVE CHART) & GIẢ LẬP GIÁ BTC
    // =========================================================================

    function initLiveChart() {
        const ctx = document.getElementById('mainChart');
        if (!ctx) return;

        // Dữ liệu khởi tạo (20 điểm giá)
        let dataPoints = [];
        let labels = [];
        let currentPrice = 42350.00; // Giá bắt đầu

        for (let i = 0; i < 30; i++) {
            labels.push(i);
            // Tạo dao động ngẫu nhiên
            currentPrice = currentPrice + (Math.random() - 0.5) * 50; 
            dataPoints.push(currentPrice);
        }

        // Cấu hình Chart.js
        chartInstance = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'BTC/USDT',
                    data: dataPoints,
                    borderColor: '#0ecb81',       // Màu xanh lá chuẩn trading
                    backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, 'rgba(14, 203, 129, 0.2)'); // Xanh mờ ở trên
                        gradient.addColorStop(1, 'rgba(14, 203, 129, 0)');   // Trong suốt ở dưới
                        return gradient;
                    },
                    borderWidth: 2,
                    pointRadius: 0,               // Ẩn các dấu chấm tròn
                    pointHoverRadius: 4,
                    tension: 0.4,                 // Độ cong mềm mại của đường
                    fill: true
                },
                {
                    label: 'AI Forecast',         // Đường dự đoán AI (Nét đứt)
                    data: dataPoints.map(p => p + (Math.random() - 0.5) * 100 + 50),
                    borderColor: '#3b82f6',       // Màu xanh dương
                    borderWidth: 2,
                    borderDash: [5, 5],           // Nét đứt
                    pointRadius: 0,
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },   // Ẩn chú thích
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#848e9c',
                        bodyColor: '#fff',
                        borderColor: '#333',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: { display: false },        // Ẩn trục X
                    y: { 
                        display: true,            // Hiện trục Y (Giá)
                        position: 'right',        // Đặt bên phải giống sàn
                        grid: {
                            color: '#1e2329'      // Màu lưới mờ
                        },
                        ticks: {
                            color: '#848e9c',     // Màu chữ trục Y
                            font: { family: 'JetBrains Mono', size: 10 }
                        }
                    }
                },
                animation: false,                 // Tắt animation mặc định để update mượt hơn
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });

        // Bắt đầu vòng lặp cập nhật giá (Mỗi 1 giây)
        startPriceSimulation(currentPrice);
    }

    function startPriceSimulation(startPrice) {
        let currentPrice = startPrice;
        
        // Hủy interval cũ nếu có
        if (priceInterval) clearInterval(priceInterval);

        priceInterval = setInterval(() => {
            if (!chartInstance) return;

            // 1. Tạo biến động giá ngẫu nhiên (-30 đến +30 USD)
            const change = (Math.random() - 0.5) * 60;
            currentPrice += change;

            // 2. Cập nhật số hiển thị lớn
            if (btcPriceEl) {
                btcPriceEl.innerText = currentPrice.toFixed(2);
                // Đổi màu xanh/đỏ tùy theo tăng/giảm
                btcPriceEl.style.color = change >= 0 ? '#0ecb81' : '#f6465d';
            }
            
            // 3. Cập nhật giá dự đoán AI (lệch nhẹ so với giá thật)
            const aiPrice = currentPrice + (Math.random() * 100); 
            if (predPriceEl) predPriceEl.innerText = aiPrice.toFixed(2);

            // 4. Cập nhật dữ liệu biểu đồ
            const chartData = chartInstance.data.datasets[0].data;
            const aiData = chartInstance.data.datasets[1].data;

            // Xóa điểm cũ nhất, thêm điểm mới nhất (Hiệu ứng cuộn)
            chartData.shift();
            chartData.push(currentPrice);
            
            aiData.shift();
            aiData.push(aiPrice);

            // Vẽ lại biểu đồ
            chartInstance.update();

        }, 1000); // Cập nhật mỗi 1000ms (1 giây)
    }

    // --- 4. LOGIC CHUYỂN TAB ---
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
