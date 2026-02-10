import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// === CẤU HÌNH ===
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
// status: 0 (Chưa kết bạn), 1 (Đã gửi lời mời), 2 (Bạn bè)
let friendList = [
    { id: 1, name: "Nguyễn Quốc Đạt", role: "Backend Dev", avatar: "https://i.pravatar.cc/150?u=1", cover: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80", desc: "Expert in Node.js & Microservices.", mutual: 12, status: 0 },
    { id: 2, name: "Trần Thái Sơn", role: "AI Researcher", avatar: "https://i.pravatar.cc/150?u=2", cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80", desc: "Building the next gen trading algos.", mutual: 8, status: 0 },
    { id: 3, name: "Lê Minh Quân", role: "Data Analyst", avatar: "https://i.pravatar.cc/150?u=3", cover: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80", desc: "Converting data into profit.", mutual: 15, status: 0 },
    { id: 4, name: "Phạm Gia Huy", role: "Security Ops", avatar: "https://i.pravatar.cc/150?u=4", cover: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80", desc: "Keeping the terminal secure.", mutual: 5, status: 0 },
    { id: 5, name: "Nguyễn Văn Tân", role: "Frontend Dev", avatar: "https://i.pravatar.cc/150?u=5", cover: "https://images.unsplash.com/photo-1550439062-609e1531270e?auto=format&fit=crop&w=600&q=80", desc: "Pixel perfect interfaces.", mutual: 20, status: 0 },
    { id: 6, name: "Đỗ Thu Hiền", role: "Designer", avatar: "https://i.pravatar.cc/150?u=9", cover: "https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?auto=format&fit=crop&w=600&q=80", desc: "UI/UX Specialist for Trading Apps.", mutual: 32, status: 0 }
];

// --- DỮ LIỆU THÔNG BÁO ---
const notifications = [
    { type: 'post', text: "Alice Crypto posted a new analysis.", time: "10m ago", read: false },
    { type: 'friend', text: "Hoàng Long sent you a friend request.", time: "1h ago", read: false },
    { type: 'system', text: "BTC alert: Price dropped below $69k.", time: "2h ago", read: true }
];

// ============================================================
// 0. AUTO-LOGIN & INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('stableCastUser');
    if (savedUser) {
        document.getElementById('loginOverlay').style.display = 'none';
        const mainApp = document.querySelector('.main-app-container');
        if(mainApp) {
            mainApp.style.display = 'block';
            setTimeout(() => { mainApp.style.opacity = '1'; }, 50);
        }
        
        loadProfileData();
        renderFriendList();
        renderNotifications();
        startTimeTracking();
        renderFeed();
        
        setTimeout(() => { initSystem(); }, 500);
    }
});

function checkEmpty(val) {
    return (!val || val.trim() === "") ? "None" : val;
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

// ============================================================
// 1. FRIEND LOGIC (RENDER & ACTIONS)
// ============================================================
function renderFriendList() {
    const container = document.getElementById('friendGridContainer');
    if(!container) return;
    container.innerHTML = "";

    friendList.forEach((friend, index) => {
        const div = document.createElement('div');
        div.className = "friend-card";
        div.style.cursor = "pointer";
        
        // Nút trạng thái dựa trên status
        let btnHtml = '';
        if (friend.status === 0) {
            btnHtml = `<button class="friend-add-btn" id="btn-add-${index}"><i class="fas fa-user-plus"></i> Add Friend</button>`;
        } else if (friend.status === 1) {
            btnHtml = `<button class="friend-add-btn requested" id="btn-add-${index}"><i class="fas fa-clock"></i> Requested</button>`;
        } else {
            btnHtml = `<button class="friend-add-btn connected" id="btn-add-${index}"><i class="fas fa-check"></i> Friends</button>`;
        }

        div.innerHTML = `
            <img src="${friend.avatar}" class="friend-card-img">
            <div class="friend-card-info">
                <div class="friend-card-name">${friend.name}</div>
                <div class="friend-card-role">${friend.role}</div>
                <div class="friend-card-mutual">${friend.mutual} mutual friends</div>
            </div>
            ${btnHtml}
        `;
        
        // Sự kiện click vào Card (Mở Modal)
        div.onclick = (e) => {
            // Nếu click vào nút button thì không mở modal
            if(e.target.closest('.friend-add-btn')) return;
            openFriendModal(index);
        };

        container.appendChild(div);

        // Sự kiện click vào Button (Add Friend)
        const btn = document.getElementById(`btn-add-${index}`);
        if(btn) {
            btn.onclick = (e) => {
                e.stopPropagation(); // Ngăn mở modal
                toggleFriendStatus(index);
            };
        }
    });
    
    const countEl = document.getElementById('friendCountDisplay');
    if(countEl) countEl.innerText = `(${friendList.length})`;
}

function toggleFriendStatus(index) {
    if (friendList[index].status === 0) {
        friendList[index].status = 1; // Gửi lời mời
        // Giả lập sau 3s đồng ý
        setTimeout(() => {
            friendList[index].status = 2;
            renderFriendList();
            // Thêm thông báo
            notifications.unshift({ type: 'friend', text: `${friendList[index].name} accepted your request.`, time: "Just now", read: false });
            renderNotifications();
        }, 3000);
    } 
    renderFriendList();
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
// 2. NOTIFICATION LOGIC
// ============================================================
const notiBtn = document.getElementById('btn-notifications');
const notiDropdown = document.getElementById('notificationDropdown');

if(notiBtn) {
    notiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if(notiDropdown.style.display === 'block') {
            notiDropdown.style.display = 'none';
        } else {
            notiDropdown.style.display = 'block';
        }
    });
}

// Đóng dropdown khi click ra ngoài
window.addEventListener('click', () => {
    if(notiDropdown) notiDropdown.style.display = 'none';
});

function renderNotifications() {
    if(!notiDropdown) return;
    notiDropdown.innerHTML = `<div style="padding: 10px; font-weight: bold; border-bottom: 1px solid #333; color:#fff;">Notifications</div>`;
    
    if(notifications.length === 0) {
        notiDropdown.innerHTML += `<div style="padding:15px; color:#888; text-align:center;">No new notifications</div>`;
        return;
    }

    notifications.forEach(notif => {
        const item = document.createElement('div');
        item.className = 'notif-item';
        if(!notif.read) item.classList.add('unread');
        
        let icon = '<i class="fas fa-bell"></i>';
        if(notif.type === 'post') icon = '<i class="fas fa-newspaper" style="color:#3b82f6;"></i>';
        if(notif.type === 'friend') icon = '<i class="fas fa-user-plus" style="color:#0ecb81;"></i>';
        if(notif.type === 'system') icon = '<i class="fas fa-exclamation-triangle" style="color:#f0b90b;"></i>';

        item.innerHTML = `
            <div class="notif-icon">${icon}</div>
            <div class="notif-content">
                <div class="notif-text">${notif.text}</div>
                <div class="notif-time">${notif.time}</div>
            </div>
        `;
        notiDropdown.appendChild(item);
    });
}

// ============================================================
// 3. EDIT PROFILE & CROPPER LOGIC (ĐÃ SỬA)
// ============================================================
const editProfileBtn = document.getElementById('editProfileBtn');
const editProfileModal = document.getElementById('editProfileModal');
const closeEditModal = document.getElementById('closeEditModal');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const closeFriendModal = document.getElementById('closeFriendModal');

if(editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
        if(editProfileModal) editProfileModal.style.display = 'flex';
        document.getElementById('cropper-container').style.display = 'none';
        document.getElementById('edit-form-container').style.display = 'block';
        
        // Fill data
        const ids = ['editNameInput', 'editRoleInput', 'editIDInput', 'editEmailInput', 'editOrgInput', 'editLocInput', 'editDescInput'];
        const targets = ['profile-name-txt', 'profile-role-txt', 'profile-id-txt', 'profile-email-txt', 'profile-org-txt', 'profile-loc-txt', 'profile-desc-txt'];
        ids.forEach((id, i) => {
            const el = document.getElementById(id);
            const target = document.getElementById(targets[i]);
            if(el && target) el.value = target.innerText === "None" ? "" : target.innerText;
        });
    });
}

