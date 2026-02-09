// === CẤU HÌNH FIREBASE (GIỮ NGUYÊN) ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
const firebaseConfig = {
  apiKey: "AIzaSyAK2kjWRLaZTCawfQywNdLJcmGvcALPLuc",
  authDomain: "stablecast-login.firebaseapp.com",
  projectId: "stablecast-login",
  storageBucket: "stablecast-login.firebasestorage.app",
  messagingSenderId: "282707836063",
  appId: "1:282707836063:web:cdbe29c541635ca2ba76aa"
};
const app = initializeApp(firebaseConfig);

// System Vars
let currentPrice = 0;
let predictedPriceGlobal = 0;
let chart;

// === KHỞI TẠO HỆ THỐNG ===
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('stableCastUser');
    if (savedUser) {
        document.getElementById('loginOverlay').style.display = 'none';
        const mainApp = document.querySelector('.main-app-container');
        mainApp.style.display = 'block';
        setTimeout(() => { mainApp.style.opacity = '1'; }, 50);
        loadProfileData();
        initSystem();
    }
});

function checkEmpty(val) { return (!val || val.trim() === "") ? "None" : val; }

// === LOAD & UPDATE PROFILE (CÓ THÊM COVER) ===
function loadProfileData() {
    const data = {
        name: localStorage.getItem('stableCastUser') || "Phan Bá Song Toàn",
        email: localStorage.getItem('stableCastEmail') || "toanpbs@fpt.edu.vn",
        avatar: localStorage.getItem('stableCastAvatar'),
        cover: localStorage.getItem('stableCastCover') || "https://png.pngtree.com/background/20210714/original/pngtree-abstract-technology-background-technical-presentation-picture-image_1252549.jpg",
        role: localStorage.getItem('stableCastRole') || "Lead Developer | FPT University",
        id: localStorage.getItem('stableCastID') || "DE200247",
        desc: localStorage.getItem('stableCastDesc') || "StableCast is an advanced AI terminal..."
    };
    updateProfileInfo(data);
}

function updateProfileInfo(data) {
    const setTxt = (id, val) => { if(document.getElementById(id)) document.getElementById(id).innerText = val; };
    setTxt('profile-name-txt', data.name);
    setTxt('profile-email-txt', data.email);
    setTxt('profile-role-txt', data.role);
    setTxt('profile-id-txt', data.id);
    setTxt('profile-desc-txt', data.desc);
    
    if(data.avatar) document.getElementById('profile-avatar-img').src = data.avatar;
    if(data.cover) document.querySelector('.profile-cover').style.backgroundImage = `url('${data.cover}')`;
}

// === NAVIGATION ===
const btnTerminal = document.getElementById('btn-terminal');
const btnProfile = document.getElementById('btn-profile');
const views = { dashboard: document.getElementById('dashboard-view'), profile: document.getElementById('profile-view') };

function switchView(viewName) {
    Object.keys(views).forEach(key => views[key].style.display = 'none');
    views[viewName].style.display = 'block';
    btnTerminal.classList.toggle('active', viewName === 'dashboard');
    btnProfile.classList.toggle('active', viewName === 'profile');
}
btnTerminal.onclick = () => switchView('dashboard');
btnProfile.onclick = () => switchView('profile');

// === EDIT PROFILE LOGIC (ASYNC ĐỂ ĐỌC FILE) ===
const editProfileBtn = document.getElementById('editProfileBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');

editProfileBtn.onclick = () => {
    document.getElementById('editProfileModal').style.display = 'flex';
    document.getElementById('editNameInput').value = document.getElementById('profile-name-txt').innerText;
    document.getElementById('editRoleInput').value = document.getElementById('profile-role-txt').innerText;
    document.getElementById('editIDInput').value = document.getElementById('profile-id-txt').innerText;
    document.getElementById('editEmailInput').value = document.getElementById('profile-email-txt').innerText;
    document.getElementById('editDescInput').value = document.getElementById('profile-desc-txt').innerText;
};

document.getElementById('closeEditModal').onclick = () => document.getElementById('editProfileModal').style.display = 'none';

saveProfileBtn.onclick = async () => {
    const data = {
        name: checkEmpty(document.getElementById('editNameInput').value),
        role: checkEmpty(document.getElementById('editRoleInput').value),
        id: checkEmpty(document.getElementById('editIDInput').value),
        email: checkEmpty(document.getElementById('editEmailInput').value),
        desc: checkEmpty(document.getElementById('editDescInput').value),
        avatar: document.getElementById('profile-avatar-img').src,
        cover: localStorage.getItem('stableCastCover')
    };

    const avatarFile = document.getElementById('editAvatarInput').files[0];
    const coverFile = document.getElementById('editCoverInput').files[0];

    const toBase64 = file => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });

    if (avatarFile) data.avatar = await toBase64(avatarFile);
    if (coverFile) data.cover = await toBase64(coverFile);

    updateProfileInfo(data);
    localStorage.setItem('stableCastUser', data.name);
    localStorage.setItem('stableCastRole', data.role);
    localStorage.setItem('stableCastID', data.id);
    localStorage.setItem('stableCastEmail', data.email);
    localStorage.setItem('stableCastDesc', data.desc);
    localStorage.setItem('stableCastAvatar', data.avatar);
    localStorage.setItem('stableCastCover', data.cover);

    document.getElementById('editProfileModal').style.display = 'none';
    alert("Profile Updated!");
};

// === CORE TERMINAL & LUME AI (GIỮ NGUYÊN LOGIC) ===
function initSystem() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    chart = new Chart(ctx, { type: 'line', data: { labels: [], datasets: [{ label: 'BTC', data: [], borderColor: '#0ecb81' }] }, options: { animation: false } });
    
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
    ws.onmessage = (e) => {
        const trade = JSON.parse(e.data);
        currentPrice = parseFloat(trade.p);
        document.getElementById('btcPrice').innerText = `$${currentPrice.toFixed(2)}`;
        if(chart.data.labels.length > 20) { chart.data.labels.shift(); chart.data.datasets[0].data.shift(); }
        chart.data.labels.push(new Date().toLocaleTimeString());
        chart.data.datasets[0].data.push(currentPrice);
        chart.update();
    };

    setInterval(() => {
        predictedPriceGlobal = currentPrice + (Math.random() * 20 - 10);
        document.getElementById('predPrice').innerText = `$${predictedPriceGlobal.toFixed(2)}`;
    }, 3000);
}

// Chat Logic
document.getElementById('openChatBtn').onclick = () => document.getElementById('chatSystemOverlay').style.display = 'flex';
document.getElementById('closeChatBtn').onclick = () => document.getElementById('chatSystemOverlay').style.display = 'none';

document.getElementById('sendMsgBtn').onclick = () => {
    const input = document.getElementById('msgInput');
    if(!input.value) return;
    const msg = document.createElement('div');
    msg.className = 'message msg-out';
    msg.innerText = input.value;
    document.getElementById('chatContainer').appendChild(msg);
    
    setTimeout(() => {
        const reply = document.createElement('div');
        reply.className = 'message msg-in';
        reply.innerText = `Lume: Analysis for "${input.value}" shows BTC is stable at ${currentPrice}.`;
        document.getElementById('chatContainer').appendChild(reply);
    }, 1000);
    input.value = "";
};

// Login Trigger
document.getElementById('mainAuthBtn').onclick = () => {
    localStorage.setItem('stableCastUser', document.getElementById('email').value || "Phan Bá Song Toàn");
    location.reload();
};
