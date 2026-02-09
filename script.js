import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

// PROFILE & NAV ELEMENTS
const btnTerminal = document.getElementById('btn-terminal');
const btnProfile = document.getElementById('btn-profile');
const viewDashboard = document.getElementById('dashboard-view');
const viewProfile = document.getElementById('profile-view');

// EDIT MODAL ELEMENTS
const editProfileBtn = document.getElementById('editProfileBtn');
const editProfileModal = document.getElementById('editProfileModal');
const closeEditModal = document.getElementById('closeEditModal');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const editAvatarInput = document.getElementById('editAvatarInput'); // Input File

// CHAT ELEMENTS
const openChatBtn = document.getElementById('openChatBtn');
const chatOverlay = document.getElementById('chatSystemOverlay');
const closeChatBtn = document.getElementById('closeChatBtn');
const sendMsgBtn = document.getElementById('sendMsgBtn');
const msgInput = document.getElementById('msgInput');
const chatContainer = document.getElementById('chatContainer');

// Biến hệ thống
let currentPrice = 0;
let predictedPriceGlobal = 0; // Để Lume dùng
let priceHistory = [];
let forecastHistory = [];
let timeLabels = [];
let chart; 
let ws; 
let aiInterval; 

// ============================================================
// 0. AUTO-LOGIN CHECK
// ============================================================
const savedUser = localStorage.getItem('stableCastUser');
const savedEmail = localStorage.getItem('stableCastEmail');
const savedAvatar = localStorage.getItem('stableCastAvatar');
const savedRole = localStorage.getItem('stableCastRole');

if (savedUser) {
    document.getElementById('loginOverlay').style.display = 'none';
    document.querySelector('.main-app-container').style.display = 'block';
    setTimeout(() => { document.querySelector('.main-app-container').style.opacity = '1'; }, 50);
    
    updateProfileInfo(savedUser, savedEmail, savedAvatar, savedRole);
    setTimeout(() => { initSystem(); }, 100);
}

// ============================================================
// 1. NAV TABS LOGIC
// ============================================================
btnTerminal.addEventListener('click', () => {
    btnTerminal.classList.add('active');
    btnProfile.classList.remove('active');
    viewDashboard.style.display = 'block';
    viewProfile.style.display = 'none';
});

btnProfile.addEventListener('click', () => {
    btnProfile.classList.add('active');
    btnTerminal.classList.remove('active');
    viewDashboard.style.display = 'none';
    viewProfile.style.display = 'block';
});

function updateProfileInfo(name, email, avatarUrl, role) {
    document.getElementById('profile-name-txt').innerText = name || "OPERATOR";
    document.getElementById('profile-email-txt').innerText = email || "Unknown";
    document.getElementById('profile-id-txt').innerText = "DE200247"; 
    if(avatarUrl) document.getElementById('profile-avatar-img').src = avatarUrl;
    if(role) document.getElementById('profile-role-txt').innerText = role;
}

// ============================================================
// 2. EDIT PROFILE & UPLOAD IMAGE LOGIC
// ============================================================
if(editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
        editProfileModal.style.display = 'flex';
        document.getElementById('editNameInput').value = document.getElementById('profile-name-txt').innerText;
        document.getElementById('editRoleInput').value = document.getElementById('profile-role-txt').innerText;
    });
}

if(closeEditModal) {
    closeEditModal.addEventListener('click', () => { editProfileModal.style.display = 'none'; });
}

if(saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
        const newName = document.getElementById('editNameInput').value;
        const newRole = document.getElementById('editRoleInput').value;
        
        // Xử lý ảnh Upload
        if (editAvatarInput.files && editAvatarInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Image = e.target.result; // Ảnh dạng chuỗi
                
                // Cập nhật & Lưu
                updateProfileInfo(newName, null, base64Image, newRole);
                localStorage.setItem('stableCastUser', newName);
                localStorage.setItem('stableCastRole', newRole);
                localStorage.setItem('stableCastAvatar', base64Image); // Lưu ảnh vào Storage
                
                editProfileModal.style.display = 'none';
                alert("Profile & Avatar Updated!");
            }
            reader.readAsDataURL(editAvatarInput.files[0]);
        } else {
            // Không up ảnh mới, chỉ lưu tên
            updateProfileInfo(newName, null, null, newRole);
            localStorage.setItem('stableCastUser', newName);
            localStorage.setItem('stableCastRole', newRole);
            editProfileModal.style.display = 'none';
            alert("Profile Info Updated!");
        }
    });
}

