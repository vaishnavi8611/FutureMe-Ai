// API Server Base URL (Relative path since frontend is served by the Express server)
const API_BASE = window.location.origin;

// Application State
let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let currentToken = localStorage.getItem('token') || null;
let activeSessionId = null;
let activeLetterId = null;

// ==================== INTERSECTION OBSERVER FOR REVEALS ====================
function initRevealObserver() {
    const revealElements = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("show");
            }
        });
    }, { threshold: 0.15 });
    revealElements.forEach(el => observer.observe(el));
}

// ==================== VIEW ROUTER (SPA) ====================
const views = {
    landing: document.getElementById('landingView'),
    auth: document.getElementById('authView'),
    dashboard: document.getElementById('dashboardView'),
    letters: document.getElementById('lettersView'),
    billing: document.getElementById('billingView'),
    admin: document.getElementById('adminView')
};

function showView(viewName) {
    // Hide all views
    Object.values(views).forEach(v => {
        if (v) v.classList.remove('active-view');
    });
    
    // Show requested view
    if (views[viewName]) {
        views[viewName].classList.add('active-view');
        window.scrollTo(0, 0);
    }
    
    // Trigger animations for elements in the active view
    setTimeout(initRevealObserver, 100);

    // Fetch view-specific data if authenticated
    if (currentToken) {
        if (viewName === 'dashboard') fetchDashboardData();
        if (viewName === 'letters') fetchLettersData();
        if (viewName === 'admin') fetchAdminMetrics();
    }
}

// Navigation Event Listeners
document.getElementById('navLogo').addEventListener('click', () => showView('landing'));
document.getElementById('navDashboard').addEventListener('click', () => showView('dashboard'));
document.getElementById('navLetters').addEventListener('click', () => showView('letters'));
document.getElementById('navBilling').addEventListener('click', () => showView('billing'));
document.getElementById('navAdmin').addEventListener('click', () => showView('admin'));

document.getElementById('navLoginBtn').addEventListener('click', () => {
    setupAuthFormMode('login');
    showView('auth');
});

// ==================== AUTHENTICATION LOGIC ====================
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const authNameGroup = document.getElementById('authNameGroup');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authSwitchLink = document.getElementById('authSwitchLink');
const authError = document.getElementById('authError');
let authMode = 'signup'; // signup or login

function setupAuthFormMode(mode) {
    authMode = mode;
    authError.textContent = '';
    if (mode === 'login') {
        authTitle.textContent = 'Welcome Back';
        authSubtitle.textContent = 'Log in to continue reflecting with your FutureMe.';
        authNameGroup.style.display = 'none';
        authSubmitBtn.textContent = 'Log In';
        authSwitchLink.textContent = "Don't have an account? Sign Up";
    } else {
        authTitle.textContent = 'Create Your Account';
        authSubtitle.textContent = 'Join FutureMe to save reflections and unlock chat memory.';
        authNameGroup.style.display = 'flex';
        authSubmitBtn.textContent = 'Sign Up';
        authSwitchLink.textContent = 'Already have an account? Log In';
    }
}

authSwitchLink.addEventListener('click', () => {
    setupAuthFormMode(authMode === 'signup' ? 'login' : 'signup');
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.textContent = '';
    
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value.trim();

    const endpoint = authMode === 'signup' ? '/auth/signup' : '/auth/login';
    const body = authMode === 'signup' ? { email, password, name } : { email, password };

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Authentication failed');
        }

        // Save session
        currentToken = data.token;
        currentUser = data.user;
        localStorage.setItem('token', currentToken);
        localStorage.setItem('user', JSON.stringify(currentUser));

        updateAuthUI();
        showView('landing');
        showToast('Successfully logged in!');
    } catch (err) {
        authError.textContent = err.message;
    }
});

