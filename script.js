import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// === CẤU HÌNH (Dán lại nếu bạn đổi Key) ===
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

// System Vars
let currentPrice = 0;
let predictedPriceGlobal = 0; 
let priceHistory = [];
let forecastHistory = [];
let timeLabels = [];
let chart; 
let ws; 
let communityPosts = JSON.parse(localStorage.getItem('stableCastPosts')) || [
    { id: 1, name: "Alice Crypto", handle: "@alice_btc", avatar: "https://i.pravatar.cc/150?img=5", time: "2h ago", text: "BTC holding strong support at $68k. Accumulation phase? #Bitcoin", connected: false },
    { id: 2, name: "Bob Miner", handle: "@miner_bob", avatar: "https://i.pravatar.cc/150?img=11", time: "4h ago", text: "Hashrate is spiking again. Difficulty adjustment incoming.", connected: false }
];

// ============================================================
// 0. AUTO-LOGIN & INIT
// ============================================================
// Chạy khi trang load xong
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('stableCastUser');
    if (savedUser) {
        // Ẩn login ngay lập tức
        const loginOverlay = document.getElementById('loginOverlay');
        if(loginOverlay) loginOverlay.style.display = 'none';
        
        const mainApp = document.querySelector('.main-app-container');
        if(mainApp) {
            mainApp.style.display = 'block';
            setTimeout(() => { mainApp.style.opacity = '1'; }, 50);
        }
        
        loadProfileData();
        startTimeTracking();
        renderFeed();
        
        // Khởi động chart sau 1 chút để DOM ổn định
        setTimeout(() => { initSystem(); }, 500);
    }
});

// Helper: Nếu chuỗi rỗng -> Trả về "None"
function checkEmpty(val) {
    if (!val || val.trim() === "") return "None";
    return val;
}

function loadProfileData() {
    const data = {
        name: localStorage.getItem('stableCastUser'),
        email: localStorage.getItem('stableCastEmail'),
        avatar: localStorage.getItem('stableCastAvatar'),
        role: localStorage.getItem('stableCastRole'),
        id: localStorage.getItem('stableCastID') || "DE200247",
        org: localStorage.getItem('stableCastOrg') || "FPT University",
        loc: localStorage.getItem('stableCastLoc') || "Da Nang, Vietnam",
        desc: localStorage.getItem('stableCastDesc') || "StableCast is an advanced AI-powered cryptocurrency price prediction terminal...",
        friends: localStorage.getItem('stableCastFriends') || "0"
    };
    updateProfileInfo(data);
}

// ============================================================
// 1. NAV LOGIC
// ============================================================
const btnTerminal = document.getElementById('btn-terminal');
const btnCommunity = document.getElementById('btn-community');
const btnProfile = document.getElementById('btn-profile');
const views = {
    dashboard: document.getElementById('dashboard-view'),
    community: document.getElementById('community-view'),
    profile: document.getElementById('profile-view')
};

function switchView(viewName) {
    if(btnTerminal) btnTerminal.classList.remove('active');
    if(btnCommunity) btnCommunity.classList.remove('active');
    if(btnProfile) btnProfile.classList.remove('active');
    
    if(viewName === 'dashboard' && btnTerminal) btnTerminal.classList.add('active');
    if(viewName === 'community' && btnCommunity) btnCommunity.classList.add('active');
    if(viewName === 'profile' && btnProfile) btnProfile.classList.add('active');

    if(views.dashboard) views.dashboard.style.display = 'none';
    if(views.community) views.community.style.display = 'none';
    if(views.profile) views.profile.style.display = 'none';
    
    if(views[viewName]) views[viewName].style.display = 'block';
}

if(btnTerminal) btnTerminal.addEventListener('click', () => switchView('dashboard'));
if(btnCommunity) btnCommunity.addEventListener('click', () => switchView('community'));
if(btnProfile) btnProfile.addEventListener('click', () => switchView('profile'));

// ============================================================
// 2. EDIT PROFILE (Handling "None")
// ============================================================
const editProfileBtn = document.getElementById('editProfileBtn');
const editProfileModal = document.getElementById('editProfileModal');
const closeEditModal = document.getElementById('closeEditModal');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const editAvatarInput = document.getElementById('editAvatarInput');

if(editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
        if(editProfileModal) editProfileModal.style.display = 'flex';
        // Pre-fill inputs safely
        const setVal = (id, targetId) => {
            const el = document.getElementById(id);
            const target = document.getElementById(targetId);
            if(el && target) el.value = target.innerText === "None" ? "" : target.innerText;
        };
        setVal('editNameInput', 'profile-name-txt');
        setVal('editRoleInput', 'profile-role-txt');
        setVal('editIDInput', 'profile-id-txt');
        setVal('editEmailInput', 'profile-email-txt');
        setVal('editOrgInput', 'profile-org-txt');
        setVal('editLocInput', 'profile-loc-txt');
        setVal('editDescInput', 'profile-desc-txt');
    });
}

