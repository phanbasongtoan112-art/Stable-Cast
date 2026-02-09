// --- CONFIGURATION ---
const logBox = document.getElementById('terminalLogs');
const priceEl = document.getElementById('btcPrice');
const predEl = document.getElementById('predPrice');
const slEl = document.getElementById('stopLoss');
const tpEl = document.getElementById('takeProfit');

let currentPrice = 0;
let priceHistory = [];
let timeLabels = [];

// --- LOGIN LOGIC ---
function handleLogin() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const btn = document.getElementById('loginBtn');
    const msg = document.getElementById('loginMsg');
    const overlay = document.getElementById('loginOverlay');

    // Loading effect
    btn.innerHTML = "VERIFYING..."; btn.style.opacity = "0.7"; msg.innerText = "";

    // Giả lập check pass (1.5s)
    setTimeout(() => {
        // MẬT KHẨU: 123456
        if ((user === 'DE200247' || user === 'admin') && pass === '123456') {
            msg.style.color = '#0ecb81';
            msg.innerText = "ACCESS GRANTED. INITIALIZING...";
            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.style.display = 'none'; }, 500);
            }, 800);
        } else {
            btn.innerHTML = "AUTHENTICATE"; btn.style.opacity = "1";
            msg.style.color = '#f6465d'; msg.innerText = "ACCESS DENIED: Invalid Credentials";
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

// --- CHART SETUP ---
const ctx = document.getElementById('mainChart').getContext('2d');
const chart = new Chart(ctx, {
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
            label: 'AI Forecast',
            data: [],
            borderColor: '#3b82f6',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.2,
            pointRadius: 0
        }]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { color: '#848e9c' } } },
        scales: {
            x: { display: false },
            y: { position: 'right', grid: { color: '#2b3139' }, ticks: { color: '#848e9c', callback: function(value) { return '$' + value; } } }
        },
        animation: false
    }
});

// --- REAL-TIME DATA (Binance) ---
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const price = parseFloat(data.p);
    
    if (currentPrice > 0) priceEl.style.color = price >= currentPrice ? '#0ecb81' : '#f6465d';
    currentPrice = price;
    priceEl.innerText = `$${price.toFixed(2)}`;

    const timeNow = new Date().toLocaleTimeString();
    if (timeLabels.length > 50) { timeLabels.shift(); priceHistory.shift(); }
    timeLabels.push(timeNow);
    priceHistory.push(price);
    chart.update();
};

// --- SIMULATED AI BACKEND ---
setInterval(() => {
    if(currentPrice === 0) return;
    const volatility = Math.random() * 40 + 10; 
    const predicted = currentPrice + (Math.random() * 100 - 45); 
    const sl = currentPrice - (volatility * 1.5);
    const tp = currentPrice + (volatility * 2.5);

    predEl.innerText = `$${predicted.toFixed(2)}`;
    slEl.innerText = `$${sl.toFixed(2)}`;
    tpEl.innerText = `$${tp.toFixed(2)}`;
    
    const logMsg = [`Normalization: Batch processed.`, `LSTM Layer 2: Activation (tanh).`, `Risk Manager: ATR updated.`, `Inference: Confidence 94.2%.`];
    if(Math.random() > 0.6) log(logMsg[Math.floor(Math.random() * logMsg.length)]);
}, 3000);
