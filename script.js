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
let simulationInterval; 

// --- LOGIN LOGIC ---
function handleLogin() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const btn = document.getElementById('loginBtn');
    const msg = document.getElementById('loginMsg');
    const overlay = document.getElementById('loginOverlay');
    const mainApp = document.querySelector('.main-app-container');

    btn.innerHTML = "VERIFYING CREDENTIALS..."; btn.style.opacity = "0.7"; msg.innerText = "";

    setTimeout(() => {
        // PASS: 123456
        if ((user === 'DE200247' || user === 'admin') && pass === '123456') {
            msg.style.color = '#0ecb81';
            msg.innerText = "ACCESS GRANTED. LOADING TERMINAL...";
            overlay.style.opacity = '0';
            setTimeout(() => { 
                overlay.style.display = 'none'; 
                document.body.classList.add('logged-in');
                mainApp.style.display = 'block';
                setTimeout(() => { mainApp.style.opacity = '1'; }, 50);
                initSystem();
            }, 800);
        } else {
            btn.innerHTML = "AUTHENTICATE"; btn.style.opacity = "1";
            msg.style.color = '#f6465d'; msg.innerText = "ACCESS DENIED: Invalid Password";
        }
    }, 1500);
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && document.getElementById('loginOverlay').style.display !== 'none') {
        handleLogin();
    }
});

// --- UTILS ---
function log(msg) {
    const time = new Date().toLocaleTimeString('en-US', {hour12: false});
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    logBox.appendChild(div);
    logBox.scrollTop = logBox.scrollHeight;
}

// --- SYSTEM START ---
function initSystem() {
    log("Authentication successful. Starting core services...");

    // 1. Setup Chart
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
                // ĐÂY LÀ ĐƯỜNG DỰ ĐOÁN (Màu xanh dương)
                label: 'AI Forecast', 
                data: forecastHistory, 
                borderColor: '#3b82f6', 
                borderWidth: 2, 
                borderDash: [5, 5], // Nét đứt
                tension: 0.2, 
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

    // 2. Connect Binance
    log("Connecting to Binance WebSocket feed...");
    ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.p);
        
        // Cập nhật giá thật
        if (currentPrice > 0) priceEl.style.color = price >= currentPrice ? '#0ecb81' : '#f6465d';
        currentPrice = price;
        priceEl.innerText = `$${price.toFixed(2)}`;

        // === PHẦN MỚI THÊM: TẠO DỮ LIỆU GIẢ LẬP CHO ĐƯỜNG MÀU XANH ===
        // Logic: Lấy giá thật + sai số ngẫu nhiên (-30 đến +30 giá) để tạo cảm giác AI đang đoán
        const fakeAI = price + (Math.random() * 60 - 30); 

        // Đẩy dữ liệu vào mảng
        const timeNow = new Date().toLocaleTimeString();
        if (timeLabels.length > 50) { 
            timeLabels.shift(); 
            priceHistory.shift(); 
            forecastHistory.shift(); // Xóa cũ
        }
        
        timeLabels.push(timeNow);
        priceHistory.push(price);
        forecastHistory.push(fakeAI); // Thêm mới vào đường AI

        chart.update();
    };
    ws.onopen = () => { log("Binance connection established. Receiving data."); };

    // 3. Update Text Numbers (Simulation Loop)
    simulationInterval = setInterval(() => {
        if(currentPrice === 0) return;
        const volatility = Math.random() * 40 + 10; 
        
        // Lấy giá trị cuối cùng của đường xanh để hiển thị lên số to
        const predictedVal = forecastHistory.length > 0 ? forecastHistory[forecastHistory.length - 1] : currentPrice;
        
        predEl.innerText = `$${predictedVal.toFixed(2)}`;
        slEl.innerText = `$${(currentPrice - (volatility * 1.5)).toFixed(2)}`;
        tpEl.innerText = `$${(currentPrice + (volatility * 2.5)).toFixed(2)}`;
        
        const logMsg = [`Normalization batch processed.`, `LSTM inference complete. Confidence 94%.`, `Risk metrics updated based on ATR.`];
        if(Math.random() > 0.6) log(logMsg[Math.floor(Math.random() * logMsg.length)]);
    }, 1000); // Cập nhật số nhanh hơn (1 giây/lần)
}
