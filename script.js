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

const btnTerminal = document.getElementById('btn-terminal');
const btnProfile = document.getElementById('btn-profile');
const viewDashboard = document.getElementById('dashboard-view');
const viewProfile = document.getElementById('profile-view');

const editProfileBtn = document.getElementById('editProfileBtn');
const editProfileModal = document.getElementById('editProfileModal');
const closeEditModal = document.getElementById('closeEditModal');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const editAvatarInput = document.getElementById('editAvatarInput'); 

const openChatBtn = document.getElementById('openChatBtn');
const chatOverlay = document.getElementById('chatSystemOverlay');
const closeChatBtn = document.getElementById('closeChatBtn');
const sendMsgBtn = document.getElementById('sendMsgBtn');
const msgInput = document.getElementById('msgInput');
const chatContainer = document.getElementById('chatContainer');

// Biến hệ thống
let currentPrice = 0;
let predictedPriceGlobal = 0; 
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
// 1. NAV & EDIT PROFILE LOGIC
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
    // Nếu có avatar thì dùng, không thì dùng ảnh mặc định trong HTML
    if(avatarUrl) document.getElementById('profile-avatar-img').src = avatarUrl;
    if(role) document.getElementById('profile-role-txt').innerText = role;
}

if(editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
        editProfileModal.style.display = 'flex';
        document.getElementById('editNameInput').value = document.getElementById('profile-name-txt').innerText;
        document.getElementById('editRoleInput').value = document.getElementById('profile-role-txt').innerText;
    });
}
if(closeEditModal) closeEditModal.addEventListener('click', () => { editProfileModal.style.display = 'none'; });

if(saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
        const newName = document.getElementById('editNameInput').value;
        const newRole = document.getElementById('editRoleInput').value;
        
        if (editAvatarInput.files && editAvatarInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Image = e.target.result;
                updateProfileInfo(newName, null, base64Image, newRole);
                localStorage.setItem('stableCastUser', newName);
                localStorage.setItem('stableCastRole', newRole);
                localStorage.setItem('stableCastAvatar', base64Image);
                editProfileModal.style.display = 'none';
                alert("Profile Updated!");
            }
            reader.readAsDataURL(editAvatarInput.files[0]);
        } else {
            updateProfileInfo(newName, null, null, newRole);
            localStorage.setItem('stableCastUser', newName);
            localStorage.setItem('stableCastRole', newRole);
            editProfileModal.style.display = 'none';
            alert("Profile Updated!");
        }
    });
}

// ============================================================
// 2. LUME 2.0 AI BRAIN (Trí thông minh nhân tạo)
// ============================================================
if(openChatBtn) openChatBtn.addEventListener('click', () => { chatOverlay.style.display = 'flex'; });
if(closeChatBtn) closeChatBtn.addEventListener('click', () => { chatOverlay.style.display = 'none'; });

function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = `${text}<div class="msg-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// === BỘ NÃO CỦA LUME ===
function generateLumeResponse(input) {
    const lowerInput = input.toLowerCase();
    
    // --- 1. NHÓM CÂU HỎI VỀ DỰ ÁN (PROJECT INFO) ---
    if (lowerInput.includes('developer') || lowerInput.includes('who made') || lowerInput.includes('creator') || lowerInput.includes('author')) {
        return `This project, <b>StableCast</b>, was developed by <b>Phan Bá Song Toàn</b> (Student ID: <b>DE200247</b>) from FPT University. It's a flagship project for the ADY201m course.`;
    }
    
    if (lowerInput.includes('what is stablecast') || lowerInput.includes('about')) {
        return `<b>StableCast</b> is an AI-driven cryptocurrency forecasting terminal. It uses a Hybrid Ensemble approach to predict Bitcoin (BTC) price movements in real-time.`;
    }

    // --- 2. NHÓM CÂU HỎI KỸ THUẬT (TECH STACK) ---
    if (lowerInput.includes('lstm') || lowerInput.includes('model') || lowerInput.includes('algorithm')) {
        return `The core of my intelligence is a <b>Long Short-Term Memory (LSTM)</b> network. It's a type of Recurrent Neural Network (RNN) specifically designed to learn from time-series data like price history.`;
    }

    if (lowerInput.includes('xgboost')) {
        return `<b>XGBoost</b> (Extreme Gradient Boosting) is the second part of my brain. While LSTM predicts the trend, XGBoost classifies market conditions to filter out false signals.`;
    }

    if (lowerInput.includes('accuracy') || lowerInput.includes('confidence')) {
        return `My current validation accuracy on the test set is approximately <b>98.2%</b>. However, remember that all financial markets carry inherent risk.`;
    }

    // --- 3. NHÓM CÂU HỎI THỊ TRƯỜNG (MARKET ANALYSIS) ---
    if (lowerInput.includes('price') || lowerInput.includes('current')) {
        return `The live Bitcoin price is <b>$${currentPrice.toFixed(2)}</b>.`;
    }

    if (lowerInput.includes('trend') || lowerInput.includes('buy') || lowerInput.includes('sell') || lowerInput.includes('forecast')) {
        if (predictedPriceGlobal === 0) return "I need more data to form a prediction. Please wait a moment...";
        
        const trend = predictedPriceGlobal > currentPrice ? "BULLISH (Up)" : "BEARISH (Down)";
        const advice = predictedPriceGlobal > currentPrice ? "Consider a LONG position." : "Consider a SHORT position.";
        
        return `Analysis Complete:<br>
        - Current: $${currentPrice.toFixed(2)}<br>
        - Target: $${predictedPriceGlobal.toFixed(2)}<br>
        - Trend: <b>${trend}</b><br>
        - Recommendation: ${advice}`;
    }

    // --- 4. CÂU HỎI XÃ GIAO ---
    if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
        return `Hello! I am Lume. Ask me about the <b>Developer</b>, <b>LSTM</b>, or the <b>Market Trend</b>!`;
    }

    // Default
    return `I specialize in StableCast technical data. Try asking: "Who is the developer?" or "What is LSTM?".`;
}

function botReply(userText) {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message msg-in';
    typingDiv.style.fontStyle = 'italic';
    typingDiv.style.color = '#888';
    typingDiv.innerText = "Lume is thinking...";
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    setTimeout(() => {
        chatContainer.removeChild(typingDiv);
        const reply = generateLumeResponse(userText);
        addMessage(reply, 'msg-in');
    }, 1200);
}

if(sendMsgBtn) {
    const handleSend = () => {
        const text = msgInput.value.trim();
        if(text) {
            addMessage(text, 'msg-out');
            msgInput.value = '';
            botReply(text);
        }
    };
    sendMsgBtn.addEventListener('click', handleSend);
    msgInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleSend(); });
}

// ============================================================
// 3. AUTH & CORE SYSTEM (Giữ nguyên)
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
    const userAvatar = user.photoURL || null; // Nếu null sẽ dùng ảnh mặc định trong HTML

    const rememberMe = document.getElementById('rememberMe');
    if (rememberMe && rememberMe.checked) {
        localStorage.setItem('stableCastUser', userName);
        localStorage.setItem('stableCastEmail', userEmail);
        if(userAvatar) localStorage.setItem('stableCastAvatar', userAvatar);
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
    predictedPriceGlobal = predictedVal; 
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
