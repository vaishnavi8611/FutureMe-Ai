// Integration Test Script for FutureMe API
const app = require('./server');

const testPort = 5005;

async function runTests() {
    console.log('\n🧪 Starting API Integration Tests...');
    
    // We start the server on a test port
    const testServer = await new Promise((resolve) => {
        const s = app.listen(testPort, () => {
            console.log(`Test server active on port ${testPort}`);
            resolve(s);
        });
    });

    const baseUrl = `http://localhost:${testPort}`;
    let mockToken = '';
    let testSessionId = '';
    let testLetterId = '';

    try {
        // Test Case 1: Health check
        console.log('\nTest Case 1: Health check');
        const healthRes = await fetch(`${baseUrl}/health`);
        const healthData = await healthRes.json();
        console.log('Health check status:', healthRes.status, healthData);
        if (healthRes.status !== 200 || healthData.status !== 'healthy') {
            throw new Error('Health check failed');
        }

        // Test Case 2: Auth Signup
        console.log('\nTest Case 2: Auth Signup');
        const signupRes = await fetch(`${baseUrl}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Explorer',
                email: `tester-${Date.now()}@test.com`,
                password: 'securePassword123'
            })
        });
        const signupData = await signupRes.json();
        console.log('Signup status:', signupRes.status, signupData.message);
        if (signupRes.status !== 201 || !signupData.token) {
            throw new Error('Signup failed');
        }
        mockToken = signupData.token;

        // Test Case 3: Auth Login
        console.log('\nTest Case 3: Auth Login');
        const loginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: signupData.user.email,
                password: 'securePassword123'
            })
        });
        const loginData = await loginRes.json();
        console.log('Login status:', loginRes.status, loginData.message);
        if (loginRes.status !== 200 || !loginData.token) {
            throw new Error('Login failed');
        }

        // Test Case 4: FutureMe Generation (Free Tier)
        console.log('\nTest Case 4: FutureMe Generation (Free Tier)');
        const genRes = await fetch(`${baseUrl}/futureme/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mockToken}`
            },
            body: JSON.stringify({
                name: 'Test Explorer',
                age: '25',
                goal: 'Build a premium SaaS product',
                struggle: 'Procrastination and fear of failure',
                future: 'Launch the product successfully',
                tone: 'Motivational'
            })
        });
        const genData = await genRes.json();
        console.log('Generation status:', genRes.status, genData.message);
        if (genRes.status !== 200 || !genData.session) {
            throw new Error('FutureMe generation failed');
        }
        testSessionId = genData.session.id;
        console.log('Generated Future Identity Title:', genData.session.ai_response.futureIdentity);

        // Test Case 5: FutureMe Chat
        console.log('\nTest Case 5: FutureMe Chat');
        const chatRes = await fetch(`${baseUrl}/futureme/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mockToken}`
            },
            body: JSON.stringify({
                sessionId: testSessionId,
                message: 'How did you handle procrastination?'
            })
        });
        const chatData = await chatRes.json();
        console.log('Chat status:', chatRes.status, chatData.message);
        if (chatRes.status !== 200 || !chatData.aiResponse) {
            throw new Error('FutureMe chat message failed');
        }
        console.log('AI Reply content:', chatData.aiResponse.content);

        // Test Case 6: Long-term Memory / Dashboard Insights
        console.log('\nTest Case 6: Dashboard Insights');
        const dashRes = await fetch(`${baseUrl}/dashboard`, {
            headers: { 'Authorization': `Bearer ${mockToken}` }
        });
        const dashData = await dashRes.json();
        console.log('Dashboard status:', dashRes.status);
        if (dashRes.status !== 200 || !dashData.stats) {
            throw new Error('Fetch dashboard data failed');
        }
        console.log('Stats retrieved:', dashData.stats);
        console.log('Memory goals distilled:', dashData.memoryProfile.goals);

        // Test Case 7: Stripe Billing checkout creation
        console.log('\nTest Case 7: Stripe Billing Checkout');
        const billRes = await fetch(`${baseUrl}/billing/create-checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mockToken}`
            },
            body: JSON.stringify({ priceId: 'price_premium_mock' })
        });
        const billData = await billRes.json();
        console.log('Billing checkout status:', billRes.status, billData.message);
        if (billRes.status !== 200 || !billData.url) {
            throw new Error('Billing checkout failed');
        }
        console.log('Billing redirect checkout URL:', billData.url);

        // Test Case 8: Weekly Letter Generation
        console.log('\nTest Case 8: Weekly Letter Generation');
        const letterRes = await fetch(`${baseUrl}/weekly-letter`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${mockToken}` }
        });
        const letterData = await letterRes.json();
        console.log('Weekly letter status:', letterRes.status, letterData.message);
        if (letterRes.status !== 200 || !letterData.letter) {
            throw new Error('Weekly letter generation failed');
        }
        testLetterId = letterData.letter.id;

        console.log('\n✅ ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ✅');
    } catch (e) {
        console.error('\n❌ INTEGRATION TEST FAILED:', e.message);
        process.exitCode = 1;
    } finally {
        // Shutdown test server
        testServer.close(() => {
            console.log('\nTest server shut down.');
        });
    }
}

runTests();
