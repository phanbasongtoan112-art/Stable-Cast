import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Dummy Firebase Init
const app = initializeApp({ apiKey: "AIzaSy..." });

// === GLOBAL STATE ===
const state = {
    user: JSON.parse(localStorage.getItem('sc_user')) || null,
    // Bài viết có thêm mảng comments và likes
    posts: JSON.parse(localStorage.getItem('sc_posts')) || [
        { 
            id: 1, name: 'Elon Musk', handle: '@elonmusk', avatar: 'https://i.pravatar.cc/150?img=12', 
            text: 'StableCast to the moon! 🚀', image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500', 
            time: '2h', likes: 420, comments: [] 
        },
        { 
            id: 2, name: 'Lume (AI)', handle: '@lume_ai', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=100', 
            text: 'Market volatility is high today. Trade safe operators! 📉', image: null, 
            time: '4h', likes: 69, comments: [] 
        }
    ],
    // Danh sách bạn bè
    friends: JSON.parse(localStorage.getItem('sc_friends')) || [],
    suggestions: [
        { id: 101, name: 'Vitalik Buterin', handle: '@VitalikButerin', avatar: 'https://i.pravatar.cc/150?img=60' },
        { id: 102, name: 'Satoshi Nakamoto', handle: '@satoshi', avatar: 'https://i.pravatar.cc/150?img=33' }
    ],
    onlineMinutes: parseInt(localStorage.getItem('sc_time')) || 0,
    chartInitialized: false // Cờ kiểm tra chart
};

// === DOM ELEMENTS ===
const els = {
    loginScreen: document.getElementById('loginScreen'),
    mainApp: document.getElementById('mainApp'),
    feedStream: document.getElementById('feedStream'),
    myFriendsList: document.getElementById('myFriendsList'),
    suggestionList: document.getElementById('suggestionList'),
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

// === LOGIN LOGIC ===
document.getElementById('btnAuth').addEventListener('click', () => {
    const id = document.getElementById('loginId').value || "Operator";
    const user = {
        name: id,
        handle: `@${id.toLowerCase().replace(/\s/g,'')}`,
        avatar: 'https://cdn-icons-png.flaticon.com/512/11498/11498793.png',
        bio: 'Just joined StableCast.'
    };
    state.user = user;
    localStorage.setItem('sc_user', JSON.stringify(user));
    unlockApp();
});

function unlockApp() {
    els.loginScreen.style.display = 'none';
    els.mainApp.style.display = 'flex'; // Flex layout
    
    // Render UI
    renderProfile();
    renderFeed();
    renderSidebar();
    
    // Mặc định vào Community trước
    window.switchView('community'); 
}

// === NAVIGATION & CHART LAZY LOAD ===
window.switchView = (viewName) => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
    
    if(viewName === 'dashboard') {
        document.getElementById('dashboard-view').style.display = 'block';
        document.querySelector('.nav-btn:nth-child(1)').classList.add('active');
        
        // FIX: Chỉ khởi tạo Chart khi view này hiện ra
        if (!state.chartInitialized) {
            setTimeout(initChart, 100); // Delay nhỏ để DOM render xong
            state.chartInitialized = true;
        }
    } 
    else if (viewName === 'community') {
        document.getElementById('community-view').style.display = 'flex';
        document.querySelector('.nav-btn:nth-child(2)').classList.add('active');
    } 
    else {
        document.getElementById('profile-view').style.display = 'block';
        document.querySelector('.nav-btn:nth-child(3)').classList.add('active');
    }
};

// === FEED & SOCIAL LOGIC ===
window.toggleStickers = () => {
    const p = document.getElementById('stickerPopup');
    p.style.display = p.style.display === 'grid' ? 'none' : 'grid';
};

window.addSticker = (sticker) => {
    els.postInput.value += sticker;
    document.getElementById('stickerPopup').style.display = 'none';
};

// Image Upload Handling
window.handleMediaSelect = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            els.previewImg.src = e.target.result;
            els.mediaPreview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.clearMedia = () => {
    document.getElementById('mediaInput').value = "";
    els.mediaPreview.style.display = 'none';
    els.previewImg.src = "";
};

// Post Logic
document.getElementById('btnPost').addEventListener('click', () => {
    const text = els.postInput.value.trim();
    const imgSrc = els.previewImg.src;
    const hasImage = els.mediaPreview.style.display !== 'none';

    if(!text && !hasImage) return;

    const newPost = {
        id: Date.now(),
        name: state.user.name,
        handle: state.user.handle,
        avatar: state.user.avatar,
        text: text,
        image: hasImage ? imgSrc : null,
        time: 'Just now',
        likes: 0,
        comments: []
    };

    state.posts.unshift(newPost);
    savePosts();
    
    // Reset Form
    els.postInput.value = "";
    clearMedia();
    renderFeed();
});

