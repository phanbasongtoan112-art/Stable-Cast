// ==================== CẤU HÌNH DỮ LIỆU (MOCK DATA) ====================
let currentUser = {
    name: "Phan Bá Song Toàn",
    id: "DE200247",
    role: "AI Engineer",
    email: "toanpbs@fpt.edu.vn",
    org: "FPT University",
    location: "Da Nang, Vietnam",
    bio: "StableCast is an advanced AI-powered cryptocurrency price prediction terminal built by FPT University students.",
    avatar: "https://cdn-icons-png.flaticon.com/512/11498/11498793.png",
    cover: "https://png.pngtree.com/background/20210714/original/pngtree-abstract-technology-background-technical-presentation-picture-image_1252549.jpg",
    stats: { friends: 12, reputation: 98 }
};

const friendList = [
    { name: "Nguyễn Quốc Đạt", role: "Backend Dev", avatar: "https://i.pravatar.cc/150?u=1", cover: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500", mutual: 12, desc: "Expert in Node.js & Microservices." },
    { name: "Trần Thái Sơn", role: "AI Researcher", avatar: "https://i.pravatar.cc/150?u=2", cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500", mutual: 8, desc: "Deep Learning Specialist." },
    { name: "Lê Minh Quân", role: "Data Analyst", avatar: "https://i.pravatar.cc/150?u=3", cover: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500", mutual: 15, desc: "Data to Profit." },
    { name: "Phạm Gia Huy", role: "Security Ops", avatar: "https://i.pravatar.cc/150?u=4", cover: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500", mutual: 5, desc: "Cyber Security." },
    { name: "Nguyễn Văn Tân", role: "Frontend Dev", avatar: "https://i.pravatar.cc/150?u=5", cover: "https://images.unsplash.com/photo-1550439062-609e1531270e?w=500", mutual: 20, desc: "UI/UX Expert." },
    { name: "Đỗ Thu Hiền", role: "Designer", avatar: "https://i.pravatar.cc/150?u=9", cover: "https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=500", mutual: 32, desc: "Visual Artist." }
];

// Từ điển ngôn ngữ
const i18n = {
    en: {
        nav_terminal: "TERMINAL", nav_community: "COMMUNITY", nav_profile: "PROFILE",
        ai_pred: "AI PREDICTION (NEXT 1H)", confidence: "Confidence:", sys_logs: "SYSTEM LOGS",
        post_btn: "POST", edit_profile: "Edit Profile", identity: "IDENTITY", friends_list: "FRIENDS LIST",
        settings_title: "SETTINGS", appearance: "APPEARANCE", theme_mode: "Light/Dark Mode",
        primary_color: "Primary Color", language: "LANGUAGE", messages: "Messages"
    },
    vi: {
        nav_terminal: "GIAO DỊCH", nav_community: "CỘNG ĐỒNG", nav_profile: "HỒ SƠ",
        ai_pred: "DỰ ĐOÁN AI (1H TỚI)", confidence: "Độ tin cậy:", sys_logs: "NHẬT KÝ HỆ THỐNG",
        post_btn: "ĐĂNG", edit_profile: "Sửa Hồ Sơ", identity: "THÔNG TIN", friends_list: "DANH SÁCH BẠN",
        settings_title: "CÀI ĐẶT", appearance: "GIAO DIỆN", theme_mode: "Chế độ Sáng/Tối",
        primary_color: "Màu Chủ Đạo", language: "NGÔN NGỮ", messages: "Tin nhắn"
    },
    ja: {
        nav_terminal: "ターミナル", nav_community: "コミュニティ", nav_profile: "プロフィール",
        ai_pred: "AI予測 (次の1時間)", confidence: "信頼度:", sys_logs: "システムログ",
        post_btn: "投稿", edit_profile: "プロフィール編集", identity: "身元情報", friends_list: "友達リスト",
        settings_title: "設定", appearance: "外観", theme_mode: "ライト/ダークモード",
        primary_color: "メインカラー", language: "言語", messages: "メッセージ"
    },
    ko: {
        nav_terminal: "터미널", nav_community: "커뮤니티", nav_profile: "프로필",
        ai_pred: "AI 예측 (다음 1시간)", confidence: "신뢰도:", sys_logs: "시스템 로그",
        post_btn: "게시", edit_profile: "프로필 수정", identity: "신원 정보", friends_list: "친구 목록",
        settings_title: "설정", appearance: "외관", theme_mode: "라이트/다크 모드",
        primary_color: "기본 색상", language: "언어", messages: "메시지"
    }
};

let chartInstance;
let priceHistory = [];
let timeLabels = [];
let currentPrice = 69000;
let cropperInstance;

// ==================== 1. KHỞI CHẠY & XỬ LÝ LOGIN (FIXED) ====================
document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra trạng thái đăng nhập
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (isLoggedIn) {
        // Đã đăng nhập -> Vào thẳng app
        launchApp();
    } else {
        // Chưa đăng nhập -> Hiện Login Overlay
        document.getElementById('loginOverlay').style.display = 'flex';
    }

    // GẮN SỰ KIỆN NÚT LOGIN (FIXED)
    const loginBtn = document.getElementById('mainAuthBtn');
    if(loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }

    // GẮN SỰ KIỆN NÚT GOOGLE (FIXED)
    const googleBtn = document.getElementById('googleLoginBtn');
    if(googleBtn) {
        googleBtn.addEventListener('click', () => {
            // Giả lập login Google thành công
            currentUser.name = "Google User";
            handleLogin();
        });
    }

    // Enter cũng login được
    document.getElementById('password')?.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') handleLogin();
    });
    
    // Khởi tạo các thành phần khác
    setupNavigation();
    setupSettings();
    setupChatSystem();
});

