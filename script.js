// --- CONFIGURATION ---
const logBox = document.getElementById('terminalLogs');
const priceEl = document.getElementById('btcPrice');
const predEl = document.getElementById('predPrice');
const slEl = document.getElementById('stopLoss');
const tpEl = document.getElementById('takeProfit');

let currentPrice = 0;
let priceHistory = [];
let timeLabels = [];

// --- UTILS: LOGGING FUNCTION ---
function log(msg) {
    const time = new Date().toLocaleTimeString('en-US', {hour12: false});
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    logBox.appendChild(div);
    logBox.scrollTop = logBox.scrollHeight;
}

// --- CHART SETUP (Chart.js) ---
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
            data: [], // Placeholder for prediction line
            borderColor: '#3b82f6',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.2,
            pointRadius: 0
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { color: '#848e9c' } } },
        scales: {
            x: { display: false },
            y: { 
                position: 'right',
                grid: { color: '#2b3139' },
                ticks: { color: '#848e9c', callback: function(value) { return '$' + value; } }
            }
        },
        animation: false
    }
});

// --- REAL-TIME DATA (Binance WebSocket) ---
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const price = parseFloat(data.p);
    
    // Update UI Color based on trend
    if (currentPrice > 0) {
        priceEl.style.color = price >= currentPrice ? '#0ecb81' : '#f6465d';
    }
    currentPrice = price;
    priceEl.innerText = `$${price.toFixed(2)}`;

    // Update Chart Data (Keep last 50 points)
    const timeNow = new Date().toLocaleTimeString();
    if (timeLabels.length > 50) { 
        timeLabels.shift(); 
        priceHistory.shift(); 
    }
    timeLabels.push(timeNow);
    priceHistory.push(price);
    chart.update();
};

// --- SIMULATED AI BACKEND (Placeholder for Python API) ---
// *Ghi chú: Đây là nơi sau này bạn sẽ thay bằng fetch() gọi tới server Python*
setInterval(() => {
    if(currentPrice === 0) return;

    // 1. Giả lập tính ATR (Volatility)
    const volatility = Math.random() * 40 + 10; 
    
    // 2. Giả lập Model dự đoán (Random noise quanh giá thật)
    const predicted = currentPrice + (Math.random() * 100 - 45); 
    
    // 3. Tính Stoploss / TakeProfit
    const sl = currentPrice - (volatility * 1.5);
    const tp = currentPrice + (volatility * 2.5);

    // Update UI
    predEl.innerText = `$${predicted.toFixed(2)}`;
    slEl.innerText = `$${sl.toFixed(2)}`;
    tpEl.innerText = `$${tp.toFixed(2)}`;
    
    // Random Logs để nhìn cho "Pro"
    const logMsg = [
        `Normalization: Batch processed.`,
        `LSTM Layer 2: Activation (tanh).`,
        `Risk Manager: ATR updated to ${volatility.toFixed(2)}.`,
        `Inference: Prediction confidence 94.2%.`
    ];
    if(Math.random() > 0.6) {
        log(logMsg[Math.floor(Math.random() * logMsg.length)]);
    }

}, 3000); // Cập nhật mỗi 3 giây