// Render Feed
function renderFeed() {
    els.feedStream.innerHTML = '';
    state.posts.forEach(post => {
        // Render Comments
        let commentsHtml = '';
        post.comments.forEach(c => {
            commentsHtml += `
                <div class="comment-item">
                    <img src="${c.avatar}" style="width:24px;height:24px;border-radius:50%;">
                    <div class="comment-content">
                        <span style="font-weight:bold; color:#fff;">${c.name}</span>
                        <span style="color:#e7e9ea;">${c.text}</span>
                    </div>
                </div>
            `;
        });

        const div = document.createElement('div');
        div.className = 'x-post';
        div.style.flexDirection = 'column'; // Để chứa comment bên dưới
        div.innerHTML = `
            <div style="display:flex; gap:15px;">
                <img src="${post.avatar}" class="user-avatar-small">
                <div style="flex:1;">
                    <div class="post-header">
                        <span class="post-name">${post.name}</span>
                        <span>${post.handle}</span>
                        <span>· ${post.time}</span>
                    </div>
                    <div class="post-text">${post.text}</div>
                    ${post.image ? `<img src="${post.image}" class="post-image">` : ''}
                    
                    <div class="post-actions">
                        <div class="action-item blue" onclick="toggleCommentBox(${post.id})">
                            <i class="far fa-comment"></i> ${post.comments.length}
                        </div>
                        <div class="action-item green"><i class="fas fa-retweet"></i> 0</div>
                        <div class="action-item red" onclick="toggleLike(${post.id})">
                            <i class="${post.liked ? 'fas' : 'far'} fa-heart"></i> ${post.likes}
                        </div>
                        <div class="action-item blue"><i class="fas fa-share"></i></div>
                    </div>
                </div>
            </div>
            
            <div id="comments-${post.id}" class="comments-section">
                ${commentsHtml}
                <div class="comment-input-box">
                    <img src="${state.user.avatar}" style="width:32px;height:32px;border-radius:50%;">
                    <input type="text" class="comment-input" placeholder="Post your reply..." 
                           onkeydown="if(event.key === 'Enter') submitComment(${post.id}, this)">
                </div>
            </div>
        `;
        els.feedStream.appendChild(div);
    });
}

// Social Actions
window.toggleLike = (id) => {
    const post = state.posts.find(p => p.id === id);
    if(post) {
        if(!post.liked) { post.likes++; post.liked = true; }
        else { post.likes--; post.liked = false; }
        savePosts();
        renderFeed();
    }
};

window.toggleCommentBox = (id) => {
    const box = document.getElementById(`comments-${id}`);
    box.style.display = box.style.display === 'block' ? 'none' : 'block';
};

window.submitComment = (id, input) => {
    if(!input.value.trim()) return;
    const post = state.posts.find(p => p.id === id);
    if(post) {
        post.comments.push({
            name: state.user.name,
            avatar: state.user.avatar,
            text: input.value
        });
        savePosts();
        renderFeed();
        // Giữ comment box mở sau khi post
        setTimeout(() => { document.getElementById(`comments-${id}`).style.display = 'block'; }, 50);
    }
};

// === FRIENDS & SIDEBAR ===
function renderSidebar() {
    // Render Suggestions
    els.suggestionList.innerHTML = '';
    state.suggestions.forEach(s => {
        const isFriend = state.friends.find(f => f.id == s.id);
        if(isFriend) return; // Đã kết bạn thì ko hiện gợi ý nữa

        els.suggestionList.innerHTML += `
            <div class="friend-item-mini" style="justify-content:space-between;">
                <div style="display:flex; gap:10px; align-items:center;">
                    <img src="${s.avatar}" style="width:32px;height:32px;border-radius:50%;">
                    <div><div style="font-weight:bold; color:#fff; font-size:0.9rem;">${s.name}</div></div>
                </div>
                <button class="connect-btn" onclick="addFriend(${s.id})">Connect</button>
            </div>
        `;
    });

    // Render My Friends
    els.myFriendsList.innerHTML = '';
    state.friends.forEach(f => {
        els.myFriendsList.innerHTML += `
            <div class="friend-item-mini">
                <img src="${f.avatar}" style="width:32px;height:32px;border-radius:50%;">
                <div>
                    <div style="font-weight:bold; color:#fff; font-size:0.9rem;">${f.name}</div>
                    <div style="font-size:0.75rem; color:#0ecb81;">Online</div>
                </div>
                <div class="online-dot" style="margin-left:auto;"></div>
            </div>
        `;
    });
}

window.addFriend = (id) => {
    const person = state.suggestions.find(s => s.id == id);
    if(person) {
        state.friends.push(person);
        localStorage.setItem('sc_friends', JSON.stringify(state.friends));
        renderSidebar();
        renderProfile(); // Update count
    }
};

// === UTILS & CHART ===
function savePosts() { localStorage.setItem('sc_posts', JSON.stringify(state.posts)); }
function formatTime(m) { return m < 60 ? `${m}m` : `${Math.floor(m/60)}h ${m%60}m`; }

function renderProfile() {
    document.getElementById('profileName').innerText = state.user.name;
    document.getElementById('profileDesc').innerText = state.user.bio;
    document.getElementById('profileAvatar').src = state.user.avatar;
    document.getElementById('headerAvatar').src = state.user.avatar;
    document.getElementById('feedAvatar').src = state.user.avatar;
    document.getElementById('statFriends').innerText = state.friends.length;
    document.getElementById('statOnline').innerText = formatTime(state.onlineMinutes);
}

function initChart() {
    const ctx = document.getElementById('mainChart');
    if(!ctx) return;
    
    // Destroy old chart if exists
    if(chart) chart.destroy();

    // Init Logic (Chart.js)
    chart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: Array(30).fill(''),
            datasets: [{
                label: 'Price',
                data: Array(30).fill(0).map(() => 68000 + Math.random() * 500),
                borderColor: '#0ecb81',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { display: false }, y: { position: 'right', grid: { color: '#2f3336' } } },
            plugins: { legend: { display: false } },
            animation: false
        }
    });

    // Simulate WebSocket
    setInterval(() => {
        const p = 68000 + Math.random() * 500;
        document.getElementById('btcPrice').innerText = `$${p.toFixed(2)}`;
        
        // Update Chart Data
        chart.data.datasets[0].data.shift();
        chart.data.datasets[0].data.push(p);
        chart.update();
    }, 2000);
}
