import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional
from tensorflow.keras.callbacks import EarlyStopping
import tensorflow as tf
from datetime import datetime
import os
import requests
import threading
import sqlite3
import hashlib
import base64
from io import BytesIO
from PIL import Image
import gc # Thư viện dọn rác bộ nhớ (Quan trọng cho bản Free)

# --- THƯ VIỆN BỔ TRỢ ---
try:
    import feedparser
    HAS_FEEDPARSER = True
except ImportError:
    HAS_FEEDPARSER = False

try: import CryptoDataCollector
except ImportError: pass

# ==========================================
# 1. CẤU HÌNH & CSS
# ==========================================
st.set_page_config(page_title="Stable Cast V40", layout="wide", page_icon="💎")

st.markdown("""
<style>
    .stApp {background-color: #0E1117;}
    
    /* Sidebar Avatar */
    .avatar-img {width: 100px; height: 100px; border-radius: 50%; border: 3px solid #58a6ff; display: block; margin: 0 auto 10px auto; object-fit: cover;}
    
    /* KPI */
    .kpi-card {background: #161b22; padding: 15px; border-radius: 8px; border: 1px solid #30363d; text-align: center;}
    .kpi-label {color: #8b949e; font-size: 11px; text-transform: uppercase; font-weight: 600;}
    .kpi-val {font-size: 22px; font-weight: bold; color: #f0f6fc;}
    
    /* Chat */
    .chat-box {height: 450px; overflow-y: scroll; padding: 15px; background: #0d1117; border: 1px solid #30363d; border-radius: 8px; display: flex; flex-direction: column-reverse;}
    .msg-row {display: flex; width: 100%; margin-bottom: 8px;}
    .msg-mine {justify-content: flex-end;}
    .msg-theirs {justify-content: flex-start;}
    .bubble {padding: 8px 15px; border-radius: 15px; max-width: 75%; font-size: 14px;}
    .bubble-mine {background: #1f6feb; color: white; border-bottom-right-radius: 2px;}
    .bubble-theirs {background: #21262d; color: #e6edf3; border-bottom-left-radius: 2px;}
    
    /* News */
    .news-item {background: #161b22; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #58a6ff;}
    
    /* Button Style */
    .stButton > button {border: 1px solid #30363d; font-weight: bold; width: 100%;}
</style>
""", unsafe_allow_html=True)

# ==========================================
# 2. DATABASE & SYSTEM
# ==========================================
DB_FILE = "stable_cast.db"
SYSTEM_WEBHOOK = "https://discord.com/api/webhooks/1469612104616251561/SvDfdD1c3GF4evKxTcLCvXGQtPrxrWQBK1BgcpCDh59olo6tQD1zb7ENNHGiFaE0JoBR"

