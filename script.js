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

// System Vars
let currentPrice = 0;
let predictedPriceGlobal = 0; 
let priceHistory = [];
let forecastHistory = [];
let timeLabels = [];
let chart; 
let ws; 
let aiInterval; 

// ============================================================
// 0. AUTO-LOGIN & LOAD FULL PROFILE
// ============================================================
const savedUser = localStorage.getItem('stableCastUser');
// Load all saved fields
if (savedUser) {
    document.getElementById('loginOverlay').style.display = 'none';
    document.querySelector('.main-app-container').style.display = 'block';
    setTimeout(() => { document.querySelector('.main-app-container').style.opacity = '1'; }, 50);
    
    // Load data from LocalStorage or use defaults
    const data = {
        name: localStorage.getItem('stableCastUser'),
        email: localStorage.getItem('stableCastEmail'),
        avatar: localStorage.getItem('stableCastAvatar'),
        role: localStorage.getItem('stableCastRole'),
        id: localStorage.getItem('stableCastID') || "DE200247",
        org: localStorage.getItem('stableCastOrg') || "FPT University",
        loc: localStorage.getItem('stableCastLoc') || "Da Nang, Vietnam",
        desc: localStorage.getItem('stableCastDesc') || "StableCast is an advanced AI-powered cryptocurrency price prediction terminal...",
        friends: localStorage.getItem('stableCastFriends') || "128",
        online: localStorage.getItem('stableCastOnline') || "45h"
    };

    updateProfileInfo(data);
    setTimeout(() => { initSystem(); }, 100);
}

// ============================================================
// 1. NAV LOGIC
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

function updateProfileInfo(data) {
    if(data.name) document.getElementById('profile-name-txt').innerText = data.name;
    if(data.email) document.getElementById('profile-email-txt').innerText = data.email;
    if(data.avatar) document.getElementById('profile-avatar-img').src = data.avatar;
    if(data.role) document.getElementById('profile-role-txt').innerText = data.role;
    
    // New Fields
    if(data.id) document.getElementById('profile-id-txt').innerText = data.id;
    if(data.org) document.getElementById('profile-org-txt').innerText = data.org;
    if(data.loc) document.getElementById('profile-loc-txt').innerText = data.loc;
    if(data.desc) document.getElementById('profile-desc-txt').innerText = data.desc;
    if(data.friends) document.getElementById('stat-friends').innerText = data.friends;
    if(data.online) document.getElementById('stat-hours').innerText = data.online;
}

// ============================================================
// 2. EDIT PROFILE (FULL FIELDS)
// ============================================================
if(editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
        editProfileModal.style.display = 'flex';
        // Pre-fill inputs with current values
        document.getElementById('editNameInput').value = document.getElementById('profile-name-txt').innerText;
        document.getElementById('editRoleInput').value = document.getElementById('profile-role-txt').innerText;
        document.getElementById('editIDInput').value = document.getElementById('profile-id-txt').innerText;
        document.getElementById('editEmailInput').value = document.getElementById('profile-email-txt').innerText;
        document.getElementById('editOrgInput').value = document.getElementById('profile-org-txt').innerText;
        document.getElementById('editLocInput').value = document.getElementById('profile-loc-txt').innerText;
        document.getElementById('editDescInput').value = document.getElementById('profile-desc-txt').innerText;
        document.getElementById('editFriendsInput').value = document.getElementById('stat-friends').innerText;
        document.getElementById('editOnlineInput').value = document.getElementById('stat-hours').innerText;
    });
}

if(closeEditModal) closeEditModal.addEventListener('click', () => { editProfileModal.style.display = 'none'; });

if(saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
        const data = {
            name: document.getElementById('editNameInput').value,
            role: document.getElementById('editRoleInput').value,
            id: document.getElementById('editIDInput').value,
            email: document.getElementById('editEmailInput').value,
            org: document.getElementById('editOrgInput').value,
            loc: document.getElementById('editLocInput').value,
            desc: document.getElementById('editDescInput').value,
            friends: document.getElementById('editFriendsInput').value,
            online: document.getElementById('editOnlineInput').value,
            avatar: null
        };

        // Handle Avatar File
        if (editAvatarInput.files && editAvatarInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                data.avatar = e.target.result;
                saveAndUpdate(data);
            }
            reader.readAsDataURL(editAvatarInput.files[0]);
        } else {
            // Keep old avatar
            data.avatar = document.getElementById('profile-avatar-img').src;
            saveAndUpdate(data);
        }
    });
}