// Hàm xử lý đăng nhập
function handleLogin() {
    const emailInput = document.getElementById('email');
    const btn = document.getElementById('mainAuthBtn');
    
    // Hiệu ứng loading
    const originalText = btn.innerText;
    btn.innerText = "VERIFYING...";
    btn.style.opacity = "0.7";

    setTimeout(() => {
        if (emailInput && emailInput.value.trim() !== "") {
            currentUser.name = emailInput.value;
            localStorage.setItem('stableCastUser', currentUser.name);
        }
        
        localStorage.setItem('isLoggedIn', 'true');
        
        // Chuyển cảnh
        btn.innerText = "SUCCESS";
        btn.style.backgroundColor = "#0ecb81";
        
        setTimeout(() => {
            launchApp();
        }, 500);
    }, 800); // Delay giả lập 0.8s
}

// Hàm khởi động App chính
function launchApp() {
    const overlay = document.getElementById('loginOverlay');
    const mainApp = document.querySelector('.main-app-container');
    
    // Ẩn login
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 500);
    
    // Hiện app
    mainApp.style.display = 'block';
    setTimeout(() => { mainApp.style.opacity = '1'; }, 50);

    // Load dữ liệu
    loadProfileData();
    renderFriendGrid();
    initChart();
    startSimulation();
    
    // Log hệ thống
    addLog(`System Initialized. Welcome Operator ${currentUser.name}.`);
}

// ==================== 2. PROFILE & FRIENDS ====================
function loadProfileData() {
    const savedName = localStorage.getItem('stableCastUser');
    if (savedName) currentUser.name = savedName;

    setText('profile-name-txt', currentUser.name);
    setText('profile-role-txt', currentUser.role);
    setText('profile-id-txt', currentUser.id);
    setText('profile-email-txt', currentUser.email);
    setText('profile-org-txt', currentUser.org);
    setText('profile-desc-txt', currentUser.bio);
    
    document.getElementById('profile-avatar-img').src = currentUser.avatar;
    document.querySelector('.profile-cover').style.backgroundImage = `url('${currentUser.cover}')`;
}

function setText(id, val) {
    const el = document.getElementById(id);
    if(el) el.innerText = val;
}