if(closeEditModal) closeEditModal.addEventListener('click', () => editProfileModal.style.display = 'none');
if(closeFriendModal) closeFriendModal.addEventListener('click', () => document.getElementById('viewFriendModal').style.display = 'none');

// --- CROPPER VARIABLES ---
let cropper;
let currentCropType = ''; 
const cropperImage = document.getElementById('cropper-image');
const editAvatarInput = document.getElementById('editAvatarInput');
const editCoverInput = document.getElementById('editCoverInput');
let tempAvatar = null;
let tempCover = null;

function initCropper(file, type) {
    const reader = new FileReader();
    reader.onload = (e) => {
        cropperImage.src = e.target.result;
        document.getElementById('edit-form-container').style.display = 'none';
        document.getElementById('cropper-container').style.display = 'flex';
        
        currentCropType = type;
        if(cropper) cropper.destroy();
        
        const aspectRatio = type === 'avatar' ? 1 : 3.5; // Tỉ lệ 3.5 cho ảnh bìa
        
        // Sử dụng window.Cropper để đảm bảo library đã load
        cropper = new window.Cropper(cropperImage, {
            aspectRatio: aspectRatio,
            viewMode: 1,
            autoCropArea: 1,
            background: false,
            zoomable: true,
            movable: true,
            ready: function () {
                // Fix lỗi cropper không hiện ngay
                this.cropper.crop(); 
            }
        });
    };
    reader.readAsDataURL(file);
}

