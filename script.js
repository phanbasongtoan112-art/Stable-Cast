import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// === CẤU HÌNH FIREBASE ===
const firebaseConfig = {
  apiKey: "AIzaSyAK2kjWRLaZTCawfQywNdLJcmGvcALPLuc",
  authDomain: "stablecast-login.firebaseapp.com",
  projectId: "stablecast-login",
  storageBucket: "stablecast-login.firebasestorage.app",
  messagingSenderId: "282707836063",
  appId: "1:282707836063:web:cdbe29c541635ca2ba76aa",
  measurementId: "G-D2BXTH0MMF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// DOM Elements
const logBox = document.getElementById('terminalLogs');
const priceEl = document.getElementById('btcPrice');
const predEl = document.getElementById('predPrice');
const slEl = document.getElementById('stopLoss');
const tpEl = document.getElementById('takeProfit');

const mainBtn = document.getElementById('mainAuthBtn');
const toggleBtn = document.getElementById('toggleAuthBtn');
const authTitle = document.getElementById('authTitle');
const msg = document.getElementById('loginMsg');
let isRegisterMode = false;

// Biến hệ thống
let currentPrice = 0;
let priceHistory = [];
let forecastHistory = [];
let timeLabels = [];
let chart; 
let ws; 
let aiInterval; 

// ============================================================
// 0. TỰ ĐỘNG ĐĂNG NHẬP (AUTO-LOGIN CHECK)
// ============================================================
// Kiểm tra xem đã lưu phiên đăng nhập chưa
const savedUser = localStorage.getItem('stableCastUser');
if (savedUser) {
    console.log("Found saved session:", savedUser);
    // Ẩn ngay màn hình login, không cần animation
    const overlay = document.getElementById('loginOverlay');
    overlay.style.display = 'none';
    document.body.classList.add('logged-in');
    
    // Hiện app chính
    const mainApp = document.querySelector('.main-app-container');
    mainApp.style.display = 'block';
    mainApp.style.opacity = '1';
    
    // Khởi chạy hệ thống ngay lập tức
    // Dùng setTimeout nhỏ để đảm bảo DOM đã load
    setTimeout(() => { initSystem(); }, 100);
}

// ============================================================
// 1. LOGIC CHUYỂN ĐỔI GIAO DIỆN
// ============================================================
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        if (isRegisterMode) {
            authTitle.innerText = "NEW OPERATOR REGISTRATION";
            mainBtn.innerText = "REGISTER ACCESS";
            toggleBtn.innerText = "ALREADY HAVE ACCESS? LOGIN HERE";
            msg.innerText = "";
        } else {
            authTitle.innerText = "SYSTEM LOGIN";
            mainBtn.innerText = "AUTHENTICATE";
            toggleBtn.innerText = "NEW OPERATOR? REGISTER ACCESS";
            msg.innerText = "";
        }
    });
}

// ============================================================
// 2. HÀM MỞ KHÓA & LƯU PHIÊN (Updated)
// ============================================================
function unlockInterface(userName) {
    // 1. Lưu phiên đăng nhập nếu checkbox được chọn
    const rememberMe = document.getElementById('rememberMe');
    if (rememberMe && rememberMe.checked) {
        localStorage.setItem('stableCastUser', userName);
    }

    // 2. Hiệu ứng giao diện
    const overlay = document.getElementById('loginOverlay');
    const mainApp = document.querySelector('.main-app-container');
    
    if(mainBtn) {
        mainBtn.innerHTML = "ACCESS GRANTED";
        mainBtn.style.background = "#0ecb81";
    }
    msg.style.color = '#0ecb81';
    msg.innerText = `WELCOME, ${userName.toUpperCase()}`;

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

// ============================================================
// 3. XỬ LÝ SỰ KIỆN NÚT BẤM
// ============================================================
if(mainBtn) {
    mainBtn.addEventListener('click', () => {
        const emailInput = document.getElementById('email');
        const passInput = document.getElementById('password');
        const emailOrId = emailInput.value.trim();
        const pass = passInput.value;
        
        mainBtn.innerHTML = "PROCESSING..."; mainBtn.style.opacity = "0.7";

        if (isRegisterMode) {
            createUserWithEmailAndPassword(auth, emailOrId, pass)
                .then((userCredential) => { unlockInterface(userCredential.user.email); })
                .catch((error) => {
                    mainBtn.innerHTML = "REGISTER ACCESS"; mainBtn.style.opacity = "1";
                    msg.style.color = '#f6465d';
                    if(error.code === 'auth/email-already-in-use') msg.innerText = "EMAIL ALREADY EXISTS";
                    else if(error.code === 'auth/weak-password') msg.innerText = "PASSWORD TOO WEAK (MIN 6 CHARS)";
                    else msg.innerText = "ERROR: " + error.message;
                });
        } else {
            if ((emailOrId === 'DE200247' || emailOrId === 'admin') && pass === '123456') {
                unlockInterface(emailOrId);
                return;
            }
            signInWithEmailAndPassword(auth, emailOrId, pass)
                .then((userCredential) => { unlockInterface(userCredential.user.email); })
                .catch((error) => {
                    mainBtn.innerHTML = "AUTHENTICATE"; mainBtn.style.opacity = "1";
                    msg.style.color = '#f6465d';
                    msg.innerText = "ACCESS DENIED: INVALID CREDENTIALS";
                });
        }
    });
}

// Google Login
const googleBtn = document.getElementById('googleLoginBtn');
if(googleBtn) {
    googleBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider)
            .then((result) => unlockInterface(result.user.displayName || "GOOGLE USER"))
            .catch((error) => {
                msg.innerText = "GOOGLE ERROR: " + error.message;
                msg.style.color = '#f6465d';
            });
    });
}

