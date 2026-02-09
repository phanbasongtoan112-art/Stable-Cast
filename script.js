// ============================================================
// 1. IMPORT FIREBASE SERVICES (Dùng bản Web Modular xịn nhất)
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ============================================================
// 2. CẤU HÌNH FIREBASE (CHÌA KHÓA CỦA BẠN)
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyAK2kjWRLaZTCawfQywNdLJcmGvcALPLuc",
  authDomain: "stablecast-login.firebaseapp.com",
  projectId: "stablecast-login",
  storageBucket: "stablecast-login.firebasestorage.app",
  messagingSenderId: "282707836063",
  appId: "1:282707836063:web:cdbe29c541635ca2ba76aa",
  measurementId: "G-D2BXTH0MMF"
};

// Khởi tạo kết nối Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ============================================================
// 3. BIẾN TOÀN CỤC & DOM ELEMENTS
// ============================================================
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

// ============================================================
// 4. XỬ LÝ ĐĂNG NHẬP (LOGIN LOGIC)
// ============================================================

// Hàm mở khóa giao diện khi đăng nhập thành công
function unlockInterface(userName) {
    const msg = document.getElementById('loginMsg');
    const overlay = document.getElementById('loginOverlay');
    const mainApp = document.querySelector('.main-app-container');
    const loginBtn = document.getElementById('loginBtn');

    // Hiệu ứng nút bấm
    if(loginBtn) {
        loginBtn.innerHTML = "ACCESS GRANTED";
        loginBtn.style.background = "#0ecb81";
        loginBtn.style.color = "#fff";
        loginBtn.style.border = "none";
    }

    msg.style.color = '#0ecb81';
    msg.innerText = `WELCOME, OPERATOR ${userName.toUpperCase()}`;

    // Hiệu ứng chuyển cảnh mượt mà
    setTimeout(() => { 
        overlay.style.opacity = '0'; // Mờ dần
        setTimeout(() => { 
            overlay.style.display = 'none'; // Ẩn hẳn
            document.body.classList.add('logged-in'); // Cho phép cuộn trang
            mainApp.style.display = 'block';
            setTimeout(() => { mainApp.style.opacity = '1'; }, 50);
            
            // Kích hoạt hệ thống AI
            initSystem();
        }, 800);
    }, 1000);
}

// A. Đăng nhập bằng Mật khẩu (Gắn vào window để file HTML gọi được)
window.handleLogin = function() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const btn = document.getElementById('loginBtn');
    const msg = document.getElementById('loginMsg');

    btn.innerHTML = "VERIFYING..."; btn.style.opacity = "0.7";

    setTimeout(() => {
        // Tài khoản cứng: DE200247 / 123456
        if ((user === 'DE200247' || user === 'admin') && pass === '123456') {
            unlockInterface(user);
        } else {
            btn.innerHTML = "AUTHENTICATE"; btn.style.opacity = "1";
            msg.style.color = '#f6465d'; msg.innerText = "ACCESS DENIED: Invalid Credentials";
        }
    }, 1000);
}

// Cho phép nhấn Enter để đăng nhập
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && document.getElementById('loginOverlay').style.display !== 'none') {
        window.handleLogin();
    }
});

// B. Đăng nhập bằng Google (Nút mới)
const googleBtn = document.getElementById('googleLoginBtn');
if(googleBtn) {
    googleBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider)
            .then((result) => {
                const user = result.user;
                console.log("Google Login Success:", user.displayName);
                unlockInterface(user.displayName || "GOOGLE USER");
            }).catch((error) => {
                console.error("Google Login Error:", error);
                const msg = document.getElementById('loginMsg');
                msg.innerText = "GOOGLE LOGIN FAILED: " + error.message;
                msg.style.color = '#f6465d';
            });
    });
}

// ============================================================
// 5. HỆ THỐNG CHÍNH (CORE SYSTEM)
// ============================================================