if(editAvatarInput) editAvatarInput.addEventListener('change', (e) => {
    if(e.target.files && e.target.files[0]) {
        initCropper(e.target.files[0], 'avatar');
        e.target.value = ''; // Reset input để chọn lại file cũ nếu muốn
    }
});

if(editCoverInput) editCoverInput.addEventListener('change', (e) => {
    if(e.target.files && e.target.files[0]) {
        initCropper(e.target.files[0], 'cover');
        e.target.value = ''; 
    }
});

document.getElementById('crop-confirm-btn').addEventListener('click', () => {
    if(!cropper) return;
    const canvas = cropper.getCroppedCanvas({
        width: currentCropType === 'avatar' ? 300 : 1000,
        imageSmoothingQuality: 'high',
    });
    
    const result = canvas.toDataURL();
    
    if(currentCropType === 'avatar') {
        tempAvatar = result;
        alert("Avatar ready to save!");
    } else {
        tempCover = result;
        alert("Cover ready to save!");
    }
    
    document.getElementById('cropper-container').style.display = 'none';
    document.getElementById('edit-form-container').style.display = 'block';
    cropper.destroy();
    cropper = null;
});

document.getElementById('crop-cancel-btn').addEventListener('click', () => {
    document.getElementById('cropper-container').style.display = 'none';
    document.getElementById('edit-form-container').style.display = 'block';
    if(cropper) { cropper.destroy(); cropper = null; }
});

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
            avatar: tempAvatar || document.getElementById('profile-avatar-img').src,
            cover: tempCover || document.querySelector('.profile-cover').style.backgroundImage.replace(/^url\(['"](.+)['"]\)/, '$1')
        };

        saveAndUpdate(data);
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
    
    if(data.avatar) document.getElementById('profile-avatar-img').src = data.avatar;
    if(data.cover) document.querySelector('.profile-cover').style.backgroundImage = `url('${data.cover}')`;
}

// ============================================================
// NAV & SYSTEM (GIỮ NGUYÊN)
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

// ... (Logic khởi tạo chart và login giữ nguyên như cũ)
function initSystem() {
    const ctx = document.getElementById('mainChart');
    if(!ctx) return; 
    chart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: { labels: timeLabels, datasets: [{ label: 'Price', data: priceHistory, borderColor: '#0ecb81', tension: 0.2 }] },
        options: { responsive: true, maintainAspectRatio: false, animation: false, scales: { x: {display:false}, y: {position:'right', grid:{color:'#2b3139'}} } }
    });
    // Giả lập chạy
    setInterval(() => {
        let p = 69000 + Math.random()*100;
        document.getElementById('btcPrice').innerText = `$${p.toFixed(2)}`;
        if(chart) chart.update();
    }, 2000);
}
const mainBtn = document.getElementById('mainAuthBtn');
if(mainBtn) {
    mainBtn.addEventListener('click', () => {
        localStorage.setItem('stableCastUser', document.getElementById('email').value || "Guest");
        location.reload();
    });
}
