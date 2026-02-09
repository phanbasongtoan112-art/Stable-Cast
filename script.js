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

// System Vars
let currentPrice = 0;
let predictedPriceGlobal = 0; 
let priceHistory = [];
let forecastHistory = [];
let timeLabels = [];
let chart; 
let ws; 
let aiInterval; 

// DATA: DANH SÁCH BÀI VIẾT (Mặc định nếu chưa có)
const defaultPosts = [
    { id: 101, name: "Alice Crypto", handle: "@alice_btc", avatar: "https://i.pravatar.cc/150?img=5", time: "2h ago", text: "BTC holding support at $68k. Good time to accumulate? #Bitcoin", connected: false },
    { id: 102, name: "Bob Miner", handle: "@miner_bob", avatar: "https://i.pravatar.cc/150?img=11", time: "4h ago", text: "Hashrate spiking. Difficulty adjustment incoming.", connected: false },
    { id: 103, name: "Elon M.", handle: "@technoking", avatar: "https://i.pravatar.cc/150?img=12", time: "5h ago", text: "To the moon! 🚀", connected: false }
];

// DATA: DANH SÁCH BẠN BÈ (Mặc định có Lume)
const defaultFriends = [
    { id: 'lume', name: 'Lume (AI)', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=200&auto=format&fit=crop', status: 'Online', messages: [] }
];

// Load from LocalStorage
let communityPosts = JSON.parse(localStorage.getItem('stableCastPosts')) || defaultPosts;
let friendList = JSON.parse(localStorage.getItem('stableCastFriendList')) || defaultFriends;
let activeChatId = null;

// ============================================================
// 0. INIT & AUTO-LOGIN
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('stableCastUser');
    if (savedUser) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.querySelector('.main-app-container').style.display = 'block';
        setTimeout(() => { document.querySelector('.main-app-container').style.opacity = '1'; }, 50);
        
        loadProfileData();
        startTimeTracking();
        renderFeed();
        renderFriendList(); // Render Chat Sidebar
        setTimeout(() => { initSystem(); }, 500);
    }
});

function checkEmpty(val) { return (!val || val.trim() === "") ? "None" : val; }

function loadProfileData() {
    const data = {
        name: localStorage.getItem('stableCastUser'),
        email: localStorage.getItem('stableCastEmail'),
        avatar: localStorage.getItem('stableCastAvatar'),
        role: localStorage.getItem('stableCastRole'),
        id: localStorage.getItem('stableCastID') || "DE200247",
        org: localStorage.getItem('stableCastOrg') || "FPT University",
        loc: localStorage.getItem('stableCastLoc') || "Da Nang, Vietnam",
        desc: localStorage.getItem('stableCastDesc') || "StableCast Trader...",
        friends: friendList.length // Số bạn bè thật
    };
    updateProfileInfo(data);
}

// ============================================================
// 1. NAV & VIEWS
// ============================================================
const views = {
    dashboard: document.getElementById('dashboard-view'),
    community: document.getElementById('community-view'),
    profile: document.getElementById('profile-view')
};
const btns = {
    dashboard: document.getElementById('btn-terminal'),
    community: document.getElementById('btn-community'),
    profile: document.getElementById('btn-profile')
};

function switchView(viewName) {
    Object.values(btns).forEach(b => b.classList.remove('active'));
    Object.values(views).forEach(v => v.style.display = 'none');
    
    btns[viewName].classList.add('active');
    views[viewName].style.display = 'block';
}

btns.dashboard.addEventListener('click', () => switchView('dashboard'));
btns.community.addEventListener('click', () => switchView('community'));
btns.profile.addEventListener('click', () => switchView('profile'));

