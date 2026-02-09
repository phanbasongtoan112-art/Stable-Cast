import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Dummy Init
const app = initializeApp({ apiKey: "AIzaSy..." });

// === GLOBAL STATE ===
const state = {
    user: JSON.parse(localStorage.getItem('sc_user')) || null,
    posts: JSON.parse(localStorage.getItem('sc_posts')) || [
        { id: 1, name: 'Elon Musk', handle: '@elonmusk', avatar: 'https://i.pravatar.cc/150?img=12', text: 'StableCast is interesting.', time: '2h', likes: 1400, comments: [] },
        { id: 2, name: 'Lume (AI)', handle: '@lume_ai', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=100', text: 'Market analysis: Bullish divergence detected.', time: '4h', likes: 56, comments: [] }
    ],
    friends: JSON.parse(localStorage.getItem('sc_friends')) || [],
    suggestions: [
        { id: 101, name: 'Vitalik B.', handle: '@vitalik', avatar: 'https://i.pravatar.cc/150?img=60' },
        { id: 102, name: 'Satoshi N.', handle: '@satoshi', avatar: 'https://i.pravatar.cc/150?img=33' }
    ],
    onlineMinutes: parseInt(localStorage.getItem('sc_time')) || 0,
    currentPrice: 68000,
    activeChatId: null,
    chart: null
};

// === DOM ELEMENTS ===
const els = {
    loginScreen: document.getElementById('loginScreen'),
    mainApp: document.getElementById('mainApp'),
    views: {
        dashboard: document.getElementById('dashboard-view'),
        community: document.getElementById('community-view'),
        profile: document.getElementById('profile-view')
    },
    feedStream: document.getElementById('feedStream'),
    suggestionList: document.getElementById('suggestionList'),
    myFriendsList: document.getElementById('myFriendsList'),
    postInput: document.getElementById('postInput'),
    mediaPreview: document.getElementById('mediaPreview'),
    previewImg: document.getElementById('previewImg')
};

// === INIT ===
window.addEventListener('DOMContentLoaded', () => {
    if (state.user) unlockApp();
    
    // Timer Real-time
    setInterval(() => {
        state.onlineMinutes++;
        localStorage.setItem('sc_time', state.onlineMinutes);
        if(document.getElementById('statOnline')) 
            document.getElementById('statOnline').innerText = formatTime(state.onlineMinutes);
    }, 60000);
});

// === LOGIN ===
document.getElementById('btnAuth').addEventListener('click', () => {
    const id = document.getElementById('loginId').value || "Operator";
    const user = {
        name: id,
        handle: `@${id.toLowerCase().replace(/\s/g,'')}`,
        avatar: 'https://cdn-icons-png.flaticon.com/512/11498/11498793.png'
    };
    state.user = user;
    localStorage.setItem('sc_user', JSON.stringify(user));
    unlockApp();
});

function unlockApp() {
    els.loginScreen.style.display = 'none';
    els.mainApp.style.display = 'block';
    
    // Load UI
    renderProfile();
    renderFeed();
    renderSidebar();
    
    // QUAN TRỌNG: Khởi tạo Chart ngay
    setTimeout(initChartSystem, 200); 
}

// === CHART SYSTEM (FIX LỖI LOADING) ===
function initChartSystem() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    // Dữ liệu ban đầu
    const initialData = Array(30).fill(0).map(() => 68000 + Math.random() * 500);
    
    state.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(30).fill(''),
            datasets: [{
                label: 'Price',
                data: initialData,
                borderColor: '#0ecb81',
                backgroundColor: 'rgba(14, 203, 129, 0.05)',
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 0,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: { x: { display: false }, y: { position: 'right', grid: { color: '#2f3336' } } },
            plugins: { legend: { display: false } }
        }
    });

    // Vòng lặp cập nhật (Simulation Engine)
    setInterval(() => {
        // Tạo giá mới
        const volatility = (Math.random() - 0.5) * 50;
        state.currentPrice += volatility;
        
        // Update DOM
        document.getElementById('btcPrice').innerText = `$${state.currentPrice.toFixed(2)}`;
        document.getElementById('btcPrice').style.color = volatility >= 0 ? '#0ecb81' : '#f6465d';
        
        // AI Pred
        const pred = state.currentPrice + (Math.random() - 0.5) * 100;
        document.getElementById('predPrice').innerText = `$${pred.toFixed(2)}`;

        // Log Update (Giả lập Terminal chạy)
        if(Math.random() > 0.8) {
            const logBox = document.getElementById('terminalLogs');
            const div = document.createElement('div');
            div.className = 'log-entry';
            div.innerHTML = `<span style="color:#555">[${new Date().toLocaleTimeString()}]</span> New tick: ${state.currentPrice.toFixed(1)}`;
            logBox.appendChild(div);
            logBox.scrollTop = logBox.scrollHeight;
        }

        // Update Chart Data
        if(state.chart) {
            state.chart.data.datasets[0].data.shift();
            state.chart.data.datasets[0].data.push(state.currentPrice);
            state.chart.update();
        }
    }, 1000); // Cập nhật mỗi giây
}