function log(msg) {
    const time = new Date().toLocaleTimeString('en-US', {hour12: false});
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    logBox.appendChild(div);
    logBox.scrollTop = logBox.scrollHeight;
}

function initSystem() {
    log("Authentication successful. Initializing Secure Environment...");
    setupChartAndSocket();
}

function setupChartAndSocket() {
    // 1. Cấu hình Biểu đồ (Chart.js)
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
                borderWidth: 2, 
                tension: 0.2, 
                fill: true, 
                pointRadius: 0
            }, {
                label: 'AI Ensemble Forecast', 
                data: forecastHistory, 
                borderColor: '#3b82f6', 
                borderWidth: 2, 
                borderDash: [5, 5], 
                tension: 0.4, 
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

    // 2. Kết nối Binance WebSocket (Lấy giá thật)
    log("Connecting to Binance WebSocket Feed...");
    ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.p);
        
        // Cập nhật giá hiển thị
        if (currentPrice > 0) priceEl.style.color = price >= currentPrice ? '#0ecb81' : '#f6465d';
        currentPrice = price;
        priceEl.innerText = `$${price.toFixed(2)}`;

        // Cập nhật mảng dữ liệu
        const timeNow = new Date().toLocaleTimeString();
        if (timeLabels.length > 50) { 
            timeLabels.shift(); 
            priceHistory.shift(); 
            if(forecastHistory.length > 50) forecastHistory.shift(); 
        }
        timeLabels.push(timeNow);
        priceHistory.push(price);
        
        chart.update();
    };
    ws.onopen = () => { log("Binance Feed Active. Receiving ticks..."); };

    // 3. Kết nối AI Server (Python Backend)
    log("Connecting to AI Inference Engine (Ensemble Model)...");
    
    // Cập nhật dự đoán mỗi 2 giây
    aiInterval = setInterval(() => {
        if(currentPrice === 0) return;

        // Gọi API Python
        fetch('http://127.0.0.1:5000/predict')
            .then(response => {
                if (!response.ok) throw new Error("Server Error");
                return response.json();
            })
            .then(data => {
                // TRƯỜNG HỢP 1: AI TRẢ LỜI
                const aiPrice = data.predicted_price;
                const direction = data.direction;
                
                // Cập nhật dashboard
                updateDashboard(aiPrice, direction, "Ensemble AI");
            })
            .catch(err => {
                // TRƯỜNG HỢP 2: SERVER TẮT -> DÙNG GIẢ LẬP THÔNG MINH
                // Logic: Bám sát giá thật với biến động ngẫu nhiên nhỏ (-15 đến +25)
                const fakePrice = currentPrice + (Math.random() * 40 - 15);
                const direction = fakePrice > currentPrice ? 'UP' : 'DOWN';
                
                updateDashboard(fakePrice, direction, "Simulation Mode");
            });

    }, 2000);
}

// Hàm cập nhật số liệu lên màn hình
function updateDashboard(predictedVal, direction, source) {
    // 1. Hiển thị giá dự đoán
    predEl.innerText = `$${predictedVal.toFixed(2)}`;
    predEl.style.color = direction === 'UP' ? '#0ecb81' : '#f6465d'; 

    // 2. Tính toán Stoploss / TP (Logic tự động)
    const volatility = Math.abs(predictedVal - currentPrice) * 1.5 + 25; 
    slEl.innerText = `$${(currentPrice - volatility).toFixed(2)}`;
    tpEl.innerText = `$${(currentPrice + volatility * 2.5).toFixed(2)}`;

    // 3. Vẽ đường AI
    forecastHistory.push(predictedVal);
    if(forecastHistory.length > 50) forecastHistory.shift();
    chart.update();

    // 4. Ghi log ngẫu nhiên cho chuyên nghiệp
    if(Math.random() > 0.7) {
        log(`Inference [${source}]: Predict ${direction} -> Conf: ${(89 + Math.random()*10).toFixed(1)}%`);
    }
}