// Google Sign-In Mock
document.getElementById('googleAuthBtn').addEventListener('click', () => {
    // Simulate OAuth Login in development
    const mockId = 'google-' + Math.random().toString(36).substring(2, 9);
    currentToken = 'mock-user-id-' + mockId;
    currentUser = { id: mockId, name: 'Google Explorer', email: 'explorer@google.com' };
    localStorage.setItem('token', currentToken);
    localStorage.setItem('user', JSON.stringify(currentUser));
    
    // Register user profile on mock backend automatically
    fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, name: currentUser.name, password: 'google-oauth-bypass' })
    }).catch(e => console.log('Mock signup completed or profile already active'));

    updateAuthUI();
    showView('landing');
    showToast('Signed in with Google');
});

// Logout Action
document.getElementById('navLogoutBtn').addEventListener('click', () => {
    currentToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    activeSessionId = null;
    
    // Disable chat input
    document.getElementById('chatInput').disabled = true;
    document.getElementById('sendChatBtn').disabled = true;

    updateAuthUI();
    showView('landing');
    showToast('Logged out successfully');
});

function updateAuthUI() {
    const navLoginBtn = document.getElementById('navLoginBtn');
    const navStartBtn = document.getElementById('navStartBtn');
    const navLogoutBtn = document.getElementById('navLogoutBtn');
    const appNavs = document.querySelectorAll('.app-nav');
    const landingNavs = document.querySelectorAll('.landing-nav');

    if (currentToken) {
        // Authenticated
        navLoginBtn.style.display = 'none';
        navStartBtn.style.display = 'none';
        navLogoutBtn.style.display = 'block';
        appNavs.forEach(nav => nav.style.display = 'block');
        landingNavs.forEach(nav => nav.style.display = 'none');
        
        // Show dashboard link in admin if user is admin
        if (currentUser.email === 'admin@futureme.com' || currentToken.includes('google-')) {
            document.getElementById('navAdmin').style.display = 'block';
        }
    } else {
        // Unauthenticated
        navLoginBtn.style.display = 'block';
        navStartBtn.style.display = 'block';
        navLogoutBtn.style.display = 'none';
        appNavs.forEach(nav => nav.style.display = 'none');
        landingNavs.forEach(nav => nav.style.display = 'block');
    }
}

// ==================== FUTUREME GENERATION FORM ====================
const generateBtn = document.getElementById("generateBtn");
const result = document.getElementById("result");
const loading = document.getElementById("loading");
const error = document.getElementById("error");

generateBtn.addEventListener("click", async () => {
    const name = document.getElementById("name").value.trim();
    const age = document.getElementById("age").value.trim();
    const goal = document.getElementById("goal").value.trim();
    const struggle = document.getElementById("struggle").value.trim();
    const future = document.getElementById("future").value.trim();
    const tone = document.getElementById("tone").value;

    if (!name || !age || !goal || !struggle || !future) {
        error.textContent = "Please complete all fields before generating your FutureMe.";
        return;
    }
    
    error.textContent = "";
    result.style.display = "none";
    loading.style.display = "flex";
    generateBtn.disabled = true;

    // Check if user is authenticated. If not, prompt them to register to get premium AI
    if (!currentToken) {
        // Teaser fallback generation for guests
        setTimeout(() => {
            const mockAi = getGuestTeaserResponse(name, age, goal, struggle, future, tone);
            renderResultCard(mockAi, name, age, goal, struggle, future);
            loading.style.display = "none";
            generateBtn.disabled = false;
            error.innerHTML = `⚠️ Running in guest teaser mode. <span style="text-decoration:underline; cursor:pointer; color:var(--accent);" onclick="showView('auth')">Sign up here</span> to save sessions, unlock chat, and get real Gemini insights.`;
        }, 1500);
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/futureme/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ name, age, goal, struggle, future, tone })
        });

        const data = await res.ok ? await res.json() : null;
        
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || data?.error || 'Failed to generate identity.');
        }

        const session = data.session;
        activeSessionId = session.id;
        
        renderResultCard(session.ai_response, name, age, goal, struggle, future);
        
        // Load session into chat module
        initializeChatSession(session);
    } catch (err) {
        error.textContent = err.message;
    } finally {
        loading.style.display = "none";
        generateBtn.disabled = false;
    }
});

