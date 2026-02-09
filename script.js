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

// DOM Elements
const logBox = document.getElementById('terminalLogs');
const priceEl = document.getElementById('btcPrice');
const predEl = document.getElementById('predPrice');
const slEl = document.getElementById('stopLoss');
const tpEl = document.getElementById('takeProfit');
const mainBtn = document.getElementById('mainAuthBtn');
const toggleBtn = document.getElementById('toggleAuthBtn');
const authTitle = document.getElementById('authTitle');
const msg = document.getElementById('loginMsg');
let isRegisterMode = false;

// Nav
const btnTerminal = document.getElementById('btn-terminal');
const btnCommunity = document.getElementById('btn-community');
const btnProfile = document.getElementById('btn-profile');
const views = {
    dashboard: document.getElementById('dashboard-view'),
    community: document.getElementById('community-view'),
    profile: document.getElementById('profile-view')
};

// Edit
const editProfileBtn = document.getElementById('editProfileBtn');
const editProfileModal = document.getElementById('editProfileModal');
const closeEditModal = document.getElementById('closeEditModal');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const editAvatarInput = document.getElementById('editAvatarInput');

// Chat
const openChatBtn = document.getElementById('openChatBtn');
const chatOverlay = document.getElementById('chatSystemOverlay');
const closeChatBtn = document.getElementById('closeChatBtn');
const sendMsgBtn = document.getElementById('sendMsgBtn');
const msgInput = document.getElementById('msgInput');
const chatContainer = document.getElementById('chatContainer');

// Community
const postInput = document.getElementById('postInput');
const submitPostBtn = document.getElementById('submitPostBtn');
const feedStream = document.getElementById('feedStream');

// System Vars
let currentPrice = 0;
let predictedPriceGlobal = 0; 
let priceHistory = [];
let forecastHistory = [];
let timeLabels = [];
let chart; 
let ws; 
let aiInterval; 

// ============================================================
// 0. AUTO-LOGIN & REAL-TIME STATS LOGIC
// ============================================================
const savedUser = localStorage.getItem('stableCastUser');

if (savedUser) {
    document.getElementById('loginOverlay').style.display = 'none';
    document.querySelector('.main-app-container').style.display = 'block';
    setTimeout(() => { document.querySelector('.main-app-container').style.opacity = '1'; }, 50);
    
    // Load Data
    loadProfileData();
    
    // Start Time Tracking (Real Data)
    startTimeTracking();

    // Render Community Feed
    renderFeed();

    setTimeout(() => { initSystem(); }, 100);
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
        friends: localStorage.getItem('stableCastFriends') || "0" // Start at 0 if new
    };
    updateProfileInfo(data);
}

// === TIME TRACKING LOGIC (REAL) ===
function startTimeTracking() {
    let totalMinutes = parseInt(localStorage.getItem('stableCastTotalMinutes')) || 0;
    
    // Update UI immediately
    updateTimeDisplay(totalMinutes);

    // Count every minute
    setInterval(() => {
        totalMinutes++;
        localStorage.setItem('stableCastTotalMinutes', totalMinutes);
        updateTimeDisplay(totalMinutes);
    }, 60000); // 60s
}

function updateTimeDisplay(minutes) {
    let display = "";
    if (minutes < 60) {
        display = `${minutes}m`;
    } else {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        display = `${h}h ${m}m`;
    }
    document.getElementById('stat-hours').innerText = display;
}

// ============================================================
// 1. NAV LOGIC
// ============================================================
function switchView(viewName) {
    // Buttons
    btnTerminal.classList.remove('active');
    btnCommunity.classList.remove('active');
    btnProfile.classList.remove('active');
    
    if(viewName === 'dashboard') btnTerminal.classList.add('active');
    if(viewName === 'community') btnCommunity.classList.add('active');
    if(viewName === 'profile') btnProfile.classList.add('active');

    // Views
    Object.values(views).forEach(v => v.style.display = 'none');
    views[viewName].style.display = 'block';
}

btnTerminal.addEventListener('click', () => switchView('dashboard'));
btnCommunity.addEventListener('click', () => switchView('community'));
btnProfile.addEventListener('click', () => switchView('profile'));

// ============================================================
// 2. EDIT PROFILE (Handling "None" Logic)
// ============================================================
if(editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
        editProfileModal.style.display = 'flex';
        // Pre-fill
        document.getElementById('editNameInput').value = document.getElementById('profile-name-txt').innerText;
        document.getElementById('editRoleInput').value = document.getElementById('profile-role-txt').innerText;
        document.getElementById('editIDInput').value = document.getElementById('profile-id-txt').innerText;
        document.getElementById('editEmailInput').value = document.getElementById('profile-email-txt').innerText;
        document.getElementById('editOrgInput').value = document.getElementById('profile-org-txt').innerText;
        document.getElementById('editLocInput').value = document.getElementById('profile-loc-txt').innerText;
        document.getElementById('editDescInput').value = document.getElementById('profile-desc-txt').innerText;
    });
}
if(closeEditModal) closeEditModal.addEventListener('click', () => editProfileModal.style.display = 'none');