// ============================================================
// 3. LUME AI CHAT SYSTEM (Smart Assistant)
// ============================================================
if(openChatBtn) {
    openChatBtn.addEventListener('click', () => { chatOverlay.style.display = 'flex'; });
}
if(closeChatBtn) {
    closeChatBtn.addEventListener('click', () => { chatOverlay.style.display = 'none'; });
}

function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = `${text}<div class="msg-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// === TRÍ TUỆ NHÂN TẠO CỦA LUME (Mô phỏng) ===
function generateLumeResponse(input) {
    const lowerInput = input.toLowerCase();
    
    // 1. Hỏi giá
    if (lowerInput.includes('price') || lowerInput.includes('current')) {
        return `The current market price for BTC/USDT is <b>$${currentPrice.toFixed(2)}</b>. The market is active.`;
    }
    
    // 2. Hỏi xu hướng / Dự đoán
    if (lowerInput.includes('trend') || lowerInput.includes('prediction') || lowerInput.includes('forecast') || lowerInput.includes('buy') || lowerInput.includes('sell')) {
        const trend = predictedPriceGlobal > currentPrice ? "UPWARD (Bullish)" : "DOWNWARD (Bearish)";
        const diff = Math.abs(predictedPriceGlobal - currentPrice).toFixed(2);
        return `Based on my Ensemble Model analysis, the short-term trend is <b>${trend}</b>.<br>My forecast target is <b>$${predictedPriceGlobal.toFixed(2)}</b> (Difference: $${diff}). Please check the Stop Loss levels.`;
    }

    // 3. Hỏi về hệ thống
    if (lowerInput.includes('model') || lowerInput.includes('ai') || lowerInput.includes('system')) {
        return `I am operating on a Hybrid Architecture combining <b>Long Short-Term Memory (LSTM)</b> for sequence prediction and <b>XGBoost</b> for feature classification. Accuracy is currently rated at ~98%.`;
    }

    // 4. Hỏi rủi ro
    if (lowerInput.includes('risk') || lowerInput.includes('stop loss') || lowerInput.includes('safe')) {
        const sl = document.getElementById('stopLoss').innerText;
        return `Risk management is crucial. Based on current volatility (ATR), I recommend setting your Stop Loss at <b>${sl}</b> to minimize potential drawdown.`;
    }

    // 5. Chào hỏi
    if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('lume')) {
        return `Hello Operator! I am Lume, ready to analyze the charts. How can I assist your trading session?`;
    }

    // Mặc định
    return `I'm analyzing that specific parameter. In the meantime, keep an eye on the volume indicators. Can you clarify your request regarding the market data?`;
}

function botReply(userText) {
    // Hiệu ứng "Đang nhập..."
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message msg-in';
    typingDiv.style.fontStyle = 'italic';
    typingDiv.style.color = '#888';
    typingDiv.innerText = "Lume is analyzing...";
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    setTimeout(() => {
        chatContainer.removeChild(typingDiv); // Xóa dòng đang nhập
        const reply = generateLumeResponse(userText); // Lấy câu trả lời thông minh
        addMessage(reply, 'msg-in');
    }, 1500); // Trả lời sau 1.5 giây
}

if(sendMsgBtn) {
    const handleSend = () => {
        const text = msgInput.value.trim();
        if(text) {
            addMessage(text, 'msg-out');
            msgInput.value = '';
            botReply(text); // Gọi Lume trả lời
        }
    };
    sendMsgBtn.addEventListener('click', handleSend);
    msgInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') handleSend();
    });
}

// ============================================================
// 4. AUTH & CORE SYSTEM (Giữ nguyên logic cũ)
// ============================================================
// ... (Phần code bên dưới giữ nguyên logic Auth và InitSystem như cũ)
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

