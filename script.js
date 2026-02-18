/* script.js */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. CẤU HÌNH GOOGLE (BẮT BUỘC PHẢI THAY MÃ CLIENT ID CỦA BẠN VÀO DƯỚI)
    // =========================================================================
    // Ví dụ: "123456789-abcdefghijk.apps.googleusercontent.com"
    const YOUR_GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID_HERE"; 

    // --- KHAI BÁO CÁC PHẦN TỬ DOM ---
    const loginOverlay = document.getElementById('loginOverlay');
    const mainApp = document.querySelector('.main-app-container');
    const authTitle = document.getElementById('authTitle');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const mainAuthBtn = document.getElementById('mainAuthBtn');
    const toggleAuthBtn = document.getElementById('toggleAuthBtn');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const loginMsg = document.getElementById('loginMsg'); 

    let isRegisterMode = false;
    let tokenClient; // Biến lưu client Google

    // =========================================================================
    // 2. TỰ ĐỘNG TẢI THƯ VIỆN GOOGLE (DO KHÔNG ĐƯỢC SỬA HTML)
    // =========================================================================
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogleClient; // Tải xong thì khởi tạo
    document.body.appendChild(script);

    // Hàm khởi tạo Google Client
    function initGoogleClient() {
        if (typeof google === 'undefined') return;

        // Cấu hình OAuth 2.0 Token Client (Dùng cho nút bấm custom)
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: YOUR_GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: (response) => {
                if (response.access_token) {
                    // Đăng nhập thành công -> Gọi API lấy thông tin User
                    fetchGoogleUserInfo(response.access_token);
                } else {
                    showMsg("Google Login Failed.", "error");
                }
            },
        });

        // Gán sự kiện click cho nút Google sau khi thư viện tải xong
        googleLoginBtn.onclick = () => {
            if (YOUR_GOOGLE_CLIENT_ID === "YOUR_CLIENT_ID_HERE") {
                alert("Bạn chưa nhập GOOGLE CLIENT ID vào file script.js!");
                return;
            }
            // Mở Popup chọn tài khoản Google
            tokenClient.requestAccessToken();
        };
    }

    // Hàm lấy thông tin User từ Google bằng Access Token
    function fetchGoogleUserInfo(accessToken) {
        googleLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> VERIFYING...';
        
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
        .then(response => response.json())
        .then(data => {
            // Dữ liệu Google trả về thật: data.name, data.picture, data.email
            const user = {
                name: data.name,
                email: data.email,
                avatar: data.picture,
                id: data.sub,
                role: "Google Verified"
            };
            performLogin(user); // Đăng nhập vào app
        })
        .catch(err => {
            console.error(err);
            showMsg("Error fetching Google data.", "error");
            googleLoginBtn.innerHTML = '<i class="fab fa-google"></i> ACCESS WITH GOOGLE';
        });
    }


    // =========================================================================
    // 3. LOGIC ĐĂNG NHẬP / ĐĂNG KÝ THƯỜNG (GIỮ NGUYÊN NHƯ CŨ)
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

        // Guest Mode
        if (!email && !password && !isRegisterMode) {
            performLogin({ name: "GUEST OPERATOR", id: "GUEST", email: "guest@stablecast.io" });
            return;
        }
        if (!email || !password) { showMsg("Please enter Credentials.", "error"); return; }

        if (isRegisterMode) {
            // Register
            if (localStorage.getItem('user_' + email)) {
                showMsg("ID exists!", "error");
            } else {
                const newUser = { email, password, name: "Operator " + Math.floor(Math.random()*1000), id: "OP-"+Date.now() };
                localStorage.setItem('user_' + email, JSON.stringify(newUser));
                showMsg("Registered! Login now.", "success");
                setTimeout(() => { toggleAuthBtn.click(); emailInput.value = email; passInput.value = ""; }, 1000);
            }
        } else {
            // Login
            if (email === "admin" && password === "123") {
                performLogin({ name: "ADMINISTRATOR", id: "ADMIN", email: "admin@sys.com" });
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

    passInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') mainAuthBtn.click(); });


    // =========================================================================
    // 4. CÁC HÀM HỖ TRỢ GIAO DIỆN
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
                
                // Cập nhật Profile thật từ Google hoặc Guest
                document.getElementById('profile-name-txt').textContent = userData.name;
                document.getElementById('profile-id-txt').textContent = userData.id;
                document.getElementById('profile-email-txt').textContent = userData.email;
                if(userData.avatar) document.getElementById('profile-avatar-img').src = userData.avatar;
                
                initDashboard();
            }, 500);
        }, 800);
    }

    function initDashboard() {
        // Tab switching
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

        // Chart Init
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
