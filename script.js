import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// === CẤU HÌNH FIREBASE (Dùng tạm config demo, bạn thay key của bạn vào nếu cần) ===
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

// === BIẾN HỆ THỐNG ===
let currentPrice = 68000; // Giá khởi điểm giả lập
let predictedPriceGlobal = 0; 
let priceHistory = [];
let forecastHistory = [];
let timeLabels = [];
let chart; 
let activeChatId = 'lume';

// === DỮ LIỆU CỘNG ĐỒNG & BẠN BÈ (Lưu trong LocalStorage) ===
let friendList = JSON.parse(localStorage.getItem('stableCastFriendList')) || [
    { id: 'lume', name: 'Lume (AI)', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=200&auto=format&fit=crop', status: 'Online' }
];

let communityPosts = JSON.parse(localStorage.getItem('stableCastPosts')) || [
    { id: 101, name: "Alice Crypto", handle: "@alice_btc", avatar: "https://i.pravatar.cc/150?img=5", time: "2h ago", text: "BTC holding support at $68k. Long here? 🚀", image: null, likes: 12, comments: [] },
    { id: 102, name: "Bob Miner", handle: "@miner_bob", avatar: "https://i.pravatar.cc/150?img=11", time: "4h ago", text: "Difficulty adjustment is brutal this week.", image: null, likes: 5, comments: [] }
];

// ============================================================
// 1. KHỞI ĐỘNG HỆ THỐNG (AUTO-LOGIN & CHART INIT)
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('stableCastUser');
    
    // Nếu đã đăng nhập -> Vào thẳng Dashboard
    if (savedUser) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.querySelector('.main-app-container').style.display = 'block';
        
        // Hiệu ứng Fade In
        setTimeout(() => { document.querySelector('.main-app-container').style.opacity = '1'; }, 50);
        
        // Load dữ liệu Profile
        loadProfileData();
        
        // Render dữ liệu Cộng đồng & Bạn bè
        renderFeed();
        renderFriendList();
        startTimeTracking();
        
        // QUAN TRỌNG: Khởi tạo biểu đồ ngay lập tức
        setTimeout(() => {
            initChartSystem(); 
        }, 100);
    }
});

// Hàm Load thông tin Profile
function loadProfileData() {
    const name = localStorage.getItem('stableCastUser');
    const avatar = localStorage.getItem('stableCastAvatar');
    const friends = friendList.length;

    if(name) document.getElementById('profile-name-txt').innerText = name;
    if(avatar) {
        document.getElementById('profile-avatar-img').src = avatar;
        document.getElementById('headerAvatar').src = avatar;
        document.getElementById('feedAvatar').src = avatar; // Avatar ở khung post
    }
    document.getElementById('stat-friends').innerText = friends;
}

// ============================================================
// 2. HỆ THỐNG BIỂU ĐỒ (FIX LỖI KHÔNG CHẠY)
// ============================================================
function initChartSystem() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    // Tạo dữ liệu mồi để biểu đồ hiện ngay
    for(let i=0; i<30; i++) {
        timeLabels.push("");
        priceHistory.push(null); // Để trống ban đầu
        forecastHistory.push(null);
    }

    // Khởi tạo Chart.js
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Price', 
                data: priceHistory, 
                borderColor: '#0ecb81', 
                backgroundColor: 'rgba(14, 203, 129, 0.05)', 
                borderWidth: 2, 
                tension: 0.3, 
                pointRadius: 0,
                fill: true
            }, {
                label: 'AI Forecast', 
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
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: true, labels: { color: '#848e9c' } } },
            scales: { 
                x: { display: false }, 
                y: { position: 'right', grid: { color: '#2b3139' }, ticks: { color: '#848e9c' } } 
            },
            animation: false // Tắt animation để mượt hơn
        }
    });

    // Bắt đầu vòng lặp giả lập dữ liệu (Chạy vĩnh viễn)
    startDataSimulation();
}

