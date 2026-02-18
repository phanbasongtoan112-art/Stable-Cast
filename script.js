document.addEventListener('DOMContentLoaded', () => {

    // 1. DOM ELEMENTS
    const loginOverlay = document.getElementById('loginOverlay');
    const mainApp = document.querySelector('.main-app-container');
    const loginMsg = document.getElementById('loginMsg');
    
    // Auth inputs
    const authTitle = document.getElementById('authTitle');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const mainAuthBtn = document.getElementById('mainAuthBtn');
    const toggleAuthBtn = document.getElementById('toggleAuthBtn');

    // Chart elements
    const btcPriceEl = document.getElementById('btcPrice');
    const predPriceEl = document.getElementById('predPrice');
    let chartInstance = null;
    let updateInterval = null;
    let isRegisterMode = false;

    // 2. AUTHENTICATION LOGIC
    toggleAuthBtn.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        loginMsg.textContent = "";
        
        if (isRegisterMode) {
            authTitle.textContent = "SYSTEM REGISTER";
            mainAuthBtn.textContent = "REGISTER";
            toggleAuthBtn.textContent = "ALREADY HAVE ACCOUNT? LOGIN";
            emailInput.placeholder = "NEW USER ID";
            authTitle.style.borderBottomColor = "#3b82f6";
            mainAuthBtn.style.background = "#3b82f6";
        } else {
            authTitle.textContent = "SYSTEM LOGIN";
            mainAuthBtn.textContent = "LOGIN";
            toggleAuthBtn.textContent = "NEW OPERATOR? REGISTER";
            emailInput.placeholder = "ENTER ID";
            authTitle.style.borderBottomColor = "#0ecb81";
            mainAuthBtn.style.background = "#0ecb81";
        }
    });

    mainAuthBtn.addEventListener('click', processAuth);
    passInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') processAuth() });

    function processAuth() {
        const email = emailInput.value.trim();
        const password = passInput.value.trim();

        // Guest Login (Empty fields)
        if (!email && !password && !isRegisterMode) {
            loginSuccess({ name: "GUEST OPERATOR", id: "GUEST", email: "guest@stablecast.io" });
            return;
        }

        if (!email || !password) {
            showError("Please enter ID and Passcode");
            return;
        }

        if (isRegisterMode) {
            // Register
            if (localStorage.getItem('user_' + email)) {
                showError("User ID already exists!");
            } else {
                const newUser = { email, password, name: "Operator " + Math.floor(Math.random()*100), id: "OP-"+Date.now() };
                localStorage.setItem('user_' + email, JSON.stringify(newUser));
                showSuccess("Registered! Logging in...");
                setTimeout(() => { toggleAuthBtn.click(); emailInput.value = email; passInput.value = ""; }, 1000);
            }
        } else {
            // Login
            if (email === "admin" && password === "123") {
                loginSuccess({ name: "ADMINISTRATOR", id: "ADMIN", email: "admin@sys.com" });
                return;
            }
            const stored = localStorage.getItem('user_' + email);
            if (stored && JSON.parse(stored).password === password) {
                loginSuccess(JSON.parse(stored));
            } else {
                showError("Invalid ID or Password");
            }
        }
    }

    function showError(msg) { loginMsg.textContent = msg; loginMsg.style.color = "#f6465d"; }
    function showSuccess(msg) { loginMsg.textContent = msg; loginMsg.style.color = "#0ecb81"; }

    function loginSuccess(user) {
        showSuccess("ACCESS GRANTED...");
        setTimeout(() => {
            loginOverlay.style.opacity = "0";
            setTimeout(() => {
                loginOverlay.style.display = "none";
                mainApp.style.display = "block";
                setTimeout(() => mainApp.style.opacity = "1", 50);
                
                // Update Profile
                document.getElementById('profile-name-txt').textContent = user.name;
                document.getElementById('profile-id-txt').textContent = user.id;
                document.getElementById('profile-email-txt').textContent = user.email;

                // START CHART
                initLiveChart();
            }, 500);
        }, 800);
    }

    // 3. LIVE CHART LOGIC (Biểu đồ động)
    function initLiveChart() {
        const ctx = document.getElementById('mainChart');
        if (!ctx) return;

        // Init data
        let price = 42350.00;
        let dataPoints = Array.from({length: 40}, () => {
            price += (Math.random() - 0.5) * 50;
            return price;
        });
        let labels = Array.from({length: 40}, (_, i) => i);

        // Create Chart
        chartInstance = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'BTC/USDT',
                    data: dataPoints,
                    borderColor: '#0ecb81',
                    backgroundColor: (context) => {
                        const bgCtx = context.chart.ctx;
                        const gradient = bgCtx.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, 'rgba(14, 203, 129, 0.2)');
                        gradient.addColorStop(1, 'rgba(14, 203, 129, 0)');
                        return gradient;
                    },
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'AI Pred',
                    data: dataPoints.map(v => v + (Math.random()*100)),
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false, // Tắt animation mặc định để update mượt
                plugins: { legend: {display: false} },
                scales: {
                    x: { display: false },
                    y: { position: 'right', grid: {color: '#222'} }
                }
            }
        });

        // Start Loop
        if(updateInterval) clearInterval(updateInterval);
        updateInterval = setInterval(() => {
            // Update real price
            const lastPrice = dataPoints[dataPoints.length - 1];
            const newPrice = lastPrice + (Math.random() - 0.5) * 60;
            
            dataPoints.shift();
            dataPoints.push(newPrice);
            
            // Update AI price
            const aiData = chartInstance.data.datasets[1].data;
            aiData.shift();
            aiData.push(newPrice + (Math.random() * 80));

            chartInstance.update();

            // Update DOM numbers
            if(btcPriceEl) {
                btcPriceEl.textContent = newPrice.toFixed(2);
                btcPriceEl.style.color = newPrice >= lastPrice ? '#0ecb81' : '#f6465d';
            }
            if(predPriceEl) predPriceEl.textContent = (newPrice + 50).toFixed(2);
            
        }, 1000); // 1 giây cập nhật 1 lần
    }

    // 4. TAB SWITCHING
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