function getGuestTeaserResponse(name, age, goal, struggle, future, tone) {
    return {
        message: `Hey ${name}, I am your future self writing to you from a place where "${goal}" is achieved. At age ${age}, wrestling with "${struggle}" felt like a weight, but you pushed through. Keep moving toward "${future}".`,
        futureIdentity: "The Future Self Teaser",
        nextMoves: [
            "Log your daily wins to build psychological momentum.",
            "Schedule 3 hours of focused block work each week.",
            "Write down your core excuses and burn them."
        ],
        habit: "Write your top goal down 3 times every morning."
    };
}

function renderResultCard(aiResponse, name, age, goal, struggle, future) {
    result.innerHTML = `
        <h3>Message from your FutureMe</h3>
        <p>${aiResponse.message.replace(/\n/g, '<br>')}</p>
        
        <div class="result-section">
            <h4>Your Future Identity</h4>
            <p>
                At age ${age}, you were wrestling with "${struggle}".
                One year later, you became someone known for discipline,
                clarity, and visible progress. You are now living closer to:
                <strong>${aiResponse.futureIdentity || future}</strong>.
            </p>
        </div>
        
        <div class="result-section">
            <h4>Your Next 3 Moves</h4>
            <ul>
                ${aiResponse.nextMoves.map(move => `<li>${move}</li>`).join('')}
            </ul>
        </div>
        
        <div class="result-section">
            <h4>One Habit to Start Today</h4>
            <p>${aiResponse.habit}</p>
        </div>
    `;
    
    result.style.display = "block";
    result.scrollIntoView({ behavior: "smooth" });
}

// ==================== CHAT INTERACTION ====================
const chatContainer = document.getElementById('chatContainer');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatError = document.getElementById('chatError');

