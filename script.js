import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Init Firebase (Keep it separate or integrated)
const app = initializeApp({ apiKey: "AIzaSy..." }); // Dummy config for UI demo

// === GLOBAL STATE ===
const state = {
    user: JSON.parse(localStorage.getItem('sc_user')) || null,
    friends: JSON.parse(localStorage.getItem('sc_friends')) || [
        { id: 'lume', name: 'Lume (AI)', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=100', online: true, messages: [] }
    ],
    posts: JSON.parse(localStorage.getItem('sc_posts')) || [
        { id: 1, name: 'Elon Musk', handle: '@elonmusk', avatar: 'https://i.pravatar.cc/150?img=12', text: 'Crypto is the future of Mars.', time: '2h' },
        { id: 2, name: 'CZ Binance', handle: '@cz_binance', avatar: 'https://i.pravatar.cc/150?img=11', text: 'SAFU. Always.', time: '4h' }
    ],
    suggestions: [
        { id: 101, name: 'Vitalik Buterin', handle: '@VitalikButerin', avatar: 'https://i.pravatar.cc/150?img=60' },
        { id: 102, name: 'Satoshi Nakamoto', handle: '@satoshi', avatar: 'https://i.pravatar.cc/150?img=33' },
        { id: 103, name: 'Michael Saylor', handle: '@saylor', avatar: 'https://i.pravatar.cc/150?img=5' }
    ],
    onlineMinutes: parseInt(localStorage.getItem('sc_time')) || 0,
    activeChatId: 'lume'
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
    chatOverlay: document.getElementById('chatOverlay'),
    feedStream: document.getElementById('feedStream'),
    friendList: document.getElementById('friendList'),
    chatMessages: document.getElementById('chatMessages')
};

// === INIT ===
window.addEventListener('DOMContentLoaded', () => {
    if (state.user) {
        unlockApp();
    }
    
    // Start Real-time Timer
    setInterval(() => {
        state.onlineMinutes++;
        localStorage.setItem('sc_time', state.onlineMinutes);
        updateStats();
    }, 60000); // Every minute
});

// === AUTHENTICATION ===
document.getElementById('btnAuth').addEventListener('click', () => {
    const id = document.getElementById('loginId').value || "User";
    const user = {
        name: id,
        email: `@${id.toLowerCase().replace(/\s/g, '')}`,
        bio: 'Crypto Enthusiast. StableCast User.',
        loc: 'Vietnam',
        org: 'FPT University',
        avatar: 'https://cdn-icons-png.flaticon.com/512/11498/11498793.png'
    };
    
    state.user = user;
    localStorage.setItem('sc_user', JSON.stringify(user));
    unlockApp();
});

function unlockApp() {
    els.loginScreen.style.display = 'none';
    els.mainApp.style.display = 'block';
    
    // Init Chart
    initChart();
    // Render Data
    renderProfile();
    renderFeed();
    renderSuggestions();
    renderFriends();
    updateStats();
}

// === NAVIGATION ===
window.switchView = (viewName) => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
    
    // Simple toggle logic based on index or class
    // For demo simplicity, just toggling views manually
    if(viewName === 'dashboard') {
        els.views.dashboard.style.display = 'block';
        document.querySelector('.nav-btn:nth-child(1)').classList.add('active');
    } else if (viewName === 'community') {
        els.views.community.style.display = 'flex';
        document.querySelector('.nav-btn:nth-child(2)').classList.add('active');
    } else {
        els.views.profile.style.display = 'block';
        document.querySelector('.nav-btn:nth-child(3)').classList.add('active');
    }
};

