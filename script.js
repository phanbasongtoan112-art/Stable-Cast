// 1. IMPORT FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 2. CẤU HÌNH
const firebaseConfig = {
    apiKey: "DÁN_API_KEY_CUA_BAN_VAO_DAY",
    authDomain: "stablecast-login.firebaseapp.com",
    projectId: "stablecast-login",
    storageBucket: "stablecast-login.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- BIẾN TOÀN CỤC ---
const logBox = document.getElementById('terminalLogs');
const priceEl = document.getElementById('btcPrice');
const predEl = document.getElementById('predPrice');
const slEl = document.getElementById('stopLoss');
const tpEl = document.getElementById('takeProfit');

let currentPrice = 0;
let priceHistory = [];
let forecastHistory = [];
let timeLabels = [];
let chart; 
let ws; 
let aiInterval; 

// --- HÀM XỬ LÝ ĐĂNG NHẬP THÀNH CÔNG (Dùng chung cho cả Google và Pass) ---
function unlockInterface(userName) {
    const msg = document.getElementById('loginMsg');
    const overlay = document.getElementById('loginOverlay');
    const mainApp = document.querySelector('.main-app-container');
    const loginBtn = document.getElementById('loginBtn');

    if(loginBtn) {
        loginBtn.innerHTML = "ACCESS GRANTED";
        loginBtn.style.background = "#0ecb81";
        loginBtn.style.color = "#fff";
    }

    msg.style.color = '#0ecb81';
    msg.innerText = `WELCOME, OPERATOR ${userName.toUpperCase()}`;

    setTimeout(() => { 
        overlay.style.opacity = '0';
        setTimeout(() => { 
            overlay.style.display = 'none'; 
            document.body.classList.add('logged-in');
            mainApp.style.display = 'block';
            setTimeout(() => { mainApp.style.opacity = '1'; }, 50);
            initSystem();
        }, 800);
    }, 1000);
}

// --- 3. LOGIC ĐĂNG NHẬP THƯỜNG (Gắn vào window để HTML gọi được) ---
window.handleLogin = function() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const btn = document.getElementById('loginBtn');
    const msg = document.getElementById('loginMsg');

    btn.innerHTML = "VERIFYING..."; btn.style.opacity = "0.7";

    setTimeout(() => {
        if ((user === 'DE200247' || user === 'admin') && pass === '123456') {
            unlockInterface(user);
        } else {
            btn.innerHTML = "AUTHENTICATE"; btn.style.opacity = "1";
            msg.style.color = '#f6465d'; msg.innerText = "ACCESS DENIED";
        }
    }, 1000);
}

// --- 4. LOGIC ĐĂNG NHẬP GOOGLE ---
const googleBtn = document.getElementById('googleLoginBtn');
if(googleBtn) {
    googleBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider)
            .then((result) => {
                // Đăng nhập thành công!
                const user = result.user;
                console.log("Logged in as:", user.displayName);
                unlockInterface(user.displayName || "GOOGLE USER");
            }).catch((error) => {
                // Lỗi
                console.error(error);
                document.getElementById('loginMsg').innerText = "GOOGLE LOGIN FAILED";
                document.getElementById('loginMsg').style.color = '#f6465d';
            });
    });
}

// --- CÁC HÀM CŨ (GIỮ NGUYÊN) ---
function log(msg) {
    const time = new Date().toLocaleTimeString('en-US', {hour12: false});
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    logBox.appendChild(div);
    logBox.scrollTop = logBox.scrollHeight;
}

function initSystem() {
    log("System initialized via Secure Login.");
    // ... (Giữ nguyên phần khởi tạo Chart và WebSocket của bạn ở đây) ...
    // COPY LẠI ĐOẠN CODE initSystem TỪ BÀI TRƯỚC VÀO ĐÂY NHÉ!
    setupChartAndSocket(); // Gọi hàm tách riêng cho gọn
}

function setupChartAndSocket() {
    // Paste toàn bộ logic Chart, WebSocket và AI fetch vào đây
    // Để code gọn gàng hơn.
    const ctx = document.getElementById('mainChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Price', data: priceHistory, borderColor: '#0ecb81', borderWidth: 2, tension: 0.2, pointRadius: 0
            }, {
                label: 'AI Forecast', data: forecastHistory, borderColor: '#3b82f6', borderWidth: 2, borderDash: [5, 5], tension: 0.4, pointRadius: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { display: false }, y: { position: 'right', grid: { color: '#2b3139' } } } }
    });

    ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.p);
        currentPrice = price;
        priceEl.innerText = `$${price.toFixed(2)}`;
        
        const timeNow = new Date().toLocaleTimeString();
        if (timeLabels.length > 50) { timeLabels.shift(); priceHistory.shift(); if(forecastHistory.length > 50) forecastHistory.shift(); }
        timeLabels.push(timeNow);
        priceHistory.push(price);
        chart.update();
    };

    // AI Loop
    aiInterval = setInterval(() => {
        if(currentPrice === 0) return;
        fetch('http://127.0.0.1:5000/predict')
            .then(res => res.json())
            .then(data => {
                const aiPrice = data.predicted_price;
                const dir = aiPrice > currentPrice ? 'UP' : 'DOWN';
                updateDashboard(aiPrice, dir, "AI Ensemble");
            })
            .catch(err => {
                const fake = currentPrice + (Math.random() * 40 - 15);
                updateDashboard(fake, fake > currentPrice ? 'UP' : 'DOWN', "Simulation");
            });
    }, 2000);
}

function updateDashboard(predictedVal, direction, source) {
    predEl.innerText = `$${predictedVal.toFixed(2)}`;
    predEl.style.color = direction === 'UP' ? '#0ecb81' : '#f6465d';
    const volatility = Math.abs(predictedVal - currentPrice) * 1.5 + 10; 
    slEl.innerText = `$${(currentPrice - volatility).toFixed(2)}`;
    tpEl.innerText = `$${(currentPrice + volatility * 2).toFixed(2)}`;
    forecastHistory.push(predictedVal);
    if(forecastHistory.length > 50) forecastHistory.shift();
    chart.update();
    if(Math.random() > 0.8) log(`[${source}] Predict ${direction} -> $${predictedVal.toFixed(2)}`);
}