function startDataSimulation() {
    setInterval(() => {
        // Tạo biến động giá ngẫu nhiên (-20 đến +20)
        const volatility = (Math.random() - 0.5) * 40;
        currentPrice += volatility;
        
        // Cập nhật giá hiển thị
        const priceEl = document.getElementById('btcPrice');
        priceEl.innerText = `$${currentPrice.toFixed(2)}`;
        priceEl.style.color = volatility >= 0 ? '#0ecb81' : '#f6465d';

        // Tạo dự đoán AI (Giả lập)
        const aiPred = currentPrice + (Math.random() - 0.5) * 100;
        predictedPriceGlobal = aiPred;
        document.getElementById('predPrice').innerText = `$${aiPred.toFixed(2)}`;
        
        // Cập nhật Stoploss / Take Profit
        document.getElementById('stopLoss').innerText = `$${(currentPrice - 150).toFixed(2)}`;
        document.getElementById('takeProfit').innerText = `$${(currentPrice + 300).toFixed(2)}`;

        // Cập nhật mảng dữ liệu cho Chart
        priceHistory.push(currentPrice);
        forecastHistory.push(aiPred);
        timeLabels.push(new Date().toLocaleTimeString());

        // Giữ lại 50 điểm dữ liệu thôi cho nhẹ
        if(priceHistory.length > 50) {
            priceHistory.shift();
            forecastHistory.shift();
            timeLabels.shift();
        }

        // Vẽ lại Chart
        chart.update();

        // Ghi Log ngẫu nhiên
        if(Math.random() > 0.8) {
            const logBox = document.getElementById('terminalLogs');
            const div = document.createElement('div');
            div.className = 'log-entry';
            div.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString()}]</span> New tick received: ${currentPrice.toFixed(1)}`;
            logBox.appendChild(div);
            logBox.scrollTop = logBox.scrollHeight;
        }

    }, 1000); // Cập nhật mỗi 1 giây
}

// ============================================================
// 3. ĐIỀU HƯỚNG TAB (NAV)
// ============================================================
const btns = {
    dashboard: document.getElementById('btn-terminal'),
    community: document.getElementById('btn-community'),
    profile: document.getElementById('btn-profile')
};
const views = {
    dashboard: document.getElementById('dashboard-view'),
    community: document.getElementById('community-view'),
    profile: document.getElementById('profile-view')
};

function switchView(viewName) {
    // Reset active class
    Object.values(btns).forEach(b => b.classList.remove('active'));
    Object.values(views).forEach(v => v.style.display = 'none');
    
    // Set active
    btns[viewName].classList.add('active');
    views[viewName].style.display = 'block';

    // Nếu quay lại Terminal, resize chart để tránh lỗi hiển thị
    if(viewName === 'dashboard' && chart) {
        chart.resize();
    }
}

btns.dashboard.addEventListener('click', () => switchView('dashboard'));
btns.community.addEventListener('click', () => switchView('community'));
btns.profile.addEventListener('click', () => switchView('profile'));

// ============================================================
// 4. COMMUNITY FEED (X Style + Kết bạn)
// ============================================================
function renderFeed() {
    const stream = document.getElementById('feedStream');
    stream.innerHTML = "";
    
    communityPosts.forEach(post => {
        const div = document.createElement('div');
        div.className = "feed-post";
        
        // Kiểm tra xem đã là bạn bè chưa để hiện nút Connect/Friend
        const isFriend = friendList.some(f => f.id == post.id);
        const connectHtml = isFriend 
            ? `<span style="color:#0ecb81; font-size:0.75rem; border:1px solid #0ecb81; padding:2px 8px; border-radius:10px; margin-left:10px;">Friend</span>` 
            : `<button class="connect-btn" onclick="window.connectUser(${post.id})">Connect</button>`;

        div.innerHTML = `
            <img src="${post.avatar}" class="post-avatar">
            <div class="post-content">
                <div class="post-header">
                    <div style="display:flex; align-items:center;">
                        <span class="post-user">${post.name}</span>
                        <span class="post-handle">${post.handle}</span>
                        ${connectHtml}
                    </div>
                    <span class="post-time">${post.time}</span>
                </div>
                <div class="post-text">${post.text}</div>
                <div class="post-actions">
                    <span class="action-item"><i class="far fa-heart"></i> ${post.likes}</span>
                    <span class="action-item"><i class="far fa-comment"></i> Comment</span>
                    <span class="action-item"><i class="fas fa-share"></i> Share</span>
                </div>
            </div>`;
        stream.prepend(div);
    });
}

// Logic Đăng bài
const submitPostBtn = document.getElementById('submitPostBtn');
if(submitPostBtn) {
    submitPostBtn.addEventListener('click', () => {
        const txt = document.getElementById('postInput').value.trim();
        if(txt) {
            const name = document.getElementById('profile-name-txt').innerText;
            const newPost = {
                id: Date.now(),
                name: name,
                handle: "@operator",
                avatar: document.getElementById('profile-avatar-img').src,
                time: "Just now",
                text: txt,
                likes: 0,
                connected: true
            };
            communityPosts.push(newPost);
            localStorage.setItem('stableCastPosts', JSON.stringify(communityPosts));
            document.getElementById('postInput').value = "";
            renderFeed();
        }
    });
}

// Logic Kết bạn (Global function để HTML gọi được)
window.connectUser = function(postId) {
    const post = communityPosts.find(p => p.id === postId);
    if(post) {
        friendList.push({ id: post.id, name: post.name, avatar: post.avatar, status: 'Online' });
        localStorage.setItem('stableCastFriendList', JSON.stringify(friendList));
        
        renderFeed();
        renderFriendList(); // Cập nhật bên Chat
        alert(`You are now friends with ${post.name}`);
        
        // Cập nhật số liệu Profile
        document.getElementById('stat-friends').innerText = friendList.length;
    }
}

// ============================================================
// 5. CHAT SYSTEM (Zalo Style)
// ============================================================
const chatOverlay = document.getElementById('chatSystemOverlay');
document.getElementById('openChatBtn').addEventListener('click', () => chatOverlay.style.display = 'flex');
document.getElementById('closeChatBtn').addEventListener('click', () => chatOverlay.style.display = 'none');

function renderFriendList() {
    const container = document.getElementById('friendListContainer');
    container.innerHTML = "";
    
    friendList.forEach(f => {
        const div = document.createElement('div');
        div.className = `friend-item ${activeChatId == f.id ? 'active' : ''}`;
        div.onclick = () => loadChat(f.id);
        
        div.innerHTML = `
            <img src="${f.avatar}" class="friend-avatar">
            <div class="friend-info">
                <h4>${f.name}</h4>
                <p>${f.status}</p>
            </div>
            <div class="status-online"></div>
        `;
        container.appendChild(div);
    });
}

function loadChat(id) {
    activeChatId = id;
    renderFriendList(); // Refresh active class
    
    const friend = friendList.find(f => f.id == id);
    document.getElementById('chatHeaderName').innerText = friend.name;
    document.getElementById('chatContainer').innerHTML = ""; // Xóa chat cũ
    
    // Tin nhắn chào mừng
    addMsg("System", `Start chatting with ${friend.name}`, "in");
}

function addMsg(sender, text, type) {
    const div = document.createElement('div');
    div.className = `message msg-${type}`;
    div.innerText = text;
    const box = document.getElementById('chatContainer');
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

document.getElementById('sendMsgBtn').addEventListener('click', () => {
    const input = document.getElementById('msgInput');
    const text = input.value.trim();
    if(text) {
        addMsg("Me", text, "out");
        input.value = "";
        
        // Lume AI trả lời
        if(activeChatId === 'lume') {
            setTimeout(() => {
                addMsg("Lume", `Analysis: BTC Price is $${currentPrice.toFixed(2)}. Trend is Volatile.`, "in");
            }, 1000);
        }
    }
});

// ============================================================
// 6. LOGIN LOGIC (Đơn giản hóa)
// ============================================================
document.getElementById('mainAuthBtn').addEventListener('click', () => {
    const user = document.getElementById('email').value || "Operator";
    localStorage.setItem('stableCastUser', user);
    location.reload();
});

// ============================================================
// 7. TIME TRACKING (Real-time)
// ============================================================
function startTimeTracking() {
    let minutes = parseInt(localStorage.getItem('stableCastTotalMinutes')) || 0;
    
    const updateDisplay = () => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        document.getElementById('stat-hours').innerText = `${h}h ${m}m`;
    };
    
    updateDisplay();
    setInterval(() => {
        minutes++;
        localStorage.setItem('stableCastTotalMinutes', minutes);
        updateDisplay();
    }, 60000);
}

// Logic Edit Profile (Giữ nguyên UI)
const editModal = document.getElementById('editProfileModal');
document.getElementById('editProfileBtn').addEventListener('click', () => editModal.style.display = 'flex');
document.getElementById('closeEditModal').addEventListener('click', () => editModal.style.display = 'none');

document.getElementById('saveProfileBtn').addEventListener('click', () => {
    const name = document.getElementById('editNameInput').value;
    if(name) {
        localStorage.setItem('stableCastUser', name);
        document.getElementById('profile-name-txt').innerText = name;
    }
    // Handle File Avatar
    const file = document.getElementById('editAvatarInput').files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            localStorage.setItem('stableCastAvatar', e.target.result);
            document.getElementById('profile-avatar-img').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    editModal.style.display = 'none';
});
