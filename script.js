// ==================== CONFIG & VARIABLES ====================
let user = {
    name: "Guest",
    id: "DE200247",
    role: "Trader",
    avatar: "https://cdn-icons-png.flaticon.com/512/11498/11498793.png",
    cover: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1600&q=80",
    email: "student@fpt.edu.vn",
    org: "FPT University",
    loc: "Da Nang, VN",
    desc: "AI driven crypto analyst."
};

// Friends Data (0: Add, 1: Requested, 2: Friend)
let friends = [
    { id: 1, name: "Nguyễn Quốc Đạt", role: "Backend Dev", status: 0, mutual: 12, avatar: "https://i.pravatar.cc/150?u=1", cover: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500", desc: "Expert in Node.js & Microservices." },
    { id: 2, name: "Trần Thái Sơn", role: "AI Researcher", status: 0, mutual: 8, avatar: "https://i.pravatar.cc/150?u=2", cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500", desc: "Building next-gen trading algos." },
    { id: 3, name: "Lê Minh Quân", role: "Data Analyst", status: 0, mutual: 15, avatar: "https://i.pravatar.cc/150?u=3", cover: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500", desc: "Converting data into profit." },
    { id: 4, name: "Phạm Gia Huy", role: "Security Ops", status: 0, mutual: 5, avatar: "https://i.pravatar.cc/150?u=4", cover: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500", desc: "Keeping the terminal secure." },
    { id: 5, name: "Nguyễn Văn Tân", role: "Frontend Dev", status: 0, mutual: 20, avatar: "https://i.pravatar.cc/150?u=5", cover: "https://images.unsplash.com/photo-1550439062-609e1531270e?w=500", desc: "Pixel perfect interfaces." },
    { id: 6, name: "Đỗ Thu Hiền", role: "Designer", status: 0, mutual: 32, avatar: "https://i.pravatar.cc/150?u=9", cover: "https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=500", desc: "UI/UX Specialist." }
];

let notifications = [
    { text: "System ready. Welcome back.", time: "Just now", read: false },
    { text: "Market volatility high.", time: "10m ago", read: false }
];

let chart;
let priceHistory = [];
let timeLabels = [];
let cropper;
let currentCropType = null;
let tempAvatar = null;
let tempCover = null;

// ==================== INIT & LOGIN ====================
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('stableUser');
    if (savedUser) {
        user = JSON.parse(savedUser);
        initApp();
    } else {
        document.getElementById('loginOverlay').style.display = 'flex';
    }
});

document.getElementById('mainAuthBtn').addEventListener('click', () => {
    const emailInput = document.getElementById('email').value;
    if(emailInput) user.name = emailInput;
    localStorage.setItem('stableUser', JSON.stringify(user));
    initApp();
});

function initApp() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.querySelector('.main-app-container').style.display = 'block';
    
    renderProfile();
    renderFriends();
    initChart();
    startSimulation();
    renderNotifications();
    setupNavigation();
}

// ==================== NAVIGATION ====================
function setupNavigation() {
    const tabs = {
        'btn-terminal': 'dashboard-view',
        'btn-community': 'community-view',
        'btn-profile': 'profile-view'
    };

    Object.keys(tabs).forEach(btnId => {
        document.getElementById(btnId).addEventListener('click', function() {
            // Remove active
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active-view'));
            
            // Set active
            this.classList.add('active');
            document.getElementById(tabs[btnId]).classList.add('active-view');
        });
    });

    // Notifications
    const notiBtn = document.getElementById('btn-notifications');
    const notiDrop = document.getElementById('notificationDropdown');
    notiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notiDrop.style.display = notiDrop.style.display === 'block' ? 'none' : 'block';
    });
    window.addEventListener('click', () => notiDrop.style.display = 'none');
}

// ==================== PROFILE LOGIC ====================
function renderProfile() {
    // Header
    document.getElementById('profile-name-txt').innerText = user.name;
    document.getElementById('profile-role-txt').innerText = user.role;
    document.getElementById('profile-avatar-img').src = user.avatar;
    document.querySelector('.profile-cover').style.backgroundImage = `url('${user.cover}')`;
    
    // Details
    document.getElementById('profile-id-txt').innerText = user.id;
    document.getElementById('profile-email-txt').innerText = user.email;
    document.getElementById('profile-org-txt').innerText = user.org;
    document.getElementById('profile-loc-txt').innerText = user.loc;
    document.getElementById('profile-desc-txt').innerText = user.desc;
}