if(closeEditModal) closeEditModal.addEventListener('click', () => editProfileModal.style.display = 'none');

if(saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
        // Collect Data with checkEmpty
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? checkEmpty(el.value) : "None";
        };

        const data = {
            name: getVal('editNameInput'),
            role: getVal('editRoleInput'),
            id: getVal('editIDInput'),
            email: getVal('editEmailInput'),
            org: getVal('editOrgInput'),
            loc: getVal('editLocInput'),
            desc: getVal('editDescInput'),
            avatar: null
        };

        // Handle Avatar
        if (editAvatarInput && editAvatarInput.files && editAvatarInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                data.avatar = e.target.result;
                saveAndUpdate(data);
            }
            reader.readAsDataURL(editAvatarInput.files[0]);
        } else {
            const img = document.getElementById('profile-avatar-img');
            data.avatar = img ? img.src : null;
            saveAndUpdate(data);
        }
    });
}

function saveAndUpdate(data) {
    updateProfileInfo(data);
    localStorage.setItem('stableCastUser', data.name);
    localStorage.setItem('stableCastRole', data.role);
    localStorage.setItem('stableCastID', data.id);
    localStorage.setItem('stableCastEmail', data.email);
    localStorage.setItem('stableCastOrg', data.org);
    localStorage.setItem('stableCastLoc', data.loc);
    localStorage.setItem('stableCastDesc', data.desc);
    if(data.avatar) localStorage.setItem('stableCastAvatar', data.avatar);

    if(editProfileModal) editProfileModal.style.display = 'none';
    alert("Profile Updated Successfully!");
}

function updateProfileInfo(data) {
    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if(el && val) el.innerText = val;
    };
    setTxt('profile-name-txt', data.name);
    setTxt('profile-email-txt', data.email);
    setTxt('profile-role-txt', data.role);
    setTxt('profile-id-txt', data.id);
    setTxt('profile-org-txt', data.org);
    setTxt('profile-loc-txt', data.loc);
    setTxt('profile-desc-txt', data.desc);
    setTxt('stat-friends', data.friends);
    
    if(data.avatar) {
        const img = document.getElementById('profile-avatar-img');
        if(img) img.src = data.avatar;
    }
}

// ============================================================
// 3. REAL-TIME STATS & COMMUNITY
// ============================================================
function startTimeTracking() {
    let totalMinutes = parseInt(localStorage.getItem('stableCastTotalMinutes')) || 0;
    updateTimeDisplay(totalMinutes);
    setInterval(() => {
        totalMinutes++;
        localStorage.setItem('stableCastTotalMinutes', totalMinutes);
        updateTimeDisplay(totalMinutes);
    }, 60000);
}

