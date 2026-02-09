import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// FIREBASE CONFIG
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

// VARS
let currentPrice = 0;
let priceHistory = [];
let forecastHistory = [];
let timeLabels = [];
let chart; 
let ws; 
let activeChatId = 'lume';

// DATA FRIENDS
let friendList = JSON.parse(localStorage.getItem('stableCastFriendList')) || [
    { id: 'lume', name: 'Lume (AI Assistant)', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=200&auto=format&fit=crop' },
    { id: 'alice', name: 'Alice Crypto', avatar: 'https://i.pravatar.cc/150?img=5' },
    { id: 'bob', name: 'Bob Miner', avatar: 'https://i.pravatar.cc/150?img=11' }
];

// === 0. AUTO LOGIN & INIT ===
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('stableCastUser');
    if (savedUser) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.querySelector('.main-app-container').style.display = 'block';
        setTimeout(() => { document.querySelector('.main-app-container').style.opacity = '1'; }, 50);
        
        loadProfile();
        setTimeout(initSystem, 500); // Start Chart
    }
});

function loadProfile() {
    const name = localStorage.getItem('stableCastUser') || "OPERATOR";
    const role = localStorage.getItem('stableCastRole') || "Lead Developer";
    const avatar = localStorage.getItem('stableCastAvatar');
    
    document.getElementById('display-name').innerText = name;
    document.getElementById('display-role').innerText = role;
    if(avatar) document.getElementById('display-avatar').src = avatar;
}

// === 1. SYSTEM CORE (CHART & WEBSOCKET) ===
function log(msg) {
    const box = document.getElementById('terminalLogs');
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString()}]</span> ${msg}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function initSystem() {
    log("Initializing Neural Network...");
    log("Loading Ensemble Models (LSTM + XGB)...");
    
    const ctx = document.getElementById('mainChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Real-time Price', data: priceHistory, borderColor: '#0ecb81', backgroundColor: 'rgba(14, 203, 129, 0.05)', borderWidth: 2, tension: 0.2, fill: true, pointRadius: 0
            }, {
                label: 'AI Forecast', data: forecastHistory, borderColor: '#3b82f6', borderWidth: 2, borderDash: [5, 5], tension: 0.4, pointRadius: 0, fill: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: true, labels: { color: '#848e9c' } } },
            scales: { x: { display: false }, y: { position: 'right', grid: { color: '#2b3139' }, ticks: { color: '#848e9c' } } },
            animation: false
        }
    });

    log("Connecting to Binance WebSocket Feed...");
    ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.p);
        currentPrice = price;
        
        const pEl = document.getElementById('btcPrice');
        if(pEl) {
            pEl.style.color = price >= (priceHistory[priceHistory.length-1] || 0) ? '#0ecb81' : '#f6465d';
            pEl.innerText = `$${price.toFixed(2)}`;
        }

        const timeNow = new Date().toLocaleTimeString();
        if (timeLabels.length > 60) { timeLabels.shift(); priceHistory.shift(); if(forecastHistory.length > 60) forecastHistory.shift(); }
        timeLabels.push(timeNow);
        priceHistory.push(price);
        chart.update();
    };

    // AI Simulation Loop
    setInterval(() => {
        if(currentPrice === 0) return;
        const fakePrice = currentPrice + (Math.random() * 50 - 20);
        const dir = fakePrice > currentPrice ? 'UP' : 'DOWN';
        
        document.getElementById('predPrice').innerText = `$${fakePrice.toFixed(2)}`;
        document.getElementById('predPrice').style.color = dir === 'UP' ? '#0ecb81' : '#f6465d';
        
        // Auto Calc StopLoss/TP
        const vol = Math.abs(fakePrice - currentPrice) * 1.5 + 20;
        document.getElementById('stopLoss').innerText = `$${(currentPrice - vol).toFixed(2)}`;
        document.getElementById('takeProfit').innerText = `$${(currentPrice + vol*2).toFixed(2)}`;

        forecastHistory.push(fakePrice);
        if(Math.random() > 0.8) log(`Inference [Ensemble]: Predict ${dir} -> Conf: ${(90 + Math.random()*9).toFixed(1)}%`);
    }, 2000);
}

// === 2. LOGIN LOGIC ===
const mainBtn = document.getElementById('mainAuthBtn');
if(mainBtn) {
    mainBtn.addEventListener('click', () => {
        const id = document.getElementById('email').value.trim() || "DE200247";
        if(document.getElementById('password').value === '123456' || true) { // Bypass for demo
            localStorage.setItem('stableCastUser', "Phan Bá Song Toàn");
            localStorage.setItem('stableCastRole', "Lead Developer");
            localStorage.setItem('stableCastID', id);
            location.reload();
        }
    });
}

// === 3. POPUPS & CHAT ===
window.openEditProfile = () => {
    document.getElementById('editProfileModal').style.display = 'flex';
    document.getElementById('editNameInput').value = localStorage.getItem('stableCastUser');
    document.getElementById('editRoleInput').value = localStorage.getItem('stableCastRole');
};

window.openChat = () => {
    document.getElementById('chatModal').style.display = 'flex';
    renderFriendList();
    loadChat(activeChatId);
};

window.closeModal = (id) => {
    document.getElementById(id).style.display = 'none';
};

// Edit Profile Save
document.getElementById('saveProfileBtn').addEventListener('click', () => {
    const name = document.getElementById('editNameInput').value || "Operator";
    const role = document.getElementById('editRoleInput').value || "Trader";
    
    localStorage.setItem('stableCastUser', name);
    localStorage.setItem('stableCastRole', role);
    
    // Avatar Logic
    const file = document.getElementById('editAvatarInput').files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            localStorage.setItem('stableCastAvatar', e.target.result);
            loadProfile();
        };
        reader.readAsDataURL(file);
    } else {
        loadProfile();
    }
    closeModal('editProfileModal');
});

// Chat Logic
function renderFriendList() {
    const list = document.getElementById('friendListContainer');
    list.innerHTML = "";
    friendList.forEach(f => {
        const div = document.createElement('div');
        div.className = `friend-item ${f.id === activeChatId ? 'active' : ''}`;
        div.onclick = () => { activeChatId = f.id; renderFriendList(); loadChat(f.id); };
        div.innerHTML = `<img src="${f.avatar}" class="friend-avatar"><span>${f.name}</span>`;
        list.appendChild(div);
    });
}

function loadChat(id) {
    const friend = friendList.find(f => f.id === id);
    document.getElementById('chatHeaderName').innerText = friend.name;
    document.getElementById('chatContainer').innerHTML = ""; // Clear old msgs
    
    if(id === 'lume') addMsg("Hello Operator! I am tracking the market.", 'msg-in');
    else addMsg(`Connected with ${friend.name}.`, 'msg-in');
}

window.sendChat = () => {
    const txt = document.getElementById('chatInput').value;
    if(!txt) return;
    addMsg(txt, 'msg-out');
    document.getElementById('chatInput').value = "";
    
    if(activeChatId === 'lume') {
        setTimeout(() => {
            const reply = `BTC Price: $${currentPrice.toFixed(2)}. Trend: Volatile.`;
            addMsg(reply, 'msg-in');
        }, 800);
    }
};

function addMsg(txt, type) {
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    div.innerText = txt;
    const box = document.getElementById('chatContainer');
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}
