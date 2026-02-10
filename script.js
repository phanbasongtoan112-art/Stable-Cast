import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// === CẤU HÌNH (GIỮ NGUYÊN) ===
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

// --- DỮ LIỆU BẠN BÈ ---
const friendList = [
    { name: "Nguyễn Quốc Đạt", role: "Backend Dev", avatar: "https://i.pravatar.cc/150?u=1", cover: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80", desc: "Expert in Node.js & Microservices.", mutual: 12 },
    { name: "Trần Thái Sơn", role: "AI Researcher", avatar: "https://i.pravatar.cc/150?u=2", cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80", desc: "Building the next gen trading algos.", mutual: 8 },
    { name: "Lê Minh Quân", role: "Data Analyst", avatar: "https://i.pravatar.cc/150?u=3", cover: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80", desc: "Converting data into profit.", mutual: 15 },
    { name: "Phạm Gia Huy", role: "Security Ops", avatar: "https://i.pravatar.cc/150?u=4", cover: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80", desc: "Keeping the terminal secure.", mutual: 5 },
    { name: "Nguyễn Văn Tân", role: "Frontend Dev", avatar: "https://i.pravatar.cc/150?u=5", cover: "https://images.unsplash.com/photo-1550439062-609e1531270e?auto=format&fit=crop&w=600&q=80", desc: "Pixel perfect interfaces.", mutual: 20 },
    { name: "Đỗ Thu Hiền", role: "Designer", avatar: "https://i.pravatar.cc/150?u=9", cover: "https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?auto=format&fit=crop&w=600&q=80", desc: "UI/UX Specialist for Trading Apps.", mutual: 32 }
];

// ============================================================
// 0. AUTO-LOGIN & INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('stableCastUser');
    if (savedUser) {
        const loginOverlay = document.getElementById('loginOverlay');
        if(loginOverlay) loginOverlay.style.display = 'none';
        
        const mainApp = document.querySelector('.main-app-container');
        if(mainApp) {
            mainApp.style.display = 'block';
            setTimeout(() => { mainApp.style.opacity = '1'; }, 50);
        }
        
        loadProfileData();
        renderFriendList();
        startTimeTracking();
        renderFeed();
        
        setTimeout(() => { initSystem(); }, 500);
    }
});

function checkEmpty(val) {
    if (!val || val.trim() === "") return "None";
    return val;
}

function loadProfileData() {
    const data = {
        name: localStorage.getItem('stableCastUser'),
        email: localStorage.getItem('stableCastEmail'),
        avatar: localStorage.getItem('stableCastAvatar'),
        cover: localStorage.getItem('stableCastCover') || "https://png.pngtree.com/background/20210714/original/pngtree-abstract-technology-background-technical-presentation-picture-image_1252549.jpg",
        role: localStorage.getItem('stableCastRole'),
        id: localStorage.getItem('stableCastID') || "DE200247",
        org: localStorage.getItem('stableCastOrg') || "FPT University",
        loc: localStorage.getItem('stableCastLoc') || "Da Nang, Vietnam",
        desc: localStorage.getItem('stableCastDesc') || "StableCast is an advanced AI-powered cryptocurrency price prediction terminal...",
        friends: localStorage.getItem('stableCastFriends') || "0"
    };
    updateProfileInfo(data);
}

function renderFriendList() {
    const container = document.getElementById('friendGridContainer');
    if(!container) return;
    container.innerHTML = "";

    friendList.forEach((friend, index) => {
        const div = document.createElement('div');
        div.className = "friend-card";
        div.style.cursor = "pointer";
        
        div.onclick = (e) => {
            if(e.target.closest('.friend-add-btn')) return;
            openFriendModal(index);
        };

        div.innerHTML = `
            <img src="${friend.avatar}" class="friend-card-img">
            <div class="friend-card-info">
                <div class="friend-card-name">${friend.name}</div>
                <div class="friend-card-role">${friend.role}</div>
                <div class="friend-card-mutual">${friend.mutual} mutual friends</div>
            </div>
            <button class="friend-add-btn"><i class="fas fa-user-plus"></i> Add Friend</button>
        `;
        container.appendChild(div);
    });
    
    const countEl = document.getElementById('friendCountDisplay');
    if(countEl) countEl.innerText = `(${friendList.length})`;
}

function openFriendModal(index) {
    const friend = friendList[index];
    const modal = document.getElementById('viewFriendModal');
    
    document.getElementById('friend-modal-cover').style.backgroundImage = `url('${friend.cover}')`;
    document.getElementById('friend-modal-avatar').src = friend.avatar;
    document.getElementById('friend-modal-name').innerText = friend.name;
    document.getElementById('friend-modal-role').innerText = friend.role;
    document.getElementById('friend-modal-desc').innerText = friend.desc;
    document.getElementById('friend-modal-mutual').innerText = friend.mutual;
    
    modal.style.display = 'flex';
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
// 2. EDIT PROFILE & CROPPER LOGIC (CẬP NHẬT MỚI)
// ============================================================
const editProfileBtn = document.getElementById('editProfileBtn');
const editProfileModal = document.getElementById('editProfileModal');
const closeEditModal = document.getElementById('closeEditModal');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const closeFriendModal = document.getElementById('closeFriendModal');

if(editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
        if(editProfileModal) editProfileModal.style.display = 'flex';
        // Reset cropper area
        document.getElementById('cropper-container').style.display = 'none';
        document.getElementById('edit-form-container').style.display = 'block';
        
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
if(closeFriendModal) closeFriendModal.addEventListener('click', () => document.getElementById('viewFriendModal').style.display = 'none');

// --- CROPPER VARIABLES ---
let cropper;
let currentCropType = ''; // 'avatar' or 'cover'
const cropperImage = document.getElementById('cropper-image');
const editAvatarInput = document.getElementById('editAvatarInput');
const editCoverInput = document.getElementById('editCoverInput');

// Temp storage for cropped results
let tempAvatar = null;
let tempCover = null;

// Hàm khởi tạo crop
function initCropper(file, type) {
    const reader = new FileReader();
    reader.onload = (e) => {
        cropperImage.src = e.target.result;
        document.getElementById('edit-form-container').style.display = 'none';
        document.getElementById('cropper-container').style.display = 'flex';
        
        currentCropType = type;
        
        if(cropper) cropper.destroy();
        
        // Tỷ lệ khung hình: 1:1 cho avatar, 3:1 cho cover
        const aspectRatio = type === 'avatar' ? 1 : 3/1;
        
        cropper = new Cropper(cropperImage, {
            aspectRatio: aspectRatio,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 1,
            background: false,
            modal: true,
            guides: true,
            highlight: false,
            cropBoxMovable: false,
            cropBoxResizable: false,
            toggleDragModeOnDblclick: false,
        });
    };
    reader.readAsDataURL(file);
}

if(editAvatarInput) editAvatarInput.addEventListener('change', (e) => {
    if(e.target.files && e.target.files[0]) initCropper(e.target.files[0], 'avatar');
});

if(editCoverInput) editCoverInput.addEventListener('change', (e) => {
    if(e.target.files && e.target.files[0]) initCropper(e.target.files[0], 'cover');
});

// Nút xác nhận cắt
document.getElementById('crop-confirm-btn').addEventListener('click', () => {
    if(!cropper) return;
    const canvas = cropper.getCroppedCanvas({
        width: currentCropType === 'avatar' ? 300 : 900, // Optimize size
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
    });
    
    const result = canvas.toDataURL();
    
    if(currentCropType === 'avatar') {
        tempAvatar = result;
        // Hiển thị preview nhỏ (nếu muốn, hiện tại ta chỉ lưu biến temp)
        alert("Avatar Cropped! Click 'Save Changes' to finish.");
    } else {
        tempCover = result;
        alert("Cover Cropped! Click 'Save Changes' to finish.");
    }
    
    // Reset view
    document.getElementById('cropper-container').style.display = 'none';
    document.getElementById('edit-form-container').style.display = 'block';
    cropper.destroy();
    cropper = null;
});

// Nút hủy cắt
document.getElementById('crop-cancel-btn').addEventListener('click', () => {
    document.getElementById('cropper-container').style.display = 'none';
    document.getElementById('edit-form-container').style.display = 'block';
    if(cropper) { cropper.destroy(); cropper = null; }
    // Reset input
    editAvatarInput.value = '';
    editCoverInput.value = '';
});

// Save logic cập nhật
if(saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
        const getVal = (id) => document.getElementById(id) ? checkEmpty(document.getElementById(id).value) : "None";

        const data = {
            name: getVal('editNameInput'),
            role: getVal('editRoleInput'),
            id: getVal('editIDInput'),
            email: getVal('editEmailInput'),
            org: getVal('editOrgInput'),
            loc: getVal('editLocInput'),
            desc: getVal('editDescInput'),
            // Ưu tiên lấy ảnh vừa crop, nếu không thì lấy ảnh cũ
            avatar: tempAvatar || document.getElementById('profile-avatar-img').src,
            cover: tempCover || document.querySelector('.profile-cover').style.backgroundImage.replace(/^url\(['"](.+)['"]\)/, '$1')
        };

        saveAndUpdate(data);
        // Reset temp
        tempAvatar = null;
        tempCover = null;
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
    localStorage.setItem('stableCastAvatar', data.avatar);
    localStorage.setItem('stableCastCover', data.cover);

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
    if(data.cover) {
        const coverEl = document.querySelector('.profile-cover');
        if(coverEl) coverEl.style.backgroundImage = `url('${data.cover}')`;
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

        const slPrice = price * 0.99; 
        const tpPrice = price * 1.015;

        const slEl = document.getElementById('stopLoss');
        const tpEl = document.getElementById('takeProfit');
        if(slEl) slEl.innerText = `$${slPrice.toFixed(2)}`;
        if(tpEl) tpEl.innerText = `$${tpPrice.toFixed(2)}`;

        const timeNow = new Date().toLocaleTimeString();
        if (timeLabels.length > 50) { timeLabels.shift(); priceHistory.shift(); if(forecastHistory.length > 50) forecastHistory.shift(); }
        timeLabels.push(timeNow);
        priceHistory.push(price);
        if(chart) chart.update();
    };

    aiInterval = setInterval(() => {
        if(currentPrice === 0) return;
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

const mainBtn = document.getElementById('mainAuthBtn');
if(mainBtn) {
    mainBtn.addEventListener('click', () => {
        const user = document.getElementById('email').value || "Guest";
        localStorage.setItem('stableCastUser', user);
        location.reload();
    });
}