// === PROFILE SYSTEM ===
function renderProfile() {
    const u = state.user;
    // Check Empty Logic
    const val = (v) => v && v.trim() !== "" ? v : "None";
    
    document.getElementById('profileName').innerText = val(u.name);
    document.getElementById('profileEmail').innerText = val(u.email);
    document.getElementById('profileDesc').innerText = val(u.bio);
    document.getElementById('profileLoc').innerText = val(u.loc);
    document.getElementById('profileOrg').innerText = val(u.org);
    document.getElementById('profileAvatar').src = u.avatar;
    document.getElementById('headerAvatar').src = u.avatar;
    document.getElementById('feedAvatar').src = u.avatar;
}

function updateStats() {
    // REAL DATA
    document.getElementById('statFriends').innerText = state.friends.length - 1; // Minus Lume
    
    const m = state.onlineMinutes;
    const timeStr = m < 60 ? `${m}m` : `${Math.floor(m/60)}h ${m%60}m`;
    document.getElementById('statOnline').innerText = timeStr;
}

// Edit Profile Logic
document.getElementById('btnEditProfile').addEventListener('click', () => {
    document.getElementById('editModal').style.display = 'flex';
    document.getElementById('inpName').value = state.user.name;
    document.getElementById('inpDesc').value = state.user.bio;
    document.getElementById('inpLoc').value = state.user.loc;
    document.getElementById('inpOrg').value = state.user.org;
    document.getElementById('inpAvatar').value = state.user.avatar;
});

document.getElementById('btnSaveProfile').addEventListener('click', () => {
    const u = state.user;
    u.name = document.getElementById('inpName').value;
    u.bio = document.getElementById('inpDesc').value;
    u.loc = document.getElementById('inpLoc').value;
    u.org = document.getElementById('inpOrg').value;
    
    const avaUrl = document.getElementById('inpAvatar').value;
    if(avaUrl.trim()) u.avatar = avaUrl;

    localStorage.setItem('sc_user', JSON.stringify(u));
    renderProfile();
    document.getElementById('editModal').style.display = 'none';
});

document.getElementById('closeEditModal').addEventListener('click', () => {
    document.getElementById('editModal').style.display = 'none';
});

// === COMMUNITY FEED (X Clone) ===
document.getElementById('postInput').addEventListener('input', (e) => {
    const btn = document.getElementById('btnPost');
    if(e.target.value.trim().length > 0) btn.classList.add('active');
    else btn.classList.remove('active');
});

document.getElementById('btnPost').addEventListener('click', () => {
    const text = document.getElementById('postInput').value;
    if(!text.trim()) return;

    const newPost = {
        id: Date.now(),
        name: state.user.name,
        handle: state.user.email,
        avatar: state.user.avatar,
        text: text,
        time: 'Just now'
    };
    
    state.posts.unshift(newPost);
    localStorage.setItem('sc_posts', JSON.stringify(state.posts));
    document.getElementById('postInput').value = '';
    renderFeed();
});

