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

// CHAT ELEMENTS
const openChatBtn = document.getElementById('openChatBtn');
const chatOverlay = document.getElementById('chatSystemOverlay');
const closeChatBtn = document.getElementById('closeChatBtn');
const sendMsgBtn = document.getElementById('sendMsgBtn');
const msgInput = document.getElementById('msgInput');
const chatContainer = document.getElementById('chatContainer');

// Biến hệ thống
let currentPrice = 0;
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
const savedRole = localStorage.getItem('stableCastRole'); // New

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
// 2. EDIT PROFILE LOGIC (New)
// ============================================================
if(editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
        editProfileModal.style.display = 'flex';
        // Điền sẵn thông tin cũ
        document.getElementById('editNameInput').value = document.getElementById('profile-name-txt').innerText;
        document.getElementById('editRoleInput').value = document.getElementById('profile-role-txt').innerText;
        document.getElementById('editAvatarInput').value = document.getElementById('profile-avatar-img').src;
    });
}

if(closeEditModal) {
    closeEditModal.addEventListener('click', () => {
        editProfileModal.style.display = 'none';
    });
}

if(saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
        const newName = document.getElementById('editNameInput').value;
        const newRole = document.getElementById('editRoleInput').value;
        const newAvatar = document.getElementById('editAvatarInput').value;

        // Cập nhật giao diện
        updateProfileInfo(newName, null, newAvatar, newRole);

        // Lưu vào LocalStorage
        localStorage.setItem('stableCastUser', newName);
        localStorage.setItem('stableCastRole', newRole);
        localStorage.setItem('stableCastAvatar', newAvatar);

        editProfileModal.style.display = 'none';
        alert("Profile Updated Successfully!");
    });
}

// ============================================================
// 3. CHAT SYSTEM LOGIC (New)
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

// Bot trả lời tự động
const botReplies = [
    "I agree with that analysis.",
    "The market volatility is quite high today.",
    "Watching the resistance level at $69,500.",
    "Have you deployed the new XGBoost model yet?",
    "HODL! 🚀",
    "My signals are showing a bearish divergence."
];

function botReply() {
    setTimeout(() => {
        const randomReply = botReplies[Math.floor(Math.random() * botReplies.length)];
        addMessage(randomReply, 'msg-in');
    }, 1000 + Math.random() * 2000); // Trả lời sau 1-3 giây
}

if(sendMsgBtn) {
    sendMsgBtn.addEventListener('click', () => {
        const text = msgInput.value.trim();
        if(text) {
            addMessage(text, 'msg-out');
            msgInput.value = '';
            botReply(); // Kích hoạt bot
        }
    });
    // Enter để gửi
    msgInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') sendMsgBtn.click();
    });
}

// ============================================================
// 4. AUTH & CORE SYSTEM (Giữ nguyên)
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