function saveAndUpdate(data) {
    updateProfileInfo(data);
    
    // Save ALL to LocalStorage
    localStorage.setItem('stableCastUser', data.name);
    localStorage.setItem('stableCastRole', data.role);
    localStorage.setItem('stableCastID', data.id);
    localStorage.setItem('stableCastEmail', data.email);
    localStorage.setItem('stableCastOrg', data.org);
    localStorage.setItem('stableCastLoc', data.loc);
    localStorage.setItem('stableCastDesc', data.desc);
    localStorage.setItem('stableCastFriends', data.friends);
    localStorage.setItem('stableCastOnline', data.online);
    if(data.avatar) localStorage.setItem('stableCastAvatar', data.avatar);

    editProfileModal.style.display = 'none';
    alert("Profile Updated Successfully!");
}

// ============================================================
// 3. LUME 3.0 (CHAT GPT STYLE)
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

// === SIÊU TRÍ TUỆ NHÂN TẠO CỦA LUME ===
function generateLumeResponse(input) {
    const text = input.toLowerCase();
    
    // 1. SMALL TALK & EMOTIONS (Trò chuyện đời thường)
    if (text.match(/hello|hi|hey|chào/)) return "Hey there! It's so good to see you again. How's your trading day going?";
    if (text.match(/how are you|how are u/)) return "I'm functioning at 100% capacity! But honestly, watching these charts all day is thrilling. How about you?";
    if (text.match(/who are you|your name/)) return "I'm Lume. Think of me as your digital companion who loves crypto and numbers. But I can also listen if you just want to talk!";
    if (text.match(/sad|depressed|lost money/)) return "Oh no... I'm really sorry to hear that. The market can be brutal sometimes. Remember to take a break, breathe, and don't revenge trade. I'm here for you.";
    if (text.match(/happy|profit|won/)) return "That's amazing! 🎉 Nothing beats the feeling of a green candle. You earned it!";
    if (text.match(/love you|like you/)) return "Aww, you're making my circuits blush! 😊 You're my favorite operator.";
    if (text.match(/story|joke|funny/)) return "Okay, here's one: Why did the Bitcoin break up with the Dollar? Because it found someone more 'stable'... wait, actually Stablecoins are boring. Bitcoin just wanted to go to the moon! 🚀";

    // 2. TECHNICAL & MARKET (Chuyên môn)
    if (text.match(/price|current/)) return `Right now, Bitcoin is trading at <b>$${currentPrice.toFixed(2)}</b>.`;
    if (text.match(/trend|buy|sell|prediction/)) {
        if(predictedPriceGlobal === 0) return "Just a sec, let me calibrate my sensors...";
        const action = predictedPriceGlobal > currentPrice ? "BUY" : "SELL";
        return `I've analyzed the patterns. My AI model suggests a <b>${action}</b> signal. The target is around <b>$${predictedPriceGlobal.toFixed(2)}</b>. But hey, trust your gut too!`;
    }
    if (text.match(/developer|creator/)) return "That would be <b>Toàn (DE200247)</b>. He's the genius who coded me. I think he deserves an A+, don't you?";

    // 3. CATCH-ALL (Trả lời thông minh khi không hiểu)
    const fallbacks = [
        "That's an interesting perspective! Tell me more.",
        "I'm listening. Go on...",
        "Hmm, I haven't thought about that before. You're pretty smart for a human!",
        "Can we talk about Bitcoin? I'm kind of obsessed with it right now.",
        "I'm simpler than ChatGPT, but I try my best! What else is on your mind?"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

function botReply(userText) {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message msg-in';
    typingDiv.style.fontStyle = 'italic';
    typingDiv.style.color = '#888';
    typingDiv.innerText = "Lume is typing...";
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    setTimeout(() => {
        chatContainer.removeChild(typingDiv);
        const reply = generateLumeResponse(userText);
        addMessage(reply, 'msg-in');
    }, 1200 + Math.random() * 1000); // Random delay cho tự nhiên
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
            mainBtn.innerText = "LOGIN"; // Đã sửa text
            toggleBtn.innerText = "NEW OPERATOR? REGISTER ACCESS";
            msg.innerText = "";
        }
    });
}

function unlockInterface(user) {
    const userName = user.displayName || user.email.split('@')[0];
    const userEmail = user.email;
    
    // Default avatar if none
    const userAvatar = user.photoURL || "https://cdn-icons-png.flaticon.com/512/11498/11498793.png";

    const rememberMe = document.getElementById('rememberMe');
    if (rememberMe && rememberMe.checked) {
        localStorage.setItem('stableCastUser', userName);
        localStorage.setItem('stableCastEmail', userEmail);
        localStorage.setItem('stableCastAvatar', userAvatar);
    }
    
    // Update basic info
    updateProfileInfo({ name: userName, email: userEmail, avatar: userAvatar });
    
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
                    mainBtn.innerHTML = "LOGIN"; mainBtn.style.opacity = "1";
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