@st.cache_resource
def init_db():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, role TEXT, status TEXT, avatar TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS friends (user1 TEXT, user2 TEXT, status TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender TEXT, receiver TEXT, content TEXT, timestamp TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS trade_logs (timestamp TEXT, symbol TEXT, type TEXT, entry REAL, user TEXT)''')
    try: c.execute("INSERT INTO users (username, password, role, status) VALUES (?, ?, ?, ?, ?)", ("admin", hashlib.sha256("admin123".encode()).hexdigest(), "admin", "active", None)); conn.commit()
    except: pass
    conn.close()
init_db()

# --- HELPER FUNCTIONS ---
def check_login(u, p):
    conn = sqlite3.connect(DB_FILE); c = conn.cursor(); c.execute("SELECT password, role, status FROM users WHERE username=?", (u,)); d = c.fetchone(); conn.close()
    if d and d[2]!="banned" and d[0]==hashlib.sha256(p.encode()).hexdigest(): return True, d[1]
    return False, None

def create_user(u, p):
    try: conn=sqlite3.connect(DB_FILE); conn.execute("INSERT INTO users (username, password, role, status) VALUES (?, ?, ?, ?)", (u, hashlib.sha256(p.encode()).hexdigest(), "user", "active")); conn.commit(); conn.close(); return True
    except: return False

def get_avatar(u):
    conn=sqlite3.connect(DB_FILE); c=conn.cursor(); c.execute("SELECT avatar FROM users WHERE username=?",(u,)); d=c.fetchone(); conn.close()
    return d[0] if d else None

def update_avatar(u, f):
    try: i=Image.open(f).resize((150,150)); b=BytesIO(); i.save(b,"PNG"); s=base64.b64encode(b.getvalue()).decode(); conn=sqlite3.connect(DB_FILE); conn.execute("UPDATE users SET avatar=? WHERE username=?",(s,u)); conn.commit(); conn.close(); return True
    except: return False

# --- SOCIAL LOGIC ---
class Social:
    @staticmethod
    def add_friend(u1, u2):
        conn=sqlite3.connect(DB_FILE); c=conn.cursor(); c.execute("SELECT * FROM users WHERE username=?",(u2,))
        if not c.fetchone(): return "User not found"
        c.execute("INSERT INTO friends VALUES (?,?,?)", (u1, u2, "accepted")); conn.commit(); conn.close(); return "Added"
    @staticmethod
    def get_friends(u):
        conn=sqlite3.connect(DB_FILE); d=conn.execute("SELECT user1, user2 FROM friends WHERE user1=? OR user2=?",(u,u)).fetchall(); conn.close()
        return [x[1] if x[0]==u else x[0] for x in d]
    @staticmethod
    def send(u1, u2, txt):
        conn=sqlite3.connect(DB_FILE); conn.execute("INSERT INTO messages (sender, receiver, content, timestamp) VALUES (?,?,?,?)", (u1, u2, txt, datetime.now().strftime("%H:%M"))); conn.commit(); conn.close()
    @staticmethod
    def get_msgs(u1, u2):
        conn=sqlite3.connect(DB_FILE); df=pd.read_sql("SELECT * FROM messages WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?) ORDER BY id DESC LIMIT 50", conn, params=(u1,u2,u2,u1)); conn.close(); return df

# ==========================================
# 3. AI & TRADING LOGIC (OPTIMIZED)
# ==========================================
class AIEngine:
    def __init__(self, look_back=60):
        self.look_back = look_back; self.scaler = MinMaxScaler((0,1)); self.close_scaler = MinMaxScaler((0,1))
    
    def prepare_data(self, df):
        df['SMA_50'] = df['close'].rolling(50).mean().fillna(method='bfill')
        data = df[['close', 'high', 'low', 'RSI', 'SMA_50']].values
        self.close_scaler.fit(df[['close']])
        return self.scaler.fit_transform(data)

    # CACHING MODEL ĐỂ TRÁNH SẬP RAM
    @staticmethod
    @st.cache_resource
    def get_model(input_shape):
        tf.random.set_seed(42); tf.keras.backend.clear_session(); gc.collect()
        m = Sequential()
        m.add(Bidirectional(LSTM(32, return_sequences=True), input_shape=input_shape))
        m.add(Dropout(0.2)); m.add(LSTM(16, return_sequences=False)); m.add(Dense(1))
        m.compile(optimizer='adam', loss='mse')
        return m

    def train_and_predict(self, df):
        scaled = self.prepare_data(df); X, y = [], []
        for i in range(self.look_back, len(scaled)): X.append(scaled[i-self.look_back:i]); y.append(scaled[i, 0])
        X, y = np.array(X), np.array(y)
        
        # Load cached model & Quick Train (10 Epochs)
        model = self.get_model((self.look_back, 5))
        model.fit(X, y, epochs=10, batch_size=32, verbose=0, shuffle=False)
        
        last_seq = scaled[-self.look_back:].reshape(1, self.look_back, 5)
        pred = model.predict(last_seq)
        return self.close_scaler.inverse_transform(pred)[0][0]

def calc_conf(df, d):
    last=df.iloc[-1]; rsi=last['RSI']; score=50
    if d=="LONG": score += 20 if rsi<30 else -10 if rsi>50 else 0
    else: score += 20 if rsi>70 else -10 if rsi<50 else 0
    return min(95.0, max(30.0, score))

class TradeManager:
    @staticmethod
    def log(symbol, type, entry, tp, sl, tp1, be, user):
        try:
            requests.post(SYSTEM_WEBHOOK, json={"embeds": [{"title": f"🛡️ SAFE SIGNAL: {symbol}", "description": f"**{user}** called **{type}**", "color": 3447003 if type=="LONG" else 15158332, "fields": [{"name":"Entry", "value":f"${entry:,.2f}"}, {"name":"Plan", "value":f"TP1: ${tp1:,.2f} | Move SL: ${be:,.2f}"}]}]})
            return True
        except: return False

# ==========================================
# 4. GIAO DIỆN CHÍNH (MAIN FLOW)
# ==========================================
def main():
    if 'logged_in' not in st.session_state: st.session_state['logged_in'] = False

    # --- LOGIN ---
    if not st.session_state['logged_in']:
        c1, c2, c3 = st.columns([1,1,1])
        with c2:
            st.title("🔐 STABLE CAST")
            tab1, tab2 = st.tabs(["Login", "Register"])
            with tab1:
                u = st.text_input("User", key="l1"); p = st.text_input("Pass", type="password", key="l2")
                if st.button("Sign In") and check_login(u, p)[0]:
                    st.session_state['logged_in']=True; st.session_state['user']=u; st.rerun()
            with tab2:
                nu = st.text_input("New User"); np = st.text_input("New Pass", type="password")
                if st.button("Sign Up") and create_user(nu, np): st.success("OK")
        return

    # --- MAIN APP ---
    user = st.session_state['user']
    avt = get_avatar(user)
    
    # SIDEBAR
    with st.sidebar:
        st.markdown(f"<img src='data:image/png;base64,{avt}' class='avatar-img'>" if avt else "<img src='https://cdn-icons-png.flaticon.com/512/847/847969.png' class='avatar-img'>", unsafe_allow_html=True)
        st.markdown(f"<h3 style='text-align:center'>{user}</h3>", unsafe_allow_html=True)
        
        # MENU CHỌN TÍNH NĂNG (Radio Button - Luôn hoạt động)
        st.write("---")
        menu = st.radio("MAIN MENU", ["📈 Trading Terminal", "💬 Chat Room", "📰 Market News"])
        st.write("---")
        
        with st.expander("⚙️ Settings"):
            up = st.file_uploader("Avatar", type=['png','jpg'])
            if up and update_avatar(user, up): st.rerun()
            if st.button("Logout"): st.session_state['logged_in']=False; st.rerun()

    # --- PAGE ROUTING ---
    
    # 1. TRADING
    if menu == "📈 Trading Terminal":
        st.title("📈 Trading Terminal")
        c1, c2 = st.columns([1, 3])
        with c1:
            symbol = st.selectbox("Asset", ["BTC_USDT", "ETH_USDT", "BNB_USDT"])
            if st.button("⚡ Update Data", use_container_width=True):
                try: CryptoDataCollector.fetch_and_save_data(); st.cache_resource.clear()
                except: pass
                st.rerun()
        
        with c2:
            try:
                df = pd.read_csv(f"{symbol}_data.csv")
                last = df.iloc[-1]
                # Chart
                st.line_chart(df['close'].tail(50))
                
                # AI
                eng = AIEngine(60); pred = eng.train_and_predict(df)
                direct = "LONG" if pred > last['close'] else "SHORT"
                conf = calc_conf(df, direct); color = "#00E676" if direct == "LONG" else "#FF5252"
                
                # Safe Plan
                atr = last['close']*0.015
                if direct == "LONG": tp=last['close']+(2.5*atr); sl=last['close']-(1.2*atr); tp1=last['close']+(1.2*atr); be=last['close']+(0.8*atr)
                else: tp=last['close']-(2.5*atr); sl=last['close']+(1.2*atr); tp1=last['close']-(1.2*atr); be=last['close']-(0.8*atr)
                
                st.markdown(f"""
                <div style='background:#161b22; padding:20px; border-radius:10px; border-left: 5px solid {color}'>
                    <h2 style='color:{color}; margin:0'>{direct}</h2>
                    <p style='color:#ccc'>Target: ${pred:,.2f} | Conf: {conf:.1f}%</p>
                    <div style='background:rgba(255,215,0,0.1); padding:10px; border-radius:5px; border:1px dashed #FFD700'>
                        <b style='color:#FFD700'>🛡️ SAFE PLAN:</b> TP1: ${tp1:,.2f} | Move SL: ${be:,.2f}
                    </div>
                </div>
                """, unsafe_allow_html=True)
                
                if st.button("🚀 PUSH TO DISCORD"):
                    if TradeManager.log(symbol, direct, last['close'], tp, sl, tp1, be, user): st.toast("Sent!", icon="✅")
            except: st.info("⚠️ Click 'Update Data' to start.")

    # 2. CHAT
    elif menu == "💬 Chat Room":
        st.title("💬 Chat Room")
        c1, c2 = st.columns([1, 2])
        with c1:
            new_f = st.text_input("Add Friend"); 
            if st.button("Add"): Social.add_friend(user, new_f)
            friends = Social.get_friends(user)
            for f in friends:
                if st.button(f"🟢 {f}", use_container_width=True): st.session_state['chat_target']=f; st.rerun()
        
        with c2:
            target = st.session_state.get('chat_target')
            if target:
                st.subheader(f"Chat: {target}")
                msgs = Social.get_msgs(user, target)
                html = "<div class='chat-box'>"
                for _, row in msgs.iterrows():
                    cls = "msg-mine" if row['sender']==user else "msg-theirs"
                    bbl = "bubble-mine" if row['sender']==user else "bubble-theirs"
                    html += f"<div class='msg-row {cls}'><div class='bubble {bbl}'>{row['content']}</div></div>"
                html += "</div>"
                st.markdown(html, unsafe_allow_html=True)
                with st.form("chat"):
                    txt = st.text_input("Message", label_visibility="collapsed")
                    if st.form_submit_button("Send") and txt: Social.send(user, target, txt); st.rerun()
                if st.button("Refresh"): st.rerun()
            else: st.info("Select a friend.")

    # 3. NEWS
    elif menu == "📰 Market News":
        st.title("📰 Market News")
        if st.button("Refresh"): st.rerun()
        if HAS_FEEDPARSER:
            try:
                feed = feedparser.parse("https://cointelegraph.com/rss")
                for e in feed.entries[:10]:
                    st.markdown(f"""
                    <div class='news-item'>
                        <a href='{e.link}' target='_blank' class='news-title'>{e.title}</a>
                        <div style='color:#888; font-size:12px;'>{e.published}</div>
                    </div>
                    """, unsafe_allow_html=True)
            except: st.error("Error loading news")
        else: st.warning("Install `feedparser` library.")

if __name__ == "__main__":
    main()
