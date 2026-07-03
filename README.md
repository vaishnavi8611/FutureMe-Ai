# FutureMe — AI-Powered Self-Reflection Platform

FutureMe is a premium, AI-native self-reflection platform designed to help users connect with and receive guidance from the future version of themselves who has already achieved their life and career goals. Built with an elegant Apple-style design and glassmorphism styling, this project converts a static landing page into a fully functional SaaS application.

> "Talk to the version of you who already made it."

---

## ✨ Features

### 1. 🔐 User Authentication (Supabase Auth)
- Secure signup and login via **Email/Password** and **Google Social OAuth**.
- Automated creation of matching profiles in a secure users table.
- JWT-based authentication middleware validating sessions across all API requests.

### 2. 🧠 Gemini AI Prompt Engineering Layer (Gemini 2.5 Flash)
- **Persona Tones**: Motivational, Brutally Honest, Calm Mentor, and CEO Mode.
- Dynamic prompt injection incorporating the user's name, age, goals, struggles, and long-term memory.
- Outputs structured JSON content containing personalized letters, next steps, and daily habits.

### 3. 💾 Long-Term Memory Profile
- Extracts and updates user objectives, obstacles, and habits from previous sessions using Gemini.
- Stores historical insights in a database to create a continuous, connected conversational experience across sessions.

### 4. 💬 Real-Time Identity Chat
- Full-featured chat workspace allowing users to converse directly with their generated future identity.
- Restores chat history dynamically from database stores.

### 5. 📊 Reflection Dashboard
- **Growth Timeline**: Visual log of past generated future selves.
- **Distilled Memory Tags**: Active goals, fears, and habits tracked dynamically.
- Interactive statistics counting total generations and messages.

### 6. ✉️ Weekly Letters & PDF Exports (Resend + PDFKit)
- Scheduled or manual trigger to generate a reflective weekly update letter summarizing recent goals and chats.
- Automatic email dispatch using the **Resend API**.
- Offline letter download as a styled PDF generated dynamically with **PDFKit**.

### 7. 💳 Stripe Subscription Billing
- Tiered subscription setup:
  - **Free Tier**: Limited to 3 generations and 20 chat messages.
  - **Premium Tier ($9/mo)**: Unlimited generations, unlimited chats, reflection dashboards, and weekly letters.
- Syncs subscription state using Stripe Checkout sessions and secure webhook signing.

### 8. 🛡️ Safety & Moderation Layer
- Pre-scans user prompts on the server side to block dangerous activities, self-harm, legal, or medical advice requests before passing to Gemini.

---

## 🛠️ Tech Stack

- **Frontend**: Single Page Application (SPA) in Vanilla HTML5, CSS3 (variables, transitions, animations), and JavaScript (async API calls, view router).
- **Backend**: Node.js, Express.js.
- **Database**: Supabase (PostgreSQL) with Row-Level Security (RLS) tables.
- **AI Integration**: Gemini SDK (`@google/genai`).
- **Integrations**: Stripe SDK (Billing), Resend SDK (Emails), PostHog (Analytics).
- **PDF Generation**: PDFKit.

---

## 📁 Repository Structure

```txt
futureme/
├── frontend/
│   ├── index.html          # Unified premium frontend view panels
│   ├── app.js              # SPA router, API requests, session management
│   └── styles.css          # Styling variables, glassy layouts, and modals
├── backend/
│   ├── server.js           # Express main entrypoint
│   ├── controllers/        # Route controllers (Auth, FutureMe, Dashboard, Billing, Letters)
│   ├── middleware/         # Middlewares (Auth, Safety Moderation, Subscription checks)
│   ├── routes/             # Express API routers
│   ├── services/           # Third-party wrappers (Gemini, Stripe, Resend, PostHog, Memory)
│   └── utils/              # DB clients (Supabase & local mockup DB client)
├── database/
│   └── schema.sql          # PostgreSQL table schemas, policies, and triggers
├── .env.template           # Template for environment variables
├── vercel.json             # Vercel Serverless routing deployment config
└── package.json            # Node.js dependencies
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher) installed.
- Supabase account (optional, fallback Mock DB included).

### Installation
1. Clone this repository to your local machine.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables template and configure it:
   ```bash
   copy .env.template .env
   ```
   *(If you leave keys empty, the system automatically enters **Mock Mode** for database, email, Stripe, and analytics so you can test all features offline!)*

### Running the App
Start the local development server:
```bash
npm run dev
```
Open **`http://localhost:5000`** in your browser.

### Running Integration Tests
Execute the automated test suite verifying all server endpoints:
```bash
node backend/test_api.js
```
