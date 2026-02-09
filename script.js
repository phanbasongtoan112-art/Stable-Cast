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

// === STATE & VARS ===
let currentPrice = 0;
let predictedPriceGlobal = 0; 
let priceHistory = [];
let forecastHistory = [];
let timeLabels = [];
let chart; // Biến Chart toàn cục
let ws; 
let activeChatId = 'lume';

// Mặc định Friend List
let friendList = JSON.parse(localStorage.getItem('stableCastFriendList')) || [
    { id: 'lume', name: 'Lume (AI)', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=200&auto=format&fit=crop', status: 'Online' }
];

// Mặc định Feed Posts
let communityPosts = JSON.parse(localStorage.getItem('stableCastPosts')) || [
    { id: 101, name: "Alice Crypto", avatar: "https://i.pravatar.cc/150?img=5", time: "2h ago", text: "BTC holding $68k support. Long here? 🚀", image: null, likes: 12, comments: [] },
    { id: 102, name: "Bob Miner", avatar: "https://i.pravatar.cc/150?img=11", time: "4h ago", text: "Difficulty adjustment is brutal this week.", image: null, likes: 5, comments: [] }
];

// === 0. AUTO-LOGIN ===
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('stableCastUser');
    if (savedUser) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.querySelector('.main-app-container').style.display = 'block';
        setTimeout(() => { document.querySelector('.main-app-container').style.opacity = '1'; }, 50);
        
        loadProfileData();
        renderFeed();
        renderFriendList();
        startTimeTracking();
        
        // QUAN TRỌNG: Khởi tạo Chart
        setTimeout(initSystem, 500); 
    }
});

// Helper
function checkEmpty(val) { return (!val || val.trim() === "") ? "None" : val; }

function loadProfileData() {
    const data = {
        name: localStorage.getItem('stableCastUser'),
        email: localStorage.getItem('stableCastEmail'),
        avatar: localStorage.getItem('stableCastAvatar'),
        role: localStorage.getItem('stableCastRole'),
        id: localStorage.getItem('stableCastID') || "DE200247",
        org: localStorage.getItem('stableCastOrg') || "FPT University",
        friends: friendList.length
    };
    updateProfileInfo(data);
}

// === 1. NAV & VIEW SWITCHING (Có Fix Chart) ===
const btnTerminal = document.getElementById('btn-terminal');
const btnCommunity = document.getElementById('btn-community');
const btnProfile = document.getElementById('btn-profile');
const views = {
    dashboard: document.getElementById('dashboard-view'),
    community: document.getElementById('community-view'),
    profile: document.getElementById('profile-view')
};

function switchView(viewName) {
    // Reset Buttons
    btnTerminal.classList.remove('active');
    btnCommunity.classList.remove('active');
    btnProfile.classList.remove('active');
    
    // Hide Views
    Object.values(views).forEach(v => v.style.display = 'none');
    
    // Show View
    if(viewName === 'dashboard') {
        btnTerminal.classList.add('active');
        views.dashboard.style.display = 'block';
        // Resize chart khi hiện lại
        if(chart) chart.resize(); 
    } else if(viewName === 'community') {
        btnCommunity.classList.add('active');
        views.community.style.display = 'block';
    } else {
        btnProfile.classList.add('active');
        views.profile.style.display = 'block';
    }
}

btnTerminal.addEventListener('click', () => switchView('dashboard'));
btnCommunity.addEventListener('click', () => switchView('community'));
btnProfile.addEventListener('click', () => switchView('profile'));

