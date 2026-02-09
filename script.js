import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
// Thêm createUserWithEmailAndPassword và signInWithEmailAndPassword
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// === CẤU HÌNH CỦA BẠN (Dán đè vào đây) ===
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
const mainBtn = document.getElementById('mainAuthBtn');
const toggleBtn = document.getElementById('toggleAuthBtn');
const authTitle = document.getElementById('authTitle');
const msg = document.getElementById('loginMsg');
let isRegisterMode = false; // Trạng thái: False là Đăng nhập, True là Đăng ký

// --- XỬ LÝ CHUYỂN ĐỔI LOGIN <-> REGISTER ---
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
            mainBtn.innerText = "AUTHENTICATE";
            toggleBtn.innerText = "NEW OPERATOR? REGISTER ACCESS";
            msg.innerText = "";
        }
    });
}

function unlockInterface(userName) {
    const overlay = document.getElementById('loginOverlay');
    const mainApp = document.querySelector('.main-app-container');
    
    mainBtn.innerHTML = "ACCESS GRANTED";
    mainBtn.style.background = "#0ecb81";
    msg.style.color = '#0ecb81';
    msg.innerText = `WELCOME, ${userName.toUpperCase()}`;

    setTimeout(() => { 
        overlay.style.opacity = '0';
        setTimeout(() => { 
            overlay.style.display = 'none'; 
            document.body.classList.add('logged-in');
            mainApp.style.display = 'block';
            setTimeout(() => { mainApp.style.opacity = '1'; }, 50);
            initSystem();
        }, 800);
    }, 1000);
}

// --- LOGIC AUTHENTICATION CHÍNH ---
mainBtn.addEventListener('click', () => {
    const emailOrId = document.getElementById('email').value.trim();
    const pass = document.getElementById('password').value;
    
    mainBtn.innerHTML = "PROCESSING..."; mainBtn.style.opacity = "0.7";

    if (isRegisterMode) {
        // === CHẾ ĐỘ ĐĂNG KÝ ===
        createUserWithEmailAndPassword(auth, emailOrId, pass)
            .then((userCredential) => {
                unlockInterface(userCredential.user.email);
            })
            .catch((error) => {
                mainBtn.innerHTML = "REGISTER ACCESS"; mainBtn.style.opacity = "1";
                msg.style.color = '#f6465d';
                // Thông báo lỗi thân thiện hơn
                if(error.code === 'auth/email-already-in-use') msg.innerText = "EMAIL ALREADY EXISTS";
                else if(error.code === 'auth/weak-password') msg.innerText = "PASSWORD TOO WEAK (MIN 6 CHARS)";
                else msg.innerText = "REGISTRATION FAILED: " + error.message;
            });
    } else {
        // === CHẾ ĐỘ ĐĂNG NHẬP ===
        // 1. Kiểm tra tài khoản cứng (Admin cũ)
        if ((emailOrId === 'DE200247' || emailOrId === 'admin') && pass === '123456') {
            unlockInterface(emailOrId);
            return;
        }

        // 2. Nếu không phải Admin cũ, thử đăng nhập bằng Firebase
        signInWithEmailAndPassword(auth, emailOrId, pass)
            .then((userCredential) => {
                unlockInterface(userCredential.user.email);
            })
            .catch((error) => {
                mainBtn.innerHTML = "AUTHENTICATE"; mainBtn.style.opacity = "1";
                msg.style.color = '#f6465d';
                msg.innerText = "ACCESS DENIED: INVALID CREDENTIALS";
            });
    }
});

// Google Login (Giữ nguyên)
const googleBtn = document.getElementById('googleLoginBtn');
if(googleBtn) {
    googleBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider)
            .then((result) => unlockInterface(result.user.displayName))
            .catch((error) => {
                msg.innerText = "GOOGLE ERROR: " + error.message;
                msg.style.color = '#f6465d';
            });
    });
}

// (GIỮ NGUYÊN PHẦN CODE initSystem VÀ LOGIC CHART BÊN DƯỚI...)
// Hãy copy lại phần initSystem, setupChartAndSocket từ file cũ vào đây nhé.
// Để code chạy, bạn cần dán lại phần logic AI/Chart vào cuối file này.
// ...