function updateTimeDisplay(minutes) {
    const el = document.getElementById('stat-hours');
    if(!el) return;
    if (minutes < 60) el.innerText = `${minutes}m`;
    else el.innerText = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function renderFeed() {
    const feedStream = document.getElementById('feedStream');
    if(!feedStream) return;
    feedStream.innerHTML = "";
    
    communityPosts.forEach(post => {
        const postEl = document.createElement('div');
        postEl.className = "feed-post";
        const connectBtnHtml = post.connected 
            ? `<span style="color:#0ecb81; font-size:0.8rem; margin-left:10px;"><i class="fas fa-check"></i> Friends</span>` 
            : `<button class="connect-btn" onclick="window.connectUser(${post.id})"><i class="fas fa-user-plus"></i> Connect</button>`;

        postEl.innerHTML = `
            <img src="${post.avatar}" class="post-avatar">
            <div class="post-content">
                <div class="post-header">
                    <div><span class="post-user">${post.name}</span><span class="post-handle">${post.handle}</span>${connectBtnHtml}</div>
                </div>
                <div class="post-text">${post.text}</div>
            </div>`;
        feedStream.prepend(postEl);
    });
}

// Global function for onclick
window.connectUser = function(postId) {
    const postIndex = communityPosts.findIndex(p => p.id === postId);
    if (postIndex > -1 && !communityPosts[postIndex].connected) {
        communityPosts[postIndex].connected = true;
        let friends = parseInt(localStorage.getItem('stableCastFriends')) || 0;
        friends++;
        localStorage.setItem('stableCastFriends', friends);
        document.getElementById('stat-friends').innerText = friends;
        localStorage.setItem('stableCastPosts', JSON.stringify(communityPosts));
        renderFeed();
    }
}

const submitPostBtn = document.getElementById('submitPostBtn');
if(submitPostBtn) {
    submitPostBtn.addEventListener('click', () => {
        const input = document.getElementById('postInput');
        const text = input.value.trim();
        if(text) {
            const name = document.getElementById('profile-name-txt').innerText;
            const newPost = {
                id: Date.now(),
                name: name,
                handle: "@" + name.replace(/\s+/g, '').toLowerCase(),
                avatar: document.getElementById('profile-avatar-img').src,
                time: "Just now",
                text: text,
                connected: true
            };
            communityPosts.push(newPost);
            localStorage.setItem('stableCastPosts', JSON.stringify(communityPosts));
            input.value = "";
            renderFeed();
        }
    });
}

// ============================================================
// 4. LUME & CHAT
// ============================================================
const openChatBtn = document.getElementById('openChatBtn');
const chatOverlay = document.getElementById('chatSystemOverlay');
const closeChatBtn = document.getElementById('closeChatBtn');
const sendMsgBtn = document.getElementById('sendMsgBtn');
const msgInput = document.getElementById('msgInput');
const chatContainer = document.getElementById('chatContainer');

if(openChatBtn) openChatBtn.addEventListener('click', () => { if(chatOverlay) chatOverlay.style.display = 'flex'; });
if(closeChatBtn) closeChatBtn.addEventListener('click', () => { if(chatOverlay) chatOverlay.style.display = 'none'; });

function addMessage(text, type) {
    if(!chatContainer) return;
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = `${text}<div class="msg-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function generateLumeResponse(input) {
    const text = input.toLowerCase();
    if (text.match(/hello|hi|hey/)) return `Hello, Operator ${document.getElementById('profile-name-txt').innerText}! Ready for some market action?`;
    if (text.match(/price/)) return `BTC is currently at <b>$${currentPrice.toFixed(2)}</b>.`;
    if (text.match(/buy|sell|trend/)) {
        if(predictedPriceGlobal === 0) return "Gathering data... Ask me in a few seconds.";
        const trend = predictedPriceGlobal > currentPrice ? "BULLISH" : "BEARISH";
        return `My analysis indicates a <b>${trend}</b> trend targeting $${predictedPriceGlobal.toFixed(2)}.`;
    }
    return "I'm listening. Ask me about the price, trends, or just chat with me!";
}

if(sendMsgBtn) {
    const handleSend = () => {
        const text = msgInput.value.trim();
        if(text) {
            addMessage(text, 'msg-out');
            msgInput.value = '';
            // Bot typing effect
            setTimeout(() => {
                const reply = generateLumeResponse(text);
                addMessage(reply, 'msg-in');
            }, 1000);
        }
    };
    sendMsgBtn.addEventListener('click', handleSend);
    if(msgInput) msgInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleSend(); });
}

// ============================================================
// 5. CHART & CORE
// ============================================================
function initSystem() {
    const logBox = document.getElementById('terminalLogs');
    const log = (msg) => {
        if(!logBox) return;
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString()}]</span> ${msg}`;
        logBox.appendChild(div);
        logBox.scrollTop = logBox.scrollHeight;
    };
    
    log("System initialized. Welcome back.");
    
    const ctx = document.getElementById('mainChart');
    if(!ctx) return; 

    chart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Real-time Price', data: priceHistory, borderColor: '#0ecb81', borderWidth: 2, tension: 0.2, pointRadius: 0
            }, {
                label: 'AI Ensemble Forecast', data: forecastHistory, borderColor: '#3b82f6', borderWidth: 2, borderDash: [5, 5], tension: 0.4, pointRadius: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, 
            scales: { x: { display: false }, y: { position: 'right', grid: { color: '#2b3139' }, ticks: { color: '#848e9c' } } },
            animation: false
        }
    });

    log("Connecting to Binance WebSocket...");
    ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.p);
        
        const priceEl = document.getElementById('btcPrice');
        if(priceEl) {
            if (currentPrice > 0) priceEl.style.color = price >= currentPrice ? '#0ecb81' : '#f6465d';
            priceEl.innerText = `$${price.toFixed(2)}`;
        }
        currentPrice = price;

        const timeNow = new Date().toLocaleTimeString();
        if (timeLabels.length > 50) { timeLabels.shift(); priceHistory.shift(); if(forecastHistory.length > 50) forecastHistory.shift(); }
        timeLabels.push(timeNow);
        priceHistory.push(price);
        if(chart) chart.update();
    };

    // AI Simulation
    aiInterval = setInterval(() => {
        if(currentPrice === 0) return;
        // Mock prediction logic since we don't have backend
        const fakePrice = currentPrice + (Math.random() * 40 - 15);
        predictedPriceGlobal = fakePrice;
        
        const predEl = document.getElementById('predPrice');
        if(predEl) {
            predEl.innerText = `$${fakePrice.toFixed(2)}`;
            predEl.style.color = fakePrice > currentPrice ? '#0ecb81' : '#f6465d';
        }
        
        forecastHistory.push(fakePrice);
        if(forecastHistory.length > 50) forecastHistory.shift();
        if(chart) chart.update();
    }, 2000);
}

// Login Button Logic
const mainBtn = document.getElementById('mainAuthBtn');
if(mainBtn) {
    mainBtn.addEventListener('click', () => {
        // Simplified Login for Demo
        const user = document.getElementById('email').value || "Guest";
        localStorage.setItem('stableCastUser', user);
        location.reload(); // Reload to trigger auto-login
    });
}