// === 2. COMMUNITY FEED (Like, Comment, Connect) ===
function renderFeed() {
    const feedStream = document.getElementById('feedStream');
    feedStream.innerHTML = "";
    
    communityPosts.forEach(post => {
        const div = document.createElement('div');
        div.className = "feed-post";
        
        // Check connection
        const isFriend = friendList.some(f => f.id == post.id);
        const connectHtml = isFriend 
            ? `<span style="color:#0ecb81; font-size:0.8rem; margin-left:10px;"><i class="fas fa-check"></i> Friend</span>`
            : `<button class="connect-btn" onclick="window.connectUser(${post.id})">Connect</button>`;

        // Image in post
        const imgHtml = post.image ? `<img src="${post.image}" class="post-image">` : '';

        // Comments HTML
        let commentsHtml = '';
        if(post.comments && post.comments.length > 0) {
            commentsHtml = `<div style="margin-top:10px; padding-top:10px; border-top:1px dashed #333;">
                ${post.comments.map(c => `<div style="font-size:0.8rem; color:#888; margin-bottom:5px;"><b>${c.user}:</b> ${c.text}</div>`).join('')}
            </div>`;
        }

        div.innerHTML = `
            <img src="${post.avatar}" class="post-avatar">
            <div class="post-content">
                <div class="post-header">
                    <div><span class="post-user">${post.name}</span> ${connectHtml}</div>
                    <span class="post-handle" style="font-size:0.8rem; color:#666;">${post.time}</span>
                </div>
                <div class="post-text">${post.text}</div>
                ${imgHtml}
                <div class="post-actions">
                    <span class="action-item" onclick="window.likePost(${post.id})"><i class="far fa-heart"></i> ${post.likes}</span>
                    <span class="action-item" onclick="window.toggleComment(${post.id})"><i class="far fa-comment"></i> Comment</span>
                </div>
                
                <div id="comment-box-${post.id}" style="display:none; margin-top:10px;">
                    <input type="text" id="input-comment-${post.id}" placeholder="Write a comment..." style="background:#000; border:1px solid #333; color:#fff; padding:5px; width:70%;">
                    <button onclick="window.submitComment(${post.id})" style="background:#3b82f6; color:#fff; border:none; padding:5px 10px; cursor:pointer;">Send</button>
                </div>
                ${commentsHtml}
            </div>`;
        feedStream.prepend(div);
    });
}

// Window functions for HTML onClick
window.likePost = (id) => {
    const p = communityPosts.find(x => x.id === id);
    if(p) { p.likes++; savePosts(); renderFeed(); }
}

window.toggleComment = (id) => {
    const box = document.getElementById(`comment-box-${id}`);
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

window.submitComment = (id) => {
    const input = document.getElementById(`input-comment-${id}`);
    const text = input.value.trim();
    if(text) {
        const p = communityPosts.find(x => x.id === id);
        if(!p.comments) p.comments = [];
        p.comments.push({ user: document.getElementById('profile-name-txt').innerText, text: text });
        savePosts();
        renderFeed();
    }
}

window.connectUser = (id) => {
    const p = communityPosts.find(x => x.id === id);
    if(p) {
        friendList.push({ id: p.id, name: p.name, avatar: p.avatar, status: 'Online' });
        localStorage.setItem('stableCastFriendList', JSON.stringify(friendList));
        renderFeed();
        renderFriendList();
        updateProfileInfo({friends: friendList.length}); // Update count
        alert(`You are now friends with ${p.name}`);
    }
}

function savePosts() { localStorage.setItem('stableCastPosts', JSON.stringify(communityPosts)); }

// Post Logic (Image + Sticker)
window.handleMediaSelect = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('previewImg').src = e.target.result;
            document.getElementById('mediaPreview').style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}
window.clearMedia = () => {
    document.getElementById('mediaInput').value = "";
    document.getElementById('mediaPreview').style.display = 'none';
    document.getElementById('previewImg').src = "";
}
window.addSticker = (s) => { document.getElementById('postInput').value += s; }

document.getElementById('submitPostBtn').addEventListener('click', () => {
    const text = document.getElementById('postInput').value.trim();
    const imgSrc = document.getElementById('previewImg').src;
    const hasImg = document.getElementById('mediaPreview').style.display === 'block';
    
    if(text || hasImg) {
        const name = document.getElementById('profile-name-txt').innerText;
        const newPost = {
            id: Date.now(),
            name: name,
            avatar: document.getElementById('profile-avatar-img').src,
            time: "Just now",
            text: text,
            image: hasImg ? imgSrc : null,
            likes: 0,
            comments: []
        };
        communityPosts.push(newPost);
        savePosts();
        document.getElementById('postInput').value = "";
        clearMedia();
        renderFeed();
    }
});

// === 3. CHAT SYSTEM (Zalo Style) ===
const chatOverlay = document.getElementById('chatSystemOverlay');
document.getElementById('openChatBtn').addEventListener('click', () => chatOverlay.style.display = 'flex');
document.getElementById('closeChatBtn').addEventListener('click', () => chatOverlay.style.display = 'none');

function renderFriendList() {
    const list = document.getElementById('friendListContainer');
    list.innerHTML = "";
    friendList.forEach(f => {
        const div = document.createElement('div');
        div.className = `friend-item ${activeChatId == f.id ? 'active' : ''}`;
        div.onclick = () => openChat(f.id);
        div.innerHTML = `
            <img src="${f.avatar}" class="friend-avatar">
            <div class="friend-info"><h4>${f.name}</h4><p>${f.status}</p></div>
        `;
        list.appendChild(div);
    });
}