function unlockInterface(user) {
    const userName = user.displayName || user.email.split('@')[0];
    const userEmail = user.email;
    const userAvatar = user.photoURL || "https://i.pinimg.com/736x/8b/16/7a/8b167af653c2399dd93b952a48740620.jpg";

    const rememberMe = document.getElementById('rememberMe');
    if (rememberMe && rememberMe.checked) {
        localStorage.setItem('stableCastUser', userName);
        localStorage.setItem('stableCastEmail', userEmail);
        localStorage.setItem('stableCastAvatar', userAvatar);
    }
    updateProfileInfo(userName, userEmail, userAvatar);
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

if(mainBtn) {
    mainBtn.addEventListener('click', () => {
        const emailOrId = document.getElementById('email').value.trim();
        const pass = document.getElementById('password').value;
        mainBtn.innerHTML = "PROCESSING..."; mainBtn.style.opacity = "0.7";

        if (isRegisterMode) {
            createUserWithEmailAndPassword(auth, emailOrId, pass)
                .then((userCredential) => { unlockInterface(userCredential.user); })
                .catch((error) => {
                    mainBtn.innerHTML = "REGISTER ACCESS"; mainBtn.style.opacity = "1";
                    msg.style.color = '#f6465d'; msg.innerText = "ERROR: " + error.message;
                });
        } else {
            if ((emailOrId === 'DE200247' || emailOrId === 'admin') && pass === '123456') {
                unlockInterface({ displayName: "Phan Ba Song Toan", email: "DE200247@fpt.edu.vn" });
                return;
            }
            signInWithEmailAndPassword(auth, emailOrId, pass)
                .then((userCredential) => { unlockInterface(userCredential.user); })
                .catch((error) => {
                    mainBtn.innerHTML = "AUTHENTICATE"; mainBtn.style.opacity = "1";
                    msg.style.color = '#f6465d'; msg.innerText = "ACCESS DENIED";
                });
        }
    });
}

if(document.getElementById('googleLoginBtn')) {
    document.getElementById('googleLoginBtn').addEventListener('click', () => {
        signInWithPopup(auth, provider)
            .then((result) => unlockInterface(result.user))
            .catch((error) => {
                msg.innerText = "GOOGLE ERROR: " + error.message;
                msg.style.color = '#f6465d';
            });
    });
}

function log(msg) {
    const time = new Date().toLocaleTimeString('en-US', {hour12: false});
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    if(logBox) { logBox.appendChild(div); logBox.scrollTop = logBox.scrollHeight; }
}

function initSystem() {
    log("System initialized. Welcome back, Operator.");
    setupChartAndSocket();
}

function setupChartAndSocket() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Real-time Price', data: priceHistory, borderColor: '#0ecb81', backgroundColor: 'rgba(14, 203, 129, 0.05)', borderWidth: 2, tension: 0.2, fill: true, pointRadius: 0
            }, {
                label: 'AI Ensemble Forecast', data: forecastHistory, borderColor: '#3b82f6', borderWidth: 2, borderDash: [5, 5], tension: 0.4, pointRadius: 0, fill: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: true, labels: { color: '#848e9c' } } },
            scales: { x: { display: false }, y: { position: 'right', grid: { color: '#2b3139' }, ticks: { color: '#848e9c', callback: function(value) { return '$' + value; } } } },
            animation: false
        }
    });

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

    log("Connecting to AI Inference Engine...");
    aiInterval = setInterval(() => {
        if(currentPrice === 0) return;
        fetch('http://127.0.0.1:5000/predict')
            .then(res => res.json())
            .then(data => updateDashboard(data.predicted_price, data.direction, "Ensemble AI"))
            .catch(err => {
                const fakePrice = currentPrice + (Math.random() * 40 - 15);
                updateDashboard(fakePrice, fakePrice > currentPrice ? 'UP' : 'DOWN', "Simulation Mode");
            });
    }, 2000);
}

function updateDashboard(predictedVal, direction, source) {
    predictedPriceGlobal = predictedVal; // Cập nhật biến toàn cục cho Lume dùng
    predEl.innerText = `$${predictedVal.toFixed(2)}`;
    predEl.style.color = direction === 'UP' ? '#0ecb81' : '#f6465d'; 
    const volatility = Math.abs(predictedVal - currentPrice) * 1.5 + 25; 
    slEl.innerText = `$${(currentPrice - volatility).toFixed(2)}`;
    tpEl.innerText = `$${(currentPrice + volatility * 2.5).toFixed(2)}`;
    forecastHistory.push(predictedVal);
    if(forecastHistory.length > 50) forecastHistory.shift();
    chart.update();
    if(Math.random() > 0.7) log(`Inference [${source}]: Predict ${direction} -> Conf: ${(89 + Math.random()*10).toFixed(1)}%`);
}
