// --- CONFIGURATION ---
const logBox = document.getElementById('terminalLogs');
const priceEl = document.getElementById('btcPrice');
const predEl = document.getElementById('predPrice');
const slEl = document.getElementById('stopLoss');
const tpEl = document.getElementById('takeProfit');

let currentPrice = 0;
let priceHistory = [];
let forecastHistory = []; // Mảng chứa dữ liệu dự đoán
let timeLabels = [];
let chart; 
let ws; 
let aiInterval; 

// --- LOGIN LOGIC ---
function handleLogin() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const btn = document.getElementById('loginBtn');
    const msg = document.getElementById('loginMsg');
    const overlay = document.getElementById('loginOverlay');
    const mainApp = document.querySelector('.main-app-container');

    // Hiệu ứng Loading
    btn.innerHTML = "VERIFYING CREDENTIALS..."; btn.style.opacity = "0.7"; msg.innerText = "";

    // Giả lập thời gian xác thực (1.5s)
    setTimeout(() => {
        // === MẬT KHẨU: 123456 ===
        if ((user === 'DE200247' || user === 'admin') && pass === '123456') {
            msg.style.color = '#0ecb81';
            msg.innerText = "ACCESS GRANTED. LOADING TERMINAL...";
            
            // 1. Ẩn màn hình đăng nhập
            overlay.style.opacity = '0';
            setTimeout(() => { 
                overlay.style.display = 'none'; 
                // 2. Hiện giao diện chính và cho phép cuộn
                document.body.classList.add('logged-in');
                mainApp.style.display = 'block';
                setTimeout(() => { mainApp.style.opacity = '1'; }, 50);
                
                // 3. KÍCH HOẠT HỆ THỐNG
                initSystem();
            }, 800);

        } else {
            // Đăng nhập thất bại
            btn.innerHTML = "AUTHENTICATE"; btn.style.opacity = "1";
            msg.style.color = '#f6465d'; msg.innerText = "ACCESS DENIED: Invalid Password";
        }
    }, 1500);
}

// Cho phép nhấn Enter để login
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && document.getElementById('loginOverlay').style.display !== 'none') {
        handleLogin();
    }
});

// --- UTILS: LOGGING ---
function log(msg) {
    const time = new Date().toLocaleTimeString('en-US', {hour12: false});
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    logBox.appendChild(div);
    logBox.scrollTop = logBox.scrollHeight;
}

// --- HÀM KHỞI CHẠY HỆ THỐNG ---
function initSystem() {
    log("Authentication successful. Starting core services...");

    // 1. SETUP BIỂU ĐỒ (Chart.js)
    const ctx = document.getElementById('mainChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Real-time Price', 
                data: priceHistory, 
                borderColor: '#0ecb81', 
                backgroundColor: 'rgba(14, 203, 129, 0.1)', 
                borderWidth: 2, 
                tension: 0.2, 
                fill: true, 
                pointRadius: 0
            }, {
                // ĐƯỜNG DỰ ĐOÁN AI (Màu xanh dương nét đứt)
                label: 'AI Forecast', 
                data: forecastHistory, 
                borderColor: '#3b82f6', 
                borderWidth: 2, 
                borderDash: [5, 5], 
                tension: 0.4, // Đường cong mềm mại hơn
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: true, labels: { color: '#848e9c' } } },
            scales: { x: { display: false }, y: { position: 'right', grid: { color: '#2b3139' }, ticks: { color: '#848e9c', callback: function(value) { return '$' + value; } } } },
            animation: false
        }
    });

    // 2. KẾT NỐI BINANCE (Dữ liệu giá thật)
    log("Connecting to Binance WebSocket feed...");
    ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.p);
        
        // Cập nhật giá hiển thị
        if (currentPrice > 0) priceEl.style.color = price >= currentPrice ? '#0ecb81' : '#f6465d';
        currentPrice = price;
        priceEl.innerText = `$${price.toFixed(2)}`;

        // Cập nhật biểu đồ
        const timeNow = new Date().toLocaleTimeString();
        if (timeLabels.length > 50) { 
            timeLabels.shift(); 
            priceHistory.shift(); 
            // Giữ cho mảng forecast đồng bộ độ dài
            if(forecastHistory.length > 50) forecastHistory.shift(); 
        }
        timeLabels.push(timeNow);
        priceHistory.push(price);
        
        chart.update();
    };
    ws.onopen = () => { log("Binance connection established. Receiving data."); };

    // 3. KẾT NỐI AI (PYTHON SERVER) HOẶC GIẢ LẬP
    log("Initializing AI Inference Engine...");
    
    // Cập nhật mỗi 2 giây
    aiInterval = setInterval(() => {
        if(currentPrice === 0) return;

        // Cố gắng gọi API Python (Localhost)
        fetch('http://127.0.0.1:5000/predict')
            .then(response => {
                if (!response.ok) throw new Error("Server Error");
                return response.json();
            })
            .then(data => {
                // === TRƯỜNG HỢP 1: KẾT NỐI THÀNH CÔNG ===
                const aiPrice = data.predicted_price;
                const direction = aiPrice > currentPrice ? 'UP' : 'DOWN';
                
                updateDashboard(aiPrice, direction, "AI Model (Python)");
            })
            .catch(err => {
                // === TRƯỜNG HỢP 2: KẾT NỐI THẤT BẠI (Dùng giả lập) ===
                // Fallback: Tạo dự đoán giả lập thông minh bám sát giá
                // Logic: Giá hiện tại + biến động nhỏ (-15 đến +25)
                const fakePrice = currentPrice + (Math.random() * 40 - 15);
                const direction = fakePrice > currentPrice ? 'UP' : 'DOWN';
                
                updateDashboard(fakePrice, direction, "Simulation Mode");
                
                // Chỉ log lỗi 1 lần để đỡ spam (tùy chọn)
                // console.log("AI Server disconnected, switching to Simulation.");
            });

    }, 2000);
}

// --- HÀM CẬP NHẬT GIAO DIỆN CHUNG ---
function updateDashboard(predictedVal, direction, source) {
    // 1. Hiển thị giá dự đoán
    predEl.innerText = `$${predictedVal.toFixed(2)}`;
    predEl.style.color = direction === 'UP' ? '#0ecb81' : '#f6465d'; // Xanh/Đỏ

    // 2. Tính toán Stoploss / Take Profit (Dựa trên ATR giả định)
    const volatility = Math.abs(predictedVal - currentPrice) * 1.5 + 10; 
    slEl.innerText = `$${(currentPrice - volatility).toFixed(2)}`;
    tpEl.innerText = `$${(currentPrice + volatility * 2).toFixed(2)}`;

    // 3. Vẽ đường AI lên biểu đồ
    forecastHistory.push(predictedVal);
    // Đảm bảo mảng không quá dài (đã xử lý ở onmessage, nhưng check lại cho chắc)
    if(forecastHistory.length > 50) forecastHistory.shift();
    
    chart.update();

    // 4. Ghi log ngẫu nhiên (để nhìn cho nguy hiểm)
    if(Math.random() > 0.7) {
        log(`Inference [${source}]: Predict ${direction} -> Conf: ${(85 + Math.random()*10).toFixed(1)}%`);
    }
}