// ============================================================
// 2. COMMUNITY FEED & CONNECT LOGIC
// ============================================================
function renderFeed() {
    const feedStream = document.getElementById('feedStream');
    feedStream.innerHTML = "";
    
    communityPosts.forEach(post => {
        const postEl = document.createElement('div');
        postEl.className = "feed-post";
        
        // Kiểm tra xem đã là bạn bè chưa
        const isFriend = friendList.some(f => f.id == post.id);
        const connectBtnHtml = isFriend 
            ? `<span class="friend-badge"><i class="fas fa-check"></i> Friend</span>` 
            : `<button class="connect-btn" onclick="window.connectUser(${post.id})"><i class="fas fa-user-plus"></i> Connect</button>`;

        postEl.innerHTML = `
            <img src="${post.avatar}" class="post-avatar">
            <div class="post-content">
                <div class="post-header">
                    <div class="post-info"><span class="post-name">${post.name}</span><span class="post-handle">${post.handle}</span>${connectBtnHtml}</div>
                    <span class="post-time">${post.time}</span>
                </div>
                <div class="post-text">${post.text}</div>
                <div class="post-actions">
                    <span class="action-item"><i class="far fa-heart"></i> Like</span>
                    <span class="action-item"><i class="far fa-comment"></i> Reply</span>
                    <span class="action-item"><i class="fas fa-share"></i> Share</span>
                </div>
            </div>`;
        feedStream.prepend(postEl);
    });
}

// Logic Kết Bạn
window.connectUser = function(postId) {
    const post = communityPosts.find(p => p.id === postId);
    if (post) {
        // Thêm vào danh sách bạn bè
        const newFriend = {
            id: post.id,
            name: post.name,
            avatar: post.avatar,
            status: 'Offline',
            messages: []
        };
        
        friendList.push(newFriend);
        localStorage.setItem('stableCastFriendList', JSON.stringify(friendList));
        
        // Cập nhật giao diện
        renderFeed();
        renderFriendList(); // Cập nhật bên Chat Sidebar
        document.getElementById('stat-friends').innerText = friendList.length;
        
        alert(`You are now connected with ${post.name}!`);
    }
}

// Đăng bài mới
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
                connected: true // Bạn là bạn của chính mình
            };
            communityPosts.push(newPost);
            localStorage.setItem('stableCastPosts', JSON.stringify(communityPosts));
            input.value = "";
            renderFeed();
        }
    });
}

// ============================================================
// 3. CHAT SYSTEM (2 COLUMNS)
// ============================================================
const openChatBtn = document.getElementById('openChatBtn');
const chatOverlay = document.getElementById('chatSystemOverlay');
const closeChatBtn = document.getElementById('closeChatBtn');
const friendListContainer = document.getElementById('friendListContainer');
const chatContainer = document.getElementById('chatContainer');
const sendMsgBtn = document.getElementById('sendMsgBtn');
const msgInput = document.getElementById('msgInput');

if(openChatBtn) openChatBtn.addEventListener('click', () => chatOverlay.style.display = 'flex');
if(closeChatBtn) closeChatBtn.addEventListener('click', () => chatOverlay.style.display = 'none');

// Render Sidebar List
function renderFriendList() {
    friendListContainer.innerHTML = "";
    friendList.forEach(friend => {
        const div = document.createElement('div');
        div.className = `friend-item ${activeChatId == friend.id ? 'active' : ''}`;
        div.onclick = () => openChatWith(friend.id);
        
        div.innerHTML = `
            <img src="${friend.avatar}" class="friend-avatar">
            <div class="friend-info">
                <h4>${friend.name}</h4>
                <p>${friend.id === 'lume' ? 'AI Assistant' : 'Trader'}</p>
            </div>
            ${friend.id === 'lume' ? '<div class="status-online"></div>' : ''}
        `;
        friendListContainer.appendChild(div);
    });
}

function openChatWith(id) {
    activeChatId = id;
    renderFriendList(); // Refresh active class
    
    const friend = friendList.find(f => f.id == id);
    const chatTitle = document.getElementById('currentChatUser');
    chatTitle.innerHTML = `<img src="${friend.avatar}" style="width:30px; height:30px; border-radius:50%;"> ${friend.name}`;
    
    // Clear & Load Messages (Mock)
    chatContainer.innerHTML = "";
    
    if(friend.id === 'lume') {
        addMessage("Hello! I am Lume. I can analyze the market for you.", 'msg-in');
    } else {
        addMessage(`You are now connected with ${friend.name}. Say hi!`, 'msg-in');
    }
}