// Edit Modal Logic
const editModal = document.getElementById('editProfileModal');
document.getElementById('editProfileBtn').addEventListener('click', () => {
    editModal.style.display = 'flex';
    document.getElementById('edit-form-container').style.display = 'block';
    document.getElementById('cropper-container').style.display = 'none';
    
    // Fill inputs
    document.getElementById('editNameInput').value = user.name;
    document.getElementById('editRoleInput').value = user.role;
    document.getElementById('editIDInput').value = user.id;
    document.getElementById('editEmailInput').value = user.email;
    document.getElementById('editOrgInput').value = user.org;
    document.getElementById('editLocInput').value = user.loc;
    document.getElementById('editDescInput').value = user.desc;
});

document.getElementById('closeEditModal').addEventListener('click', () => editModal.style.display = 'none');

// Save Profile
document.getElementById('saveProfileBtn').addEventListener('click', () => {
    user.name = document.getElementById('editNameInput').value || user.name;
    user.role = document.getElementById('editRoleInput').value || user.role;
    user.id = document.getElementById('editIDInput').value || user.id;
    user.email = document.getElementById('editEmailInput').value || user.email;
    user.org = document.getElementById('editOrgInput').value || user.org;
    user.loc = document.getElementById('editLocInput').value || user.loc;
    user.desc = document.getElementById('editDescInput').value || user.desc;
    
    if(tempAvatar) user.avatar = tempAvatar;
    if(tempCover) user.cover = tempCover;

    localStorage.setItem('stableUser', JSON.stringify(user));
    renderProfile();
    editModal.style.display = 'none';
    
    // Reset temps
    tempAvatar = null;
    tempCover = null;
});

// ==================== CROPPER LOGIC ====================
const cropImg = document.getElementById('cropper-image');

function handleFileSelect(input, type) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            cropImg.src = e.target.result;
            document.getElementById('edit-form-container').style.display = 'none';
            document.getElementById('edit-footer').style.display = 'none';
            document.getElementById('cropper-container').style.display = 'flex';
            currentCropType = type;
            
            if(cropper) cropper.destroy();
            cropper = new Cropper(cropImg, {
                aspectRatio: type === 'avatar' ? 1 : 3.5,
                viewMode: 1
            });
        };
        reader.readAsDataURL(input.files[0]);
    }
    input.value = ''; // Reset
}

document.getElementById('editAvatarInput').addEventListener('change', function() { handleFileSelect(this, 'avatar'); });
document.getElementById('editCoverInput').addEventListener('change', function() { handleFileSelect(this, 'cover'); });

document.getElementById('crop-confirm-btn').addEventListener('click', () => {
    if(!cropper) return;
    const canvas = cropper.getCroppedCanvas({ width: currentCropType === 'avatar' ? 300 : 1000 });
    const result = canvas.toDataURL();

    if(currentCropType === 'avatar') {
        tempAvatar = result;
        document.getElementById('profile-avatar-img').src = result; // Preview
    } else {
        tempCover = result;
        document.querySelector('.profile-cover').style.backgroundImage = `url('${result}')`; // Preview
    }

    // Close crop view
    cropper.destroy();
    cropper = null;
    document.getElementById('cropper-container').style.display = 'none';
    document.getElementById('edit-form-container').style.display = 'block';
    document.getElementById('edit-footer').style.display = 'block';
});

document.getElementById('crop-cancel-btn').addEventListener('click', () => {
    if(cropper) { cropper.destroy(); cropper = null; }
    document.getElementById('cropper-container').style.display = 'none';
    document.getElementById('edit-form-container').style.display = 'block';
    document.getElementById('edit-footer').style.display = 'block';
});