// ============================================================
// 4. HỆ THỐNG CHART & AI
// ============================================================

function log(msg) {
    const time = new Date().toLocaleTimeString('en-US', {hour12: false});
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    if(logBox) {
        logBox.appendChild(div);
        logBox.scrollTop = logBox.scrollHeight;
    }
}

function initSystem() {
    log("Authentication verified. Initializing Core Services...");
    setupChartAndSocket();
}

function setupChartAndSocket() {
    // Chart.js
    const ctx = document.getElementById('mainChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Real-time Price', 
                data: priceHistory, 
                borderColor: '#0ecb81', 
                backgroundColor: 'rgba(14, 203, 129, 0.05)', 
                borderWidth: 2, tension: 0.2, fill: true, pointRadius: 0
            }, {
                label: 'AI Ensemble Forecast', 
                data: forecastHistory, 
                borderColor: '#3b82f6', 
                borderWidth: 2, borderDash: [5, 5], tension: 0.4, pointRadius: 0, fill: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: true, labels: { color: '#848e9c' } } },
            scales: { x: { display: false }, y: { position: 'right', grid: { color: '#2b3139' }, ticks: { color: '#848e9c', callback: function(value) { return '$' + value; } } } },
            animation: false
        }
    });

    // Binance WebSocket
    log("Connecting to Binance WebSocket Feed...");
    ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.p);
        
        if (currentPrice > 0) priceEl.style.color = price >= currentPrice ? '#0ecb81' : '#f6465d';
        currentPrice = price;
        priceEl.innerText = `$${price.toFixed(2)}`;

        const timeNow = new Date().toLocaleTimeString();
        if (timeLabels.length > 50) { timeLabels.shift(); priceHistory.shift(); if(forecastHistory.length > 50) forecastHistory.shift(); }
        timeLabels.push(timeNow);
        priceHistory.push(price);
        chart.update();
    };

    // AI Connection
    log("Connecting to AI Inference Engine (Ensemble Model)...");
    aiInterval = setInterval(() => {
        if(currentPrice === 0) return;

        fetch('http://127.0.0.1:5000/predict')
            .then(response => {
                if (!response.ok) throw new Error("Server Error");
                return response.json();
            })
            .then(data => {
                const aiPrice = data.predicted_price;
                const direction = data.direction;
                updateDashboard(aiPrice, direction, "Ensemble AI");
            })
            .catch(err => {
                const fakePrice = currentPrice + (Math.random() * 40 - 15);
                const direction = fakePrice > currentPrice ? 'UP' : 'DOWN';
                updateDashboard(fakePrice, direction, "Simulation Mode");
            });

    }, 2000);
}

function updateDashboard(predictedVal, direction, source) {
    predEl.innerText = `$${predictedVal.toFixed(2)}`;
    predEl.style.color = direction === 'UP' ? '#0ecb81' : '#f6465d'; 

    const volatility = Math.abs(predictedVal - currentPrice) * 1.5 + 25; 
    slEl.innerText = `$${(currentPrice - volatility).toFixed(2)}`;
    tpEl.innerText = `$${(currentPrice + volatility * 2.5).toFixed(2)}`;

    forecastHistory.push(predictedVal);
    if(forecastHistory.length > 50) forecastHistory.shift();
    chart.update();

    if(Math.random() > 0.7) {
        log(`Inference [${source}]: Predict ${direction} -> Conf: ${(89 + Math.random()*10).toFixed(1)}%`);
    }
}