function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = `${text}<div class="msg-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Logic Gửi Tin & Lume Rep
if(sendMsgBtn) {
    const handleSend = () => {
        if(!activeChatId) { alert("Select a friend first!"); return; }
        const text = msgInput.value.trim();
        if(text) {
            addMessage(text, 'msg-out');
            msgInput.value = '';
            
            // Nếu chat với Lume -> AI trả lời
            if(activeChatId === 'lume') {
                setTimeout(() => {
                    const reply = generateLumeResponse(text);
                    addMessage(reply, 'msg-in');
                }, 1000);
            } 
            // Nếu chat với người khác -> Giả lập "Đã xem" (Hoặc trả lời random nếu thích)
        }
    };
    sendMsgBtn.addEventListener('click', handleSend);
    msgInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleSend(); });
}

// Lume Logic (Giữ nguyên trí thông minh)
function generateLumeResponse(input) {
    const text = input.toLowerCase();
    if (text.match(/price/)) return `BTC is currently at <b>$${currentPrice.toFixed(2)}</b>.`;
    if (text.match(/hello/)) return "Hello Operator! Ready to trade?";
    return "I'm analyzing the market. Ask me about the price or trends.";
}

// ============================================================
// 4. REAL-TIME TIME TRACKING & EDIT PROFILE
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
    if(el) el.innerText = minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

// Edit Profile & Save Logic (Tương tự cũ nhưng thêm checkEmpty)
const editProfileBtn = document.getElementById('editProfileBtn');
const editProfileModal = document.getElementById('editProfileModal');
const closeEditModal = document.getElementById('closeEditModal');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const editAvatarInput = document.getElementById('editAvatarInput');

if(editProfileBtn) editProfileBtn.addEventListener('click', () => {
    editProfileModal.style.display = 'flex';
    // Load current values...
    document.getElementById('editNameInput').value = document.getElementById('profile-name-txt').innerText;
});
if(closeEditModal) closeEditModal.addEventListener('click', () => editProfileModal.style.display = 'none');

if(saveProfileBtn) saveProfileBtn.addEventListener('click', () => {
    const data = {
        name: checkEmpty(document.getElementById('editNameInput').value),
        role: checkEmpty(document.getElementById('editRoleInput').value),
        id: checkEmpty(document.getElementById('editIDInput').value),
        email: checkEmpty(document.getElementById('editEmailInput').value),
        org: checkEmpty(document.getElementById('editOrgInput').value),
        loc: checkEmpty(document.getElementById('editLocInput').value),
        desc: checkEmpty(document.getElementById('editDescInput').value),
        avatar: null
    };
    
    if (editAvatarInput.files && editAvatarInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            data.avatar = e.target.result;
            saveAndUpdate(data);
        }
        reader.readAsDataURL(editAvatarInput.files[0]);
    } else {
        data.avatar = document.getElementById('profile-avatar-img').src;
        saveAndUpdate(data);
    }
});

function saveAndUpdate(data) {
    updateProfileInfo(data);
    localStorage.setItem('stableCastUser', data.name);
    // ... Save other fields ...
    if(data.avatar) localStorage.setItem('stableCastAvatar', data.avatar);
    editProfileModal.style.display = 'none';
}

function updateProfileInfo(data) {
    if(data.name) document.getElementById('profile-name-txt').innerText = data.name;
    // ... Update others ...
    if(data.avatar) document.getElementById('profile-avatar-img').src = data.avatar;
    document.getElementById('stat-friends').innerText = friendList.length; // Real count
}

// ============================================================
// 5. LOGIN & CHART (Giữ nguyên)
// ============================================================
// (Login logic & Chart logic giữ nguyên như bài trước)
const mainBtn = document.getElementById('mainAuthBtn');
if(mainBtn) {
    mainBtn.addEventListener('click', () => {
        // ... Login Code ...
        const user = document.getElementById('email').value || "Guest";
        localStorage.setItem('stableCastUser', user);
        location.reload();
    });
}

function initSystem() {
    // ... Chart Code ...
    const ctx = document.getElementById('mainChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Price', data: priceHistory, borderColor: '#0ecb81'
            }]
        }
    });
    
    // Simulating WebSocket for Demo
    aiInterval = setInterval(() => {
        const price = 68000 + Math.random() * 100;
        currentPrice = price;
        document.getElementById('btcPrice').innerText = `$${price.toFixed(2)}`;
        // Update Chart...
    }, 2000);
}