// ==================== FRIENDS LOGIC ====================
function renderFriends() {
    const container = document.getElementById('friendGridContainer');
    container.innerHTML = '';
    
    friends.forEach((f, idx) => {
        const div = document.createElement('div');
        div.className = 'friend-card';
        
        let btnHTML = '';
        if(f.status === 0) btnHTML = `<button class="friend-btn btn-add" onclick="toggleFriend(${idx})"><i class="fas fa-user-plus"></i> Add</button>`;
        else if(f.status === 1) btnHTML = `<button class="friend-btn btn-sent"><i class="fas fa-clock"></i> Sent</button>`;
        else btnHTML = `<button class="friend-btn btn-friend"><i class="fas fa-check"></i> Friend</button>`;

        div.innerHTML = `
            <img src="${f.avatar}" class="friend-card-img" onclick="viewFriend(${idx})" style="cursor:pointer">
            <div style="flex:1; cursor:pointer;" onclick="viewFriend(${idx})">
                <div class="friend-card-name">${f.name}</div>
                <div class="friend-card-role">${f.role}</div>
            </div>
            ${btnHTML}
        `;
        container.appendChild(div);
    });

    document.getElementById('friendCountDisplay').innerText = `(${friends.filter(f => f.status === 2).length})`;
}

window.toggleFriend = (index) => {
    const f = friends[index];
    if(f.status === 0) {
        f.status = 1; // Sent
        setTimeout(() => {
            f.status = 2; // Accepted simulation
            addNotification(`${f.name} accepted your request.`);
            renderFriends();
        }, 2000);
    }
    renderFriends();
};

window.viewFriend = (index) => {
    const f = friends[index];
    document.getElementById('friend-modal-cover').style.backgroundImage = `url('${f.cover}')`;
    document.getElementById('friend-modal-avatar').src = f.avatar;
    document.getElementById('friend-modal-name').innerText = f.name;
    document.getElementById('friend-modal-role').innerText = f.role;
    document.getElementById('friend-modal-desc').innerText = f.desc;
    document.getElementById('friend-modal-mutual').innerText = f.mutual;
    document.getElementById('viewFriendModal').style.display = 'flex';
};

document.getElementById('closeFriendModal').addEventListener('click', () => {
    document.getElementById('viewFriendModal').style.display = 'none';
});

// ==================== CHART & SIMULATION ====================
function initChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'BTC/USDT',
                data: priceHistory,
                borderColor: '#0ecb81',
                borderWidth: 2,
                backgroundColor: 'rgba(14, 203, 129, 0.05)',
                fill: true,
                tension: 0.1,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { position: 'right', grid: { color: '#2b3139' }, ticks: { color: '#888' } }
            },
            animation: false
        }
    });
}

function startSimulation() {
    let currentPrice = 68000;
    
    // Initial Data
    for(let i=0; i<50; i++) {
        timeLabels.push('');
        priceHistory.push(currentPrice);
    }
    chart.update();

    setInterval(() => {
        // Price Randomizer
        let change = (Math.random() - 0.5) * 50;
        currentPrice += change;
        
        // Update Chart
        priceHistory.push(currentPrice);
        timeLabels.push('');
        if(priceHistory.length > 50) {
            priceHistory.shift();
            timeLabels.shift();
        }
        chart.update();
        
        // Update UI
        document.getElementById('btcPrice').innerText = currentPrice.toFixed(2);
        document.getElementById('btcPrice').style.color = change >= 0 ? '#0ecb81' : '#f6465d';
        
        // Update Pred
        const pred = currentPrice + (Math.random() - 0.5) * 100;
        document.getElementById('predPrice').innerText = pred.toFixed(2);
        
        // Update Logs
        const log = document.createElement('div');
        log.className = 'log-entry';
        const time = new Date().toLocaleTimeString();
        log.innerHTML = `<span class="log-time">[${time}]</span> Price update: ${currentPrice.toFixed(2)}`;
        const logCont = document.getElementById('terminalLogs');
        logCont.prepend(log);
        if(logCont.children.length > 20) logCont.lastChild.remove();
        
    }, 1000);
}

// ==================== NOTIFICATIONS ====================
function renderNotifications() {
    const container = document.getElementById('notificationDropdown');
    container.innerHTML = '<div style="padding:10px; color:#fff; border-bottom:1px solid #333; font-weight:bold;">Notifications</div>';
    
    notifications.forEach(n => {
        const div = document.createElement('div');
        div.className = `notif-item ${n.read ? '' : 'unread'}`;
        div.innerHTML = `
            <i class="fas fa-bell" style="color:${n.read ? '#888' : '#0ecb81'}"></i>
            <div>
                <div class="notif-text">${n.text}</div>
                <div class="notif-time">${n.time}</div>
            </div>
        `;
        container.appendChild(div);
    });
    
    // Badge
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('noti-badge');
    if(unreadCount > 0) {
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

function addNotification(text) {
    notifications.unshift({ text: text, time: "Just now", read: false });
    renderNotifications();
}
