/* script.js */

// --- CẤU HÌNH ---
// Link đăng nhập Google thật (Bạn có thể thay bằng link xác thực của dự án)
const GOOGLE_AUTH_URL = "https://accounts.google.com/signin/v2/identifier?flowName=GlifWebSignIn&flowEntry=ServiceLogin";

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. KHAI BÁO CÁC PHẦN TỬ (Lấy đúng ID từ HTML của bạn) ---
    const loginOverlay = document.getElementById('loginOverlay');
    const mainApp = document.querySelector('.main-app-container');
    
    // Form Elements
    const authTitle = document.getElementById('authTitle');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const mainAuthBtn = document.getElementById('mainAuthBtn');
    const toggleAuthBtn = document.getElementById('toggleAuthBtn');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const loginMsg = document.getElementById('loginMsg'); // Div thông báo có sẵn

    // Biến trạng thái: False = Đang ở màn hình Login, True = Đang ở màn hình Register
    let isRegisterMode = false;

    // --- 2. XỬ LÝ CHUYỂN ĐỔI LOGIN <-> REGISTER ---
    toggleAuthBtn.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        loginMsg.textContent = ""; // Xóa thông báo lỗi cũ
        loginMsg.style.color = "#888";

        if (isRegisterMode) {
            // Chế độ Đăng Ký
            authTitle.textContent = "SYSTEM REGISTER";
            mainAuthBtn.textContent = "REGISTER ACCESS";
            toggleAuthBtn.textContent = "ALREADY HAVE AN ACCOUNT? LOGIN";
            emailInput.placeholder = "ENTER NEW ID / EMAIL";
            authTitle.style.borderBottomColor = "#3b82f6"; // Màu xanh dương
        } else {
            // Chế độ Đăng Nhập
            authTitle.textContent = "SYSTEM LOGIN";
            mainAuthBtn.textContent = "LOGIN";
            toggleAuthBtn.textContent = "NEW OPERATOR? REGISTER ACCESS";
            emailInput.placeholder = "ENTER ID";
            authTitle.style.borderBottomColor = "#0ecb81"; // Màu xanh lá
        }
    });

    // --- 3. XỬ LÝ SỰ KIỆN NÚT MAIN (LOGIN HOẶC REGISTER) ---
    mainAuthBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        const password = passInput.value.trim();

        // >>> TRƯỜNG HỢP 1: ĐĂNG NHẬP KHÁCH (Không nhập gì cả) <<<
        if (!email && !password && !isRegisterMode) {
            performLogin({
                name: "GUEST OPERATOR",
                id: "GUEST-MODE",
                email: "guest@stablecast.io",
                role: "Visitor"
            });
            return;
        }

        // Validate cơ bản
        if (!email || !password) {
            showMsg("Please enter Email/ID and Passcode.", "error");
            return;
        }

        // >>> TRƯỜNG HỢP 2: ĐĂNG KÝ (REGISTER) <<<
        if (isRegisterMode) {
            // Kiểm tra xem tài khoản đã tồn tại trong localStorage chưa
            if (localStorage.getItem('user_' + email)) {
                showMsg("Operator ID already exists!", "error");
            } else {
                // Lưu tài khoản mới vào trình duyệt
                const newUser = {
                    email: email,
                    password: password,
                    name: "Operator " + Math.floor(Math.random() * 1000),
                    id: "OP-" + Math.floor(Math.random() * 9000 + 1000),
                    role: "Trader"
                };
                localStorage.setItem('user_' + email, JSON.stringify(newUser));
                
                showMsg("Register Success! Switching to Login...", "success");
                
                // Tự động chuyển về màn hình login sau 1 giây
                setTimeout(() => {
                    toggleAuthBtn.click();
                    emailInput.value = email; // Điền sẵn email vừa đăng ký
                    passInput.value = "";
                }, 1000);
            }
        } 
        // >>> TRƯỜNG HỢP 3: ĐĂNG NHẬP (LOGIN) <<<
        else {
            // Check tài khoản Admin cứng (để test nhanh)
            if (email === "admin" && password === "123") {
                performLogin({
                    name: "ADMINISTRATOR",
                    id: "DE200247",
                    email: "toanpbs@fpt.edu.vn",
                    role: "Lead Developer"
                });
                return;
            }

            // Tìm tài khoản trong localStorage
            const storedUser = localStorage.getItem('user_' + email);
            if (storedUser) {
                const userObj = JSON.parse(storedUser);
                if (userObj.password === password) {
                    performLogin(userObj);
                } else {
                    showMsg("Invalid Passcode.", "error");
                }
            } else {
                showMsg("Operator ID not found.", "error");
            }
        }
    });

    // --- 4. XỬ LÝ GOOGLE LOGIN (LINK THẬT) ---
    googleLoginBtn.addEventListener('click', () => {
        // Chuyển hướng người dùng sang trang Google thật
        window.location.href = GOOGLE_AUTH_URL;
    });

    // Cho phép ấn Enter để login
    passInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') mainAuthBtn.click();
    });

    // --- HÀM HỖ TRỢ: HIỂN THỊ THÔNG BÁO ---
    function showMsg(text, type) {
        loginMsg.textContent = text;
        loginMsg.style.color = type === 'success' ? '#0ecb81' : '#f6465d';
    }

    // --- HÀM HỖ TRỢ: THỰC HIỆN ĐĂNG NHẬP THÀNH CÔNG ---
    function performLogin(userData) {
        loginMsg.style.color = "#0ecb81";
        loginMsg.textContent = "AUTHENTICATION SUCCESSFUL...";
        
        setTimeout(() => {
            // Ẩn màn hình Login
            loginOverlay.style.transition = "opacity 0.5s ease";
            loginOverlay.style.opacity = "0";
            
            setTimeout(() => {
                loginOverlay.style.display = "none";
                mainApp.style.display = "block";
                
                // Hiệu ứng hiện dần App
                setTimeout(() => { mainApp.style.opacity = "1"; }, 50);

                // Cập nhật thông tin Profile trên giao diện
                updateProfileUI(userData);
                
                // Khởi tạo các chức năng bên trong (Biểu đồ, Tab)
                initDashboard();
            }, 500);
        }, 800);
    }

    // Cập nhật text trong giao diện Profile
    function updateProfileUI(user) {
        document.getElementById('profile-name-txt').textContent = user.name;
        document.getElementById('profile-id-txt').textContent = user.id;
        document.getElementById('profile-email-txt').textContent = user.email;
        if(user.role) document.getElementById('profile-role-txt').textContent = user.role + " | StableCast";
    }

    // --- 5. LOGIC DASHBOARD (TAB, CHART) ---
    // Giữ cho app hoạt động mượt mà sau khi vào trong
    function initDashboard() {
        
        // 1. Logic chuyển Tab
        const navBtns = document.querySelectorAll('.nav-btn');
        const views = document.querySelectorAll('.view-section');

        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Xóa active cũ
                navBtns.forEach(b => b.classList.remove('active'));
                views.forEach(v => v.classList.remove('active-view'));
                
                // Thêm active mới
                btn.classList.add('active');
                
                // Hiển thị view tương ứng dựa trên ID nút
                if(btn.id === 'btn-terminal') document.getElementById('dashboard-view').classList.add('active-view');
                if(btn.id === 'btn-community') document.getElementById('community-view').classList.add('active-view');
                if(btn.id === 'btn-profile') document.getElementById('profile-view').classList.add('active-view');
            });
        });

        // 2. Vẽ Biểu đồ (Sử dụng Chart.js đã có trong HTML)
        const ctx = document.getElementById('mainChart');
        if (ctx) {
            // Tạo dữ liệu giả
            const labels = Array.from({length: 30}, (_, i) => i + 1);
            const data = Array.from({length: 30}, () => 40000 + Math.random() * 2000);

            new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'BTC/USDT',
                        data: data,
                        borderColor: '#0ecb81',
                        backgroundColor: 'rgba(14, 203, 129, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { display: false }, // Ẩn trục X
                        y: { display: false }  // Ẩn trục Y
                    },
                    animation: { duration: 1500 }
                }
            });

            // Update số liệu ngẫu nhiên cho sinh động
            document.getElementById('btcPrice').innerText = "42,350.00";
            document.getElementById('predPrice').innerText = "42,800.50";
            document.getElementById('stopLoss').innerText = "41,500";
            document.getElementById('takeProfit').innerText = "43,200";
        }
    }
});