function renderFriendGrid() {
    const container = document.getElementById('friendGridContainer');
    container.innerHTML = "";
    
    friendList.forEach((f, idx) => {
        const div = document.createElement('div');
        div.className = "friend-card";
        div.onclick = (e) => { if(!e.target.closest('.friend-add-btn')) showFriendModal(idx); };
        
        div.innerHTML = `
            <img src="${f.avatar}" class="friend-card-img">
            <div class="friend-card-info">
                <div class="friend-name">${f.name}</div>
                <div class="friend-role">${f.role}</div>
                <div class="friend-mutual">${f.mutual} mutual</div>
            </div>
            <button class="friend-add-btn"><i class="fas fa-comment"></i></button>
        `;
        container.appendChild(div);
    });
    
    document.getElementById('friendCountDisplay').innerText = `(${friendList.length})`;
}

function showFriendModal(index) {
    const f = friendList[index];
    const modal = document.getElementById('viewFriendModal');
    
    document.getElementById('friend-modal-avatar').src = f.avatar;
    document.getElementById('friend-modal-cover').style.backgroundImage = `url('${f.cover}')`;
    document.getElementById('friend-modal-name').innerText = f.name;
    document.getElementById('friend-modal-role').innerText = f.role;
    document.getElementById('friend-modal-desc').innerText = f.desc;
    document.getElementById('friend-modal-mutual').innerText = f.mutual;
    
    modal.style.display = 'flex';
}
document.getElementById('closeFriendModal').addEventListener('click', () => document.getElementById('viewFriendModal').style.display = 'none');

// ==================== 3. EDIT PROFILE & CROPPER ====================
const editModal = document.getElementById('editProfileModal');
document.getElementById('editProfileBtn').addEventListener('click', () => {
    editModal.style.display = 'flex';
    document.getElementById('edit-form-container').style.display = 'block';
    document.getElementById('cropper-container').style.display = 'none';
    
    document.getElementById('editNameInput').value = currentUser.name;
    document.getElementById('editRoleInput').value = currentUser.role;
    document.getElementById('editIDInput').value = currentUser.id;
    document.getElementById('editOrgInput').value = currentUser.org;
    document.getElementById('editDescInput').value = currentUser.bio;
});
document.getElementById('closeEditModal').addEventListener('click', () => editModal.style.display = 'none');

document.getElementById('saveProfileBtn').addEventListener('click', () => {
    currentUser.name = document.getElementById('editNameInput').value;
    currentUser.role = document.getElementById('editRoleInput').value;
    currentUser.id = document.getElementById('editIDInput').value;
    currentUser.org = document.getElementById('editOrgInput').value;
    currentUser.bio = document.getElementById('editDescInput').value;
    
    localStorage.setItem('stableCastUser', currentUser.name);
    loadProfileData();
    editModal.style.display = 'none';
    addLog("Profile updated successfully.");
});

const handleFile = (input) => {
    if(input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('cropper-image');
            img.src = e.target.result;
            document.getElementById('edit-form-container').style.display = 'none';
            document.getElementById('cropper-container').style.display = 'flex';
            if(cropperInstance) cropperInstance.destroy();
            cropperInstance = new Cropper(img, { aspectRatio: 1 });
        };
        reader.readAsDataURL(input.files[0]);
    }
};
document.getElementById('editAvatarInput').addEventListener('change', function() { handleFile(this); });
document.getElementById('crop-confirm-btn').addEventListener('click', () => {
    if(cropperInstance) {
        currentUser.avatar = cropperInstance.getCroppedCanvas().toDataURL();
        loadProfileData();
        cropperInstance.destroy();
        document.getElementById('cropper-container').style.display = 'none';
        document.getElementById('edit-form-container').style.display = 'block';
    }
});
document.getElementById('crop-cancel-btn').addEventListener('click', () => {
    if(cropperInstance) cropperInstance.destroy();
    document.getElementById('cropper-container').style.display = 'none';
    document.getElementById('edit-form-container').style.display = 'block';
});

// ==================== 4. SETTINGS & NAV ====================
function setupNavigation() {
    const tabs = { 'btn-terminal': 'dashboard-view', 'btn-community': 'community-view', 'btn-profile': 'profile-view' };
    for (const [btn, view] of Object.entries(tabs)) {
        document.getElementById(btn).addEventListener('click', function() {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active-view'));
            this.classList.add('active');
            document.getElementById(view).classList.add('active-view');
        });
    }
    
    const notiBtn = document.getElementById('btn-notifications');
    const notiDrop = document.getElementById('notificationDropdown');
    notiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notiDrop.style.display = notiDrop.style.display === 'block' ? 'none' : 'block';
    });
    window.addEventListener('click', () => notiDrop.style.display = 'none');
}