function renderFeed() {
    const container = document.getElementById('feedStream');
    container.innerHTML = '';
    
    state.posts.forEach(post => {
        const div = document.createElement('div');
        div.className = 'x-post';
        div.innerHTML = `
            <img src="${post.avatar}" class="user-avatar-small">
            <div style="flex:1;">
                <div class="post-header">
                    <span class="post-name">${post.name}</span>
                    <span>${post.handle}</span>
                    <span>· ${post.time}</span>
                </div>
                <div class="post-text">${post.text}</div>
                <div class="post-actions">
                    <div class="action-item blue"><i class="far fa-comment"></i> 0</div>
                    <div class="action-item green"><i class="fas fa-retweet"></i> 0</div>
                    <div class="action-item red"><i class="far fa-heart"></i> 0</div>
                    <div class="action-item blue"><i class="far fa-chart-bar"></i> 0</div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderSuggestions() {
    const list = document.getElementById('suggestionList');
    list.innerHTML = '';
    
    state.suggestions.forEach(s => {
        // Check if already friend
        const isFriend = state.friends.find(f => f.id == s.id);
        const btnClass = isFriend ? 'connect-btn connected' : 'connect-btn';
        const btnText = isFriend ? 'Following' : 'Follow';
        
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `
            <div class="sugg-info">
                <img src="${s.avatar}" class="user-avatar-small">
                <div>
                    <div style="font-weight:bold; color:#fff;">${s.name}</div>
                    <div style="color:#71767b; font-size:0.8rem;">${s.handle}</div>
                </div>
            </div>
            <button class="${btnClass}" onclick="window.connectFriend(${s.id})">${btnText}</button>
        `;
        list.appendChild(div);
    });
}

window.connectFriend = (id) => {
    const person = state.suggestions.find(s => s.id == id);
    if (!person) return;
    
    // Add to friends
    state.friends.push({
        id: person.id,
        name: person.name,
        avatar: person.avatar,
        messages: []
    });
    
    localStorage.setItem('sc_friends', JSON.stringify(state.friends));
    renderSuggestions();
    renderFriends();
    updateStats();
};

// === CHAT SYSTEM (Zalo Style) ===
document.getElementById('openChatBtn').addEventListener('click', () => {
    els.chatOverlay.style.display = 'flex';
});
document.getElementById('closeChat').addEventListener('click', () => {
    els.chatOverlay.style.display = 'none';
});

function renderFriends() {
    els.friendList.innerHTML = '';
    state.friends.forEach(f => {
        const div = document.createElement('div');
        div.className = `zalo-item ${state.activeChatId == f.id ? 'active' : ''}`;
        div.onclick = () => switchChat(f.id);
        div.innerHTML = `
            <img src="${f.avatar}" class="z-avatar">
            <div class="z-info">
                <h4>${f.name}</h4>
                <p>Click to chat</p>
            </div>
        `;
        els.friendList.appendChild(div);
    });
}

function switchChat(id) {
    state.activeChatId = id;
    renderFriends(); // Update active class
    
    const friend = state.friends.find(f => f.id == id);
    document.getElementById('chatHeaderName').innerText = friend.name;
    els.chatMessages.innerHTML = ''; // Clear view
    
    // Render existing messages (Mock logic - Lume default)
    if(id === 'lume') {
        addChatMsg('Hello Operator! I am Lume. I analyze crypto trends.', 'in');
    } else {
        addChatMsg(`You are now connected with ${friend.name}. Say hi!`, 'in');
    }
}

function addChatMsg(text, type) {
    const div = document.createElement('div');
    div.className = `z-msg ${type}`;
    div.innerText = text;
    els.chatMessages.appendChild(div);
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

document.getElementById('btnSendChat').addEventListener('click', () => {
    const txt = document.getElementById('chatInput').value;
    if(!txt.trim()) return;
    
    addChatMsg(txt, 'out');
    document.getElementById('chatInput').value = '';
    
    // Auto reply from Lume
    if(state.activeChatId === 'lume') {
        setTimeout(() => {
            const replies = [
                `BTC Price is currently oscillating around $${(Math.random()*100 + 68400).toFixed(2)}.`,
                "Market sentiment is BULLISH.",
                "I recommend setting a tight Stop Loss today.",
                "Interesting observation, Operator."
            ];
            addChatMsg(replies[Math.floor(Math.random() * replies.length)], 'in');
        }, 1000);
    }
});

// === CHART (Visual Only) ===
function initChart() {
    const ctx = document.getElementById('mainChart');
    if(!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [{
                label: 'Price',
                data: Array(20).fill(0).map(() => 68000 + Math.random() * 500),
                borderColor: '#0ecb81',
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { display: false },
                y: { display: true, position: 'right', grid: { color: '#2f3336' } }
            },
            plugins: { legend: { display: false } }
        }
    });
    
    // Simulate Price Update
    setInterval(() => {
        const p = 68000 + Math.random() * 500;
        document.getElementById('btcPrice').innerText = `$${p.toFixed(2)}`;
        document.getElementById('predPrice').innerText = `$${(p + 50).toFixed(2)}`;
    }, 2000);
}
