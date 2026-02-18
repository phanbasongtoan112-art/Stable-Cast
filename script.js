/* script.js */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. CẤU HÌNH GOOGLE (QUAN TRỌNG: ĐIỀN CLIENT ID CỦA BẠN VÀO ĐÂY)
    // =========================================================================
    // Ví dụ: "123456789-abcdef.apps.googleusercontent.com"
    const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE"; 

    // Các phần tử DOM (Giữ nguyên từ HTML của bạn)
    const loginOverlay = document.getElementById('loginOverlay');
    const mainApp = document.querySelector('.main-app-container');
    const authTitle = document.getElementById('authTitle');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const mainAuthBtn = document.getElementById('mainAuthBtn');
    const toggleAuthBtn = document.getElementById('toggleAuthBtn');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const loginMsg = document.getElementById('loginMsg'); // Div hiển thị lỗi

    let isRegisterMode = false;
    let tokenClient;

    // =========================================================================
    // 2. LOGIC GOOGLE POPUP (NÚT BẤM CỦA BẠN)
    // =========================================================================
    
    // Khởi tạo Client OAuth ngay khi vào trang (nếu ClientID hợp lệ)
    if (typeof google !== 'undefined' && CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID_HERE") {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: (response) => {
                if (response.access_token) {
                    fetchGoogleProfile(response.access_token);
                } else {
                    showMsg("Google Access Denied.", "error");
                }
            },
        });
    }

    // Sự kiện bấm nút Google
    googleLoginBtn.addEventListener('click', () => {
        if (CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID_HERE") {
            alert("Vui lòng điền GOOGLE CLIENT ID vào file script.js dòng số 8!");
            return;
        }
        // Lệnh này sẽ mở cửa sổ POPUP chọn tài khoản
        tokenClient.requestAccessToken();
    });

    // Hàm lấy thông tin sau khi đăng nhập Google thành công
    function fetchGoogleProfile(token) {
        googleLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> VERIFYING...';
        
        // Gọi API Google lấy Info
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            // Đăng nhập thành công -> Vào App
            performLogin({
                name: data.name,
                email: data.email,
                id: data.sub.substring(0, 10), // Lấy 1 phần ID
                avatar: data.picture,
                role: "Google User"
            });
        })
        .catch(err => {
            console.error(err);
            showMsg("Lỗi lấy dữ liệu Google.", "error");
            googleLoginBtn.innerHTML = '<i class="fab fa-google"></i> ACCESS WITH GOOGLE';
        });
    }


    // =========================================================================
    // 3. LOGIC ĐĂNG NHẬP / ĐĂNG KÝ THƯỜNG (NHƯ CŨ)
    // =========================================================================

    toggleAuthBtn.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        loginMsg.textContent = "";

        if (isRegisterMode) {
            authTitle.textContent = "SYSTEM REGISTER";
            mainAuthBtn.textContent = "REGISTER ACCESS";
            toggleAuthBtn.textContent = "ALREADY HAVE AN ACCOUNT? LOGIN";
            emailInput.placeholder = "ENTER NEW ID / EMAIL";
            authTitle.style.borderBottomColor = "#3b82f6";
        } else {
            authTitle.textContent = "SYSTEM LOGIN";
            mainAuthBtn.textContent = "LOGIN";
            toggleAuthBtn.textContent = "NEW OPERATOR? REGISTER ACCESS";
            emailInput.placeholder = "ENTER ID";
            authTitle.style.borderBottomColor = "#0ecb81";
        }
    });

    mainAuthBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        const password = passInput.value.trim();

        // 1. Guest Mode (Không nhập gì)
        if (!email && !password && !isRegisterMode) {
            performLogin({ name: "GUEST OPERATOR", id: "GUEST", email: "guest@stablecast.io", role: "Visitor" });
            return;
        }

        if (!email || !password) { showMsg("Please enter Credentials.", "error"); return; }

        // 2. Register
        if (isRegisterMode) {
            if (localStorage.getItem('user_' + email)) {
                showMsg("ID already exists!", "error");
            } else {
                const newUser = { email, password, name: "Operator " + Math.floor(Math.random()*1000), id: "OP-"+Date.now() };
                localStorage.setItem('user_' + email, JSON.stringify(newUser));
                showMsg("Registered! Login now.", "success");
                setTimeout(() => { toggleAuthBtn.click(); emailInput.value = email; passInput.value = ""; }, 1000);
            }
        } 
        // 3. Login thường
        else {
            if (email === "admin" && password === "123") {
                performLogin({ name: "ADMINISTRATOR", id: "DE200247", email: "toanpbs@fpt.edu.vn", role: "Lead Dev" });
                return;
            }
            const stored = localStorage.getItem('user_' + email);
            if (stored && JSON.parse(stored).password === password) {
                performLogin(JSON.parse(stored));
            } else {
                showMsg("Invalid Credentials.", "error");
            }
        }
    });

    // Enter để login
    passInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') mainAuthBtn.click(); });


    // =========================================================================
    // 4. CÁC HÀM UI & LOGIC SAU KHI LOGIN
    // =========================================================================

    function showMsg(text, type) {
        loginMsg.textContent = text;
        loginMsg.style.color = type === 'success' ? '#0ecb81' : '#f6465d';
    }

    function performLogin(userData) {
        loginMsg.style.color = "#0ecb81";
        loginMsg.textContent = "AUTHENTICATION SUCCESSFUL...";
        
        setTimeout(() => {
            loginOverlay.style.opacity = "0";
            setTimeout(() => {
                loginOverlay.style.display = "none";
                mainApp.style.display = "block";
                setTimeout(() => mainApp.style.opacity = "1", 50);
                
                // Cập nhật Profile
                document.getElementById('profile-name-txt').textContent = userData.name;
                document.getElementById('profile-id-txt').textContent = userData.id;
                document.getElementById('profile-email-txt').textContent = userData.email;
                if(userData.role) document.getElementById('profile-role-txt').textContent = userData.role;
                if(userData.avatar) document.getElementById('profile-avatar-img').src = userData.avatar;
                
                initDashboard();
            }, 500);
        }, 800);
    }

    function initDashboard() {
        // Tab logic
        const navBtns = document.querySelectorAll('.nav-btn');
        const views = document.querySelectorAll('.view-section');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                navBtns.forEach(b => b.classList.remove('active'));
                views.forEach(v => v.classList.remove('active-view'));
                btn.classList.add('active');
                if(btn.id === 'btn-terminal') document.getElementById('dashboard-view').classList.add('active-view');
                if(btn.id === 'btn-community') document.getElementById('community-view').classList.add('active-view');
                if(btn.id === 'btn-profile') document.getElementById('profile-view').classList.add('active-view');
            });
        });

        // Chart logic
        const ctx = document.getElementById('mainChart');
        if (ctx) {
            new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: Array.from({length:30},(_,i)=>i),
                    datasets: [{
                        data: Array.from({length:30},()=>40000+Math.random()*2000),
                        borderColor: '#0ecb81', borderWidth: 2, pointRadius: 0, tension: 0.4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: {legend: false}, scales: {x:{display:false},y:{display:false}} }
            });
            document.getElementById('btcPrice').innerText = "42,350.00";
            document.getElementById('predPrice').innerText = "42,800.00";
            document.getElementById('stopLoss').innerText = "41,500";
            document.getElementById('takeProfit').innerText = "43,200";
        }
    }
});