function setupSettings() {
    const modal = document.getElementById('settingsModal');
    document.getElementById('btn-settings').addEventListener('click', () => modal.style.display = 'flex');
    document.getElementById('closeSettingsModal').addEventListener('click', () => modal.style.display = 'none');
    
    document.getElementById('themeToggle').addEventListener('change', (e) => {
        document.body.classList.toggle('light-mode', e.target.checked);
    });
    
    document.getElementById('langSelect').addEventListener('change', (e) => {
        const lang = e.target.value;
        const dict = i18n[lang];
        if(dict) {
            document.querySelectorAll('[data-lang]').forEach(el => {
                const key = el.getAttribute('data-lang');
                if(dict[key]) el.innerText = dict[key];
            });
        }
    });
}
window.changeColor = function(c) {
    document.documentElement.style.setProperty('--primary-color', c);
    if(chartInstance) {
        chartInstance.data.datasets[0].borderColor = c;
        chartInstance.update();
    }
}

// ==================== 5. CHAT SYSTEM ====================
function setupChatSystem() {
    const chat = document.getElementById('chatSystemOverlay');
    document.getElementById('openChatBtn').addEventListener('click', () => chat.style.display = 'flex');
    document.getElementById('closeChatBtn').addEventListener('click', () => chat.style.display = 'none');
    
    const send = () => {
        const input = document.getElementById('msgInput');
        const text = input.value.trim();
        if(text) {
            addMsg(text, 'msg-out');
            input.value = '';
            setTimeout(() => {
                let reply = "I'm analyzing the market data...";
                if(text.match(/hello/i)) reply = `Hello Operator ${currentUser.name}.`;
                if(text.match(/price/i)) reply = `BTC is currently $${currentPrice.toFixed(2)}.`;
                addMsg(reply, 'msg-in');
            }, 1000);
        }
    };
    document.getElementById('sendMsgBtn').addEventListener('click', send);
    document.getElementById('msgInput').addEventListener('keypress', (e) => { if(e.key === 'Enter') send(); });
}

function addMsg(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = `${text}<div class="msg-time">${new Date().toLocaleTimeString()}</div>`;
    const cont = document.getElementById('chatContainer');
    cont.appendChild(div);
    cont.scrollTop = cont.scrollHeight;
}

// ==================== 6. CHART & SIMULATION ====================
function initChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    const grad = ctx.createLinearGradient(0,0,0,400);
    grad.addColorStop(0, 'rgba(14,203,129,0.2)');
    grad.addColorStop(1, 'rgba(14,203,129,0)');
    
    for(let i=0; i<60; i++) { timeLabels.push(''); priceHistory.push(currentPrice); }
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: timeLabels, datasets: [{ data: priceHistory, borderColor: '#0ecb81', backgroundColor: grad, borderWidth: 2, fill: true, pointRadius: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: {display:false}, y: {position:'right', grid:{color:'#2b3139'}} }, plugins:{legend:{display:false}}, animation: false }
    });
}

function startSimulation() {
    setInterval(() => {
        let change = (Math.random() - 0.5) * 50;
        currentPrice += change;
        
        priceHistory.push(currentPrice);
        timeLabels.push('');
        if(priceHistory.length > 60) { priceHistory.shift(); timeLabels.shift(); }
        
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        chartInstance.data.datasets[0].borderColor = color;
        chartInstance.update();
        
        document.getElementById('btcPrice').innerText = `$${currentPrice.toFixed(2)}`;
        document.getElementById('btcPrice').style.color = change >= 0 ? color : '#f6465d';
        document.getElementById('predPrice').innerText = `$${(currentPrice + Math.random()*100).toFixed(2)}`;
        
        if(Math.random() > 0.8) addLog(`Price Update: ${currentPrice.toFixed(2)}`);
    }, 1000);
}

function addLog(msg) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
    div.innerHTML = `<span class="log-time" style="color:${color}">[${new Date().toLocaleTimeString()}]</span> ${msg}`;
    document.getElementById('terminalLogs').prepend(div);
}
