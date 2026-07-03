const { PostHog } = require('posthog-node');

const posthogKey = process.env.POSTHOG_API_KEY;
let client = null;

if (posthogKey && posthogKey !== 'your_posthog_project_api_key' && posthogKey.trim() !== '') {
    try {
        console.log('📈 Initializing PostHog Client...');
        client = new PostHog(posthogKey, { host: 'https://app.posthog.com' });
    } catch (e) {
        console.error('Failed to initialize PostHog client:', e.message);
    }
} else {
    console.warn('⚠️ POSTHOG_API_KEY is missing. Analytics is running in log-only MOCK mode.');
}

const posthogService = {
    // Capture event on the backend
    trackEvent(userId, eventName, properties = {}) {
        if (!client) {
            console.log(`[MOCK ANALYTICS] Track Event for User ${userId}: ${eventName}`, properties);
            return;
        }

        try {
            client.capture({
                distinctId: userId,
                event: eventName,
                properties: {
                    ...properties,
                    $lib: 'node'
                }
            });
        } catch (e) {
            console.error('PostHog capture event error:', e.message);
        }
    },

    // Identify user attributes
    identifyUser(userId, userProperties = {}) {
        if (!client) {
            console.log(`[MOCK ANALYTICS] Identify User ${userId}`, userProperties);
            return;
        }

        try {
            client.identify({
                distinctId: userId,
                properties: userProperties
            });
        } catch (e) {
            console.error('PostHog identify error:', e.message);
        }
    },

    // Shutdown client to flush events (useful on app termination)
    async flush() {
        if (client) {
            await client.shutdownAsync();
        }
    }
};

module.exports = posthogService;