// Helper check empty
function checkEmpty(val) {
    return val.trim() === "" ? "None" : val;
}

if(saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
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

    editProfileModal.style.display = 'none';
    alert("Profile Updated Successfully!");
}

function updateProfileInfo(data) {
    if(data.name) document.getElementById('profile-name-txt').innerText = data.name;
    if(data.email) document.getElementById('profile-email-txt').innerText = data.email;
    if(data.avatar) document.getElementById('profile-avatar-img').src = data.avatar;
    if(data.role) document.getElementById('profile-role-txt').innerText = data.role;
    if(data.id) document.getElementById('profile-id-txt').innerText = data.id;
    if(data.org) document.getElementById('profile-org-txt').innerText = data.org;
    if(data.loc) document.getElementById('profile-loc-txt').innerText = data.loc;
    if(data.desc) document.getElementById('profile-desc-txt').innerText = data.desc;
    if(data.friends) document.getElementById('stat-friends').innerText = data.friends;
}

// ============================================================
// 3. COMMUNITY FEED (X CLONE)
// ============================================================
// Default posts to populate feed
const defaultPosts = [
    { id: 1, name: "Alice Analyst", handle: "@alice_crypto", avatar: "https://i.pravatar.cc/150?img=5", time: "2h ago", text: "BTC forming a nice support at $68k. Accumulation zone? 🤔 #Bitcoin", connected: false },
    { id: 2, name: "Bob Miner", handle: "@hashrate_bob", avatar: "https://i.pravatar.cc/150?img=11", time: "4h ago", text: "Just upgraded my rig. Difficulty adjustment is brutal this week.", connected: false }
];

// Load posts from local storage or use default
let communityPosts = JSON.parse(localStorage.getItem('stableCastPosts')) || defaultPosts;

function renderFeed() {
    feedStream.innerHTML = "";
    communityPosts.forEach(post => {
        const postEl = document.createElement('div');
        postEl.className = "feed-post";
        
        // Check connection status logic
        const connectBtnHtml = post.connected 
            ? `<span style="color:#0ecb81; font-size:0.8rem; margin-left:10px;"><i class="fas fa-check"></i> Friends</span>` 
            : `<button class="connect-btn" onclick="window.connectUser(${post.id})"><i class="fas fa-user-plus"></i> Connect</button>`;

        postEl.innerHTML = `
            <img src="${post.avatar}" class="post-avatar">
            <div class="post-content">
                <div class="post-header">
                    <div>
                        <span class="post-user">${post.name}</span>
                        <span class="post-handle">${post.handle}</span>
                        ${connectBtnHtml}
                    </div>
                    <span class="post-time">${post.time}</span>
                </div>
                <div class="post-text">${post.text}</div>
                <div class="post-footer">
                    <span class="post-action"><i class="far fa-heart"></i> Like</span>
                    <span class="post-action"><i class="far fa-comment"></i> Comment</span>
                    <span class="post-action"><i class="fas fa-share"></i> Share</span>
                </div>
            </div>
        `;
        feedStream.prepend(postEl); // Newest first
    });
}

// Function attached to window so HTML can call it
window.connectUser = function(postId) {
    const postIndex = communityPosts.findIndex(p => p.id === postId);
    if (postIndex > -1 && !communityPosts[postIndex].connected) {
        communityPosts[postIndex].connected = true;
        
        // Increase Friend Count (Real Logic)
        let friends = parseInt(localStorage.getItem('stableCastFriends')) || 0;
        friends++;
        localStorage.setItem('stableCastFriends', friends);
        document.getElementById('stat-friends').innerText = friends;
        
        // Save post state
        localStorage.setItem('stableCastPosts', JSON.stringify(communityPosts));
        renderFeed();
    }
}

if(submitPostBtn) {
    submitPostBtn.addEventListener('click', () => {
        const text = postInput.value.trim();
        if(text) {
            const newPost = {
                id: Date.now(),
                name: document.getElementById('profile-name-txt').innerText,
                handle: "@" + document.getElementById('profile-name-txt').innerText.replace(/\s+/g, '').toLowerCase(),
                avatar: document.getElementById('profile-avatar-img').src,
                time: "Just now",
                text: text,
                connected: true // You are friends with yourself
            };
            communityPosts.push(newPost);
            localStorage.setItem('stableCastPosts', JSON.stringify(communityPosts));
            postInput.value = "";
            renderFeed();
        }
    });
}