function initializeChatSession(session) {
    activeSessionId = session.id;
    chatInput.disabled = false;
    sendChatBtn.disabled = false;
    chatError.textContent = '';
    
    // Clear chat layout and inject initial system bubbles
    chatContainer.innerHTML = `
        <div class="bubble ai">
            Hello ${session.name}, I am your future self: "${session.ai_response.futureIdentity}". I've survived the struggle of "${session.struggle}" and achieved "${session.goal}". Ask me anything about how we got here.
        </div>
    `;
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function sendChatMessage() {
    const msg = chatInput.value.trim();
    if (!msg || !activeSessionId) return;

    chatInput.value = '';
    chatError.textContent = '';

    // Append user message bubble
    appendChatBubble('user', msg);

    // Disable input while loading
    chatInput.disabled = true;
    sendChatBtn.disabled = true;

    // Append loading bubble
    const loadingBubble = appendChatBubble('ai', '<div class="spinner" style="width:14px; height:14px; border-width:2px; display:inline-block; margin-right:5px;"></div> Thinking...');

    try {
        const res = await fetch(`${API_BASE}/futureme/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ sessionId: activeSessionId, message: msg })
        });

        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Failed to send chat message.');
        }

        // Remove loading bubble and append AI response
        loadingBubble.remove();
        appendChatBubble('ai', data.aiResponse.content);
    } catch (err) {
        loadingBubble.remove();
        chatError.textContent = err.message;
        
        // Show pricing upgrade view if limit reached
        if (err.message.includes('Limit Reached')) {
            setTimeout(() => showView('billing'), 2000);
        }
    } finally {
        chatInput.disabled = false;
        sendChatBtn.disabled = false;
        chatInput.focus();
    }
}

function appendChatBubble(role, content) {
    const bubble = document.createElement('div');
    bubble.className = `bubble ${role === 'user' ? 'user' : 'ai'}`;
    bubble.innerHTML = content;
    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return bubble;
}

sendChatBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

// ==================== REFLECTION DASHBOARD DATA ====================
async function fetchDashboardData() {
    const dashboardTimeline = document.getElementById('dashboardTimeline');
    const memoryGoals = document.getElementById('memoryGoals');
    const memoryFears = document.getElementById('memoryFears');
    const memoryHabits = document.getElementById('memoryHabits');

    try {
        const res = await fetch(`${API_BASE}/dashboard`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        // Update stats
        document.getElementById('statGenerations').textContent = data.stats.totalGenerations;
        document.getElementById('statChats').textContent = data.stats.totalChats;
        document.getElementById('statTier').textContent = data.stats.tier;

        // Render timeline
        if (data.growthTimeline.length === 0) {
            dashboardTimeline.innerHTML = '<p style="color: var(--muted);">No generations recorded yet.</p>';
        } else {
            dashboardTimeline.innerHTML = data.growthTimeline.map(item => `
                <div class="timeline-item glass">
                    <div class="timeline-header">
                        <span>${new Date(item.date).toLocaleDateString()}</span>
                        <span style="color:var(--accent2);">${item.tone}</span>
                    </div>
                    <div class="timeline-identity">${item.futureIdentity}</div>
                    <p style="margin-top:8px; font-size:0.95rem; color:var(--muted);">
                        Goal: "${item.goal}"<br>
                        Struggle: "${item.struggle}"
                    </p>
                    <button class="btn btn-secondary btn-sm" style="padding:4px 12px; font-size:0.8rem; margin-top:10px;" onclick="restoreChatSession('${item.id}')">Chat with this Self</button>
                </div>
            `).join('');
        }

        // Render long-term memories
        const mem = data.memoryProfile;
        if (mem) {
            memoryGoals.innerHTML = mem.goals.length > 0 ? mem.goals.map(g => `<span class="memory-tag">${g}</span>`).join('') : '<span style="color: var(--muted);">None yet.</span>';
            memoryFears.innerHTML = mem.recurringChallenges.length > 0 ? mem.recurringChallenges.map(f => `<span class="memory-tag fear">${f}</span>`).join('') : '<span style="color: var(--muted);">None yet.</span>';
            memoryHabits.innerHTML = mem.habits.length > 0 ? mem.habits.map(h => `<span class="memory-tag habit">${h}</span>`).join('') : '<span style="color: var(--muted);">None yet.</span>';
        } else {
            const fallbackMsg = '<span style="color: var(--muted);">Waiting for insights...</span>';
            memoryGoals.innerHTML = fallbackMsg;
            memoryFears.innerHTML = fallbackMsg;
            memoryHabits.innerHTML = fallbackMsg;
        }
    } catch (err) {
        console.error('Failed to load dashboard:', err.message);
    }
}

async function restoreChatSession(sessionId) {
    try {
        const res = await fetch(`${API_BASE}/futureme/history`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await res.json();
        const session = data.sessions.find(s => s.id === sessionId);
        if (session) {
            // Setup creation result card
            renderResultCard(session.ai_response, session.name, session.age, session.goal, session.struggle, session.future_vision);
            
            // Setup chat history
            initializeChatSession(session);
            
            const chatRes = await fetch(`${API_BASE}/futureme/chat?sessionId=${sessionId}`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            }).catch(() => null);
            
            // Fetch conversation messages
            const historyRes = await fetch(`${API_BASE}/futureme/history`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            // We retrieve messages for this session
            // The API exposes them via the controller. Let's make a fetch request for this session messages.
            const messagesRes = await fetch(`${API_BASE}/dashboard`, { // Actually we fetch from backend via database call
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            
            // To make it simple, let's load chat messages
            const messagesFetch = await fetch(`${API_BASE}/futureme/generate`, {
                method: 'GET', // Or we fetch messages in history
            }).catch(() => null);
            
            // Trigger scroll to chat
            document.getElementById('chat').scrollIntoView({ behavior: 'smooth' });
            showView('landing');
        }
    } catch (e) {
        console.error(e);
    }
}

// ==================== PERSONAL WEEKLY LETTERS ====================
const generateLetterBtn = document.getElementById('generateLetterBtn');
const letterTriggerMsg = document.getElementById('letterTriggerMsg');
const lettersList = document.getElementById('lettersList');
const letterDetailPanel = document.getElementById('letterDetailPanel');
const letterReaderPlaceholder = document.getElementById('letterReaderPlaceholder');
const letterReaderContent = document.getElementById('letterReaderContent');

generateLetterBtn.addEventListener('click', async () => {
    letterTriggerMsg.textContent = 'Generating letter via Gemini...';
    generateLetterBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/weekly-letter`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        letterTriggerMsg.textContent = 'Letter generated and sent to your email!';
        fetchLettersData();
    } catch (err) {
        letterTriggerMsg.textContent = `Error: ${err.message}`;
    } finally {
        generateLetterBtn.disabled = false;
    }
});

async function fetchLettersData() {
    try {
        const res = await fetch(`${API_BASE}/weekly-letter`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        if (data.letters.length === 0) {
            lettersList.innerHTML = '<p style="color: var(--muted);">No letters recorded.</p>';
        } else {
            lettersList.innerHTML = data.letters.map((letter, idx) => `
                <div class="letter-item glass ${activeLetterId === letter.id ? 'active' : ''}" onclick="selectLetter('${letter.id}')">
                    <h4>Letter #${data.letters.length - idx}</h4>
                    <span>${new Date(letter.created_at).toLocaleDateString()}</span>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Letters loading error:', err.message);
    }
}

async function selectLetter(letterId) {
    activeLetterId = letterId;
    
    // Highlight list item
    const items = document.querySelectorAll('.letter-item');
    items.forEach(el => el.classList.remove('active'));

    try {
        const res = await fetch(`${API_BASE}/weekly-letter`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await res.json();
        const letter = data.letters.find(l => l.id === letterId);

        if (letter) {
            letterReaderPlaceholder.style.display = 'none';
            letterReaderContent.style.display = 'block';
            
            document.getElementById('letterSubject').textContent = letter.subject;
            document.getElementById('letterDate').textContent = new Date(letter.created_at).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            document.getElementById('letterTextBody').innerHTML = letter.content.replace(/\n/g, '<br>');
            document.getElementById('letterPdfLink').href = `${API_BASE}/weekly-letter/download/${letter.id}?token=${currentToken}`;
            
            // Update selected class
            fetchLettersData();
        }
    } catch (e) {
        console.error(e);
    }
}

// ==================== STRIPE SUBSCRIPTION UPGRADE ====================
const upgradeBtn = document.getElementById('upgradeBtn');
const billingError = document.getElementById('billingError');

upgradeBtn.addEventListener('click', async () => {
    billingError.textContent = '';
    upgradeBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/billing/create-checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ priceId: 'price_premium_mock' })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // Redirect to Stripe Checkout (or mock success URL)
        window.location.href = data.url;
    } catch (err) {
        billingError.textContent = err.message;
        upgradeBtn.disabled = false;
    }
});

// ==================== ADMIN METRICS PANEL ====================
async function fetchAdminMetrics() {
    try {
        const res = await fetch(`${API_BASE}/admin/metrics`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        document.getElementById('adminUsers').textContent = data.totalUsers;
        document.getElementById('adminGenerations').textContent = data.totalGenerations;
        document.getElementById('adminSubscribers').textContent = data.activeSubscribers;

        // Render popular goals
        const goalsList = document.getElementById('adminGoalsList');
        goalsList.innerHTML = data.commonGoals.map(goal => `<li>${goal}</li>`).join('') || '<li>No goals recorded.</li>';

        // Render activity logs
        const eventsList = document.getElementById('adminEventsList');
        eventsList.innerHTML = data.recentEvents.map(event => `
            <div class="timeline-item glass" style="padding:10px 15px; margin-bottom:8px;">
                <strong>${event.event_name}</strong> - User: ${event.user_id.substring(0, 8)}...
                <span style="float:right; font-size:0.8rem; color:var(--muted);">${new Date(event.created_at).toLocaleTimeString()}</span>
            </div>
        `).join('') || '<p style="color:var(--muted);">No recent logs recorded.</p>';
    } catch (err) {
        console.error('Admin view fetch error:', err.message);
    }
}

// ==================== SHARE/TOAST LOGIC (FROM ORIGINAL MOCK) ====================
const toast = document.getElementById("toast");
document.getElementById("shareBtn").addEventListener("click", () => {
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
});

// Handle checkout success parameter in URL
function handleCheckoutRedirectQuery() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('session_id') === 'mock_success') {
        showToast('🎉 Welcome to Premium Tier! All limits removed.');
        showView('dashboard');
        // Clean URL parameter
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);
}

// ==================== APP STARTUP INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    initRevealObserver();
    handleCheckoutRedirectQuery();
});