// === NAV LOGIC ===
window.switchView = (viewName) => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
    
    if(viewName === 'dashboard') {
        document.getElementById('dashboard-view').style.display = 'block';
        // Resize chart khi quay lại
        if(state.chart) state.chart.resize();
    } else if (viewName === 'community') {
        document.getElementById('community-view').style.display = 'flex';
    } else {
        document.getElementById('profile-view').style.display = 'block';
    }
};

// === FEED LOGIC (LIKE, COMMENT, MEDIA) ===
window.handleMediaSelect = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('previewImg').src = e.target.result;
            document.getElementById('mediaPreview').style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.clearMedia = () => {
    document.getElementById('mediaInput').value = "";
    document.getElementById('mediaPreview').style.display = 'none';
};

window.toggleStickers = () => {
    const p = document.getElementById('stickerPopup');
    p.style.display = p.style.display === 'grid' ? 'none' : 'grid';
};

window.addSticker = (s) => {
    document.getElementById('postInput').value += s;
    document.getElementById('stickerPopup').style.display = 'none';
};

document.getElementById('btnPost').addEventListener('click', () => {
    const text = document.getElementById('postInput').value.trim();
    const imgSrc = document.getElementById('previewImg').src;
    const hasImg = document.getElementById('mediaPreview').style.display === 'block';

    if(!text && !hasImg) return;

    const newPost = {
        id: Date.now(),
        name: state.user.name,
        handle: state.user.handle,
        avatar: state.user.avatar,
        text: text,
        image: hasImg ? imgSrc : null,
        time: 'Just now',
        likes: 0,
        liked: false,
        comments: []
    };

    state.posts.unshift(newPost);
    localStorage.setItem('sc_posts', JSON.stringify(state.posts));
    
    // Reset
    document.getElementById('postInput').value = "";
    clearMedia();
    renderFeed();
});

function renderFeed() {
    els.feedStream.innerHTML = '';
    state.posts.forEach(post => {
        // Comments HTML
        let commentsHtml = '';
        post.comments.forEach(c => {
            commentsHtml += `
                <div class="comment-item">
                    <img src="${c.avatar}" style="width:24px;height:24px;border-radius:50%;">
                    <div class="comment-content">
                        <span style="font-weight:bold; color:#fff;">${c.name}</span>
                        <span style="color:#e7e9ea;">${c.text}</span>
                    </div>
                </div>`;
        });

        const div = document.createElement('div');
        div.className = 'x-post';
        div.style.flexDirection = 'column'; // Vertical layout for comments
        
        // Friend Status Logic
        const isFriend = state.friends.some(f => f.id == post.id);
        const connectHtml = isFriend 
            ? `<span class="friend-badge"><i class="fas fa-check"></i> Friend</span>`
            : `<button class="connect-btn" onclick="window.connectUser(${post.id})">Connect</button>`;

        div.innerHTML = `
            <div style="display:flex; gap:15px;">
                <img src="${post.avatar}" class="user-avatar-small">
                <div style="flex:1;">
                    <div class="post-header">
                        <div><span class="post-name">${post.name}</span> ${connectHtml}</div>
                        <span class="post-time">${post.time}</span>
                    </div>
                    <div class="post-text">${post.text}</div>
                    ${post.image ? `<img src="${post.image}" class="post-image">` : ''}
                    
                    <div class="post-actions">
                        <span class="action-item ${post.liked ? 'liked' : ''}" onclick="window.likePost(${post.id})">
                            <i class="${post.liked ? 'fas' : 'far'} fa-heart"></i> ${post.likes}
                        </span>
                        <span class="action-item" onclick="window.toggleComment