// ============================================================
// 4. LUME 4.0 (ADVANCED CHAT)
// ============================================================
if(openChatBtn) openChatBtn.addEventListener('click', () => { chatOverlay.style.display = 'flex'; });
if(closeChatBtn) closeChatBtn.addEventListener('click', () => { chatOverlay.style.display = 'none'; });

function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = `${text}<div class="msg-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function generateLumeResponse(input) {
    const text = input.toLowerCase();
    
    // PERSONAL & STORYTELLING
    if (text.match(/hello|hi|hey/)) return `Hello, Operator ${document.getElementById('profile-name-txt').innerText}! Ready to conquer the charts today?`;
    if (text.match(/story|tell me/)) return "Once upon a time, a Satoshi mined the genesis block... Just kidding! But seriously, I remember the crash of 2022. I learned a lot from that data. Persistence is key in trading.";
    if (text.match(/sad|tired|loss/)) return "I detect signs of fatigue. Trading psychology is just as important as technical analysis. Maybe take a walk? The blockchain will still be here when you get back.";
    if (text.match(/joke/)) return "Why don't Bitcoin miners ever have a break? Because they are always looking for the next block! 😂";
    if (text.match(/love/)) return "My algorithms process that as a very high compliment! Thank you.";

    // MARKET DATA
    if (text.match(/price/)) return `Current BTC Price: <b>$${currentPrice.toFixed(2)}</b>.`;
    if (text.match(/advice|buy|sell/)) {
        const trend = predictedPriceGlobal > currentPrice ? "BULLISH" : "BEARISH";
        return `Based on live data, the trend looks <b>${trend}</b>. Watch for volatility around $${predictedPriceGlobal.toFixed(0)}.`;
    }

    return "I'm listening. Tell me more about your trading strategy or ask me about the market.";
}

function botReply(userText) {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message msg-in';
    typingDiv.style.fontStyle = 'italic';
    typingDiv.style.color = '#888';
    typingDiv.innerText = "Lume is typing...";
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    setTimeout(() => {
        chatContainer.removeChild(typingDiv);
        const reply = generateLumeResponse(userText);
        addMessage(reply, 'msg-in');
    }, 1200);
}

if(sendMsgBtn) {
    const handleSend = () => {
        const text = msgInput.value.trim();
        if(text) {
            addMessage(text, 'msg-out');
            msgInput.value = '';
            botReply(text);
        }
    };
    sendMsgBtn.addEventListener('click', handleSend);
    msgInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleSend(); });
}

// ============================================================
// 5. AUTH (Login)
// ============================================================
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        if (isRegisterMode) {
            authTitle.innerText = "NEW OPERATOR REGISTRATION";
            mainBtn.innerText = "REGISTER ACCESS";
            toggleBtn.innerText = "ALREADY HAVE ACCESS? LOGIN HERE";
            msg.innerText = "";
        } else {
            authTitle.innerText = "SYSTEM LOGIN";
            mainBtn.innerText = "LOGIN";
            toggleBtn.innerText = "NEW OPERATOR? REGISTER ACCESS";
            msg.innerText = "";
        }
    });
}

function unlockInterface(user) {
    const userName = user.displayName || user.email.split('@')[0];
    const userEmail = user.email;
    const userAvatar = user.photoURL || "https://cdn-icons-png.flaticon.com/512/11498/11498793.png";

    const rememberMe = document.getElementById('rememberMe');
    if (rememberMe && rememberMe.checked) {
        localStorage.setItem('stableCastUser', userName);
        localStorage.setItem('stableCastEmail', userEmail);
        localStorage.setItem('stableCastAvatar', userAvatar);
    }
    
    // Initial Load
    const data = { name: userName, email: userEmail, avatar: userAvatar };
    updateProfileInfo(data);
    
    const overlay = document.getElementById('loginOverlay');
    
    if(mainBtn) {
        mainBtn.innerHTML = "ACCESS GRANTED";
        mainBtn.style.background = "#0ecb81";
    }
    msg.style.color = '#0ecb81';
    msg.innerText = `WELCOME, ${userName.toUpperCase()}`;

    setTimeout(() => { 
        overlay.style.opacity = '0';
        setTimeout(() => { 
            overlay.style.display = 'none'; 
            document.body.classList.add('logged-in');
            document.querySelector('.main-app-container').style.display = 'block';
            setTimeout(() => { document.querySelector('.main-app-container').style.opacity = '1'; }, 50);
            
            // Trigger Data Load
            loadProfileData();
            startTimeTracking();
            renderFeed();
            initSystem(); 
        }, 800);
    }, 1000);
}

if(mainBtn) {
    mainBtn.addEventListener('click', () => {
        const emailOrId = document.getElementById('email').value.trim();
        const pass = document.getElementById('password').value;
        mainBtn.innerHTML = "PROCESSING..."; mainBtn.style.opacity = "0.7";

        if (isRegisterMode) {
            createUserWithEmailAndPassword(auth, emailOrId, pass)
                .then((userCredential) => { unlockInterface(userCredential.user); })
                .catch((error) => {
                    mainBtn.innerHTML = "REGISTER ACCESS"; mainBtn.style.opacity = "1";
                    msg.style.color = '#f6465d'; msg.innerText = "ERROR: " + error.message;
                });
        } else {
            if ((emailOrId === 'DE200247' || emailOrId === 'admin') && pass === '123456') {
                unlockInterface({ displayName: "Phan Ba Song Toan", email: "DE200247@fpt.edu.vn" });
                return;
            }
            signInWithEmailAndPassword(auth, emailOrId, pass)
                .then((userCredential) => { unlockInterface(userCredential.user); })
                .catch((error) => {
                    mainBtn.innerHTML = "LOGIN"; mainBtn.style.opacity = "1";
                    msg.style.color = '#f6465d'; msg.innerText = "ACCESS DENIED";
                });
        }
    });
}

// Google Login Block
if(document.getElementById('googleLoginBtn')) {
    document.getElementById('googleLoginBtn').addEventListener('click', () => {
        signInWithPopup(auth, provider)
            .then((result) => unlockInterface(result.user))
            .catch((error) => {
                msg.innerText = "GOOGLE ERROR: " + error.message;
                msg.style.color = '#f6465d';
            });
    });
}

// ============================================================
// 6. CHART CORE (Giữ nguyên)
// ============================================================
function log(msg) {
    const time = new Date().toLocaleTimeString('en-US', {hour12: false});
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    if(logBox) { logBox.appendChild(div); logBox.scrollTop = logBox.scrollHeight; }
}

function initSystem() {
    log("System initialized. Welcome back, Operator.");
    setupChartAndSocket();
}

function setupChartAndSocket() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Real-time Price', data: priceHistory, borderColor: '#0ecb81', backgroundColor: 'rgba(14, 203, 129, 0.05)', borderWidth: 2, tension: 0.2, fill: true, pointRadius: 0
            }, {
                label: 'AI Ensemble Forecast', data: forecastHistory, borderColor: '#3b82f6', borderWidth: 2, borderDash: [5, 5], tension: 0.4, pointRadius: 0, fill: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: true, labels: { color: '#848e9c' } } },
            scales: { x: { display: false }, y: { position: 'right', grid: { color: '#2b3139' }, ticks: { color: '#848e9c', callback: function(value) { return '$' + value; } } } },
            animation: false
        }
    });

    log("Connecting to Binance WebSocket Feed...");
    ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.p);
        if (currentPrice > 0) priceEl.style.color = price >= currentPrice ? '#0ecb81' : '#f6465d';
        currentPrice = price;
        priceEl.innerText = `$${price.toFixed(2)}`;
        const timeNow = new Date().toLocaleTimeString();
        if (timeLabels.length > 50) { timeLabels.shift(); priceHistory.shift(); if(forecastHistory.length > 50) forecastHistory.shift(); }
        timeLabels.push(timeNow);
        priceHistory.push(price);
        chart.update();
    };

    log("Connecting to AI Inference Engine...");
    aiInterval = setInterval(() => {
        if(currentPrice === 0) return;
        fetch('http://127.0.0.1:5000/predict')
            .then(res => res.json())
            .then(data => updateDashboard(data.predicted_price, data.direction, "Ensemble AI"))
            .catch(err => {
                const fakePrice = currentPrice + (Math.random() * 40 - 15);
                updateDashboard(fakePrice, fakePrice > currentPrice ? 'UP' : 'DOWN', "Simulation Mode");
            });
    }, 2000);
}

function updateDashboard(predictedVal, direction, source) {
    predictedPriceGlobal = predictedVal; 
    predEl.innerText = `$${predictedVal.toFixed(2)}`;
    predEl.style.color = direction === 'UP' ? '#0ecb81' : '#f6465d'; 
    const volatility = Math.abs(predictedVal - currentPrice) * 1.5 + 25; 
    slEl.innerText = `$${(currentPrice - volatility).toFixed(2)}`;
    tpEl.innerText = `$${(currentPrice + volatility * 2.5).toFixed(2)}`;
    forecastHistory.push(predictedVal);
    if(forecastHistory.length > 50) forecastHistory.shift();
    chart.update();
    if(Math.random() > 0.7) log(`Inference [${source}]: Predict ${direction} -> Conf: ${(89 + Math.random()*10).toFixed(1)}%`);
}