function openChat(id) {
    activeChatId = id;
    renderFriendList();
    const f = friendList.find(x => x.id == id);
    document.getElementById('currentChatUser').innerHTML = `<i class="fas fa-user"></i> ${f.name}`;
    document.getElementById('chatContainer').innerHTML = ""; // Clear old
    
    if(id === 'lume') addMessage("Hello! Ask me about the market.", 'msg-in');
    else addMessage(`This is the start of your conversation with ${f.name}.`, 'msg-in');
}

function addMessage(text, type) {
    const box = document.getElementById('chatContainer');
    const div = document.createElement('div');
    div.className = `msg msg-${type}`;
    div.innerText = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

document.getElementById('sendMsgBtn').addEventListener('click', () => {
    const input = document.getElementById('msgInput');
    const text = input.value.trim();
    if(text) {
        addMessage(text, 'out');
        input.value = "";
        
        if(activeChatId === 'lume') {
            setTimeout(() => {
                const reply = `BTC Price: $${currentPrice.toFixed(2)}. Trend is looking volatile.`;
                addMessage(reply, 'msg-in');
            }, 1000);
        }
    }
});

// === 4. AUTH & CHART & PROFILE EDIT (Giữ nguyên logic cũ) ===
// (Logic login, edit profile, chart initSystem tương tự bài trước)
// Chỉ cần đảm bảo initSystem được gọi.

function initSystem() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Price', data: priceHistory, borderColor: '#0ecb81', borderWidth: 2, tension: 0.2, pointRadius: 0
            }, {
                label: 'AI Forecast', data: forecastHistory, borderColor: '#3b82f6', borderWidth: 2, borderDash: [5,5], tension: 0.4, pointRadius: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, animation: false }
    });

    ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
    ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        const price = parseFloat(data.p);
        currentPrice = price;
        document.getElementById('btcPrice').innerText = `$${price.toFixed(2)}`;
        
        // Push Data
        const t = new Date().toLocaleTimeString();
        if(timeLabels.length > 50) { timeLabels.shift(); priceHistory.shift(); forecastHistory.shift(); }
        timeLabels.push(t);
        priceHistory.push(price);
        
        // Mock Forecast
        predictedPriceGlobal = price + (Math.random()*20 - 5);
        forecastHistory.push(predictedPriceGlobal);
        document.getElementById('predPrice').innerText = `$${predictedPriceGlobal.toFixed(2)}`;
        
        if(chart) chart.update();
    };
}

// Logic Edit Profile + Save (Giống cũ)
const editBtn = document.getElementById('editProfileBtn');
if(editBtn) editBtn.addEventListener('click', () => document.getElementById('editProfileModal').style.display = 'flex');
document.getElementById('closeEditModal').addEventListener('click', () => document.getElementById('editProfileModal').style.display = 'none');

document.getElementById('saveProfileBtn').addEventListener('click', () => {
    // Logic save...
    const name = document.getElementById('editNameInput').value;
    if(name) {
        localStorage.setItem('stableCastUser', name);
        document.getElementById('profile-name-txt').innerText = name;
    }
    // Handle Avatar File
    const fileInp = document.getElementById('editAvatarInput');
    if(fileInp.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            localStorage.setItem('stableCastAvatar', e.target.result);
            document.getElementById('profile-avatar-img').src = e.target.result;
        };
        reader.readAsDataURL(fileInp.files[0]);
    }
    document.getElementById('editProfileModal').style.display = 'none';
});

// Login Button
document.getElementById('mainAuthBtn').addEventListener('click', () => {
    const u = document.getElementById('email').value || "Operator";
    localStorage.setItem('stableCastUser', u);
    location.reload();
});

function updateProfileInfo(data) {
    if(data.name) document.getElementById('profile-name-txt').innerText = data.name;
    if(data.avatar) document.getElementById('profile-avatar-img').src = data.avatar;
    if(data.friends) document.getElementById('stat-friends').innerText = data.friends;
}

// Time Tracking
let totalMinutes = parseInt(localStorage.getItem('stableCastTotalMinutes')) || 0;
function startTimeTracking() {
    document.getElementById('stat-hours').innerText = `${Math.floor(totalMinutes/60)}h ${totalMinutes%60}m`;
    setInterval(() => {
        totalMinutes++;
        localStorage.setItem('stableCastTotalMinutes', totalMinutes);
        document.getElementById('stat-hours').innerText = `${Math.floor(totalMinutes/60)}h ${totalMinutes%60}m`;
    }, 60000);
}
