const Stripe = require('stripe');
const db = require('../utils/db');

const stripeSecret = process.env.STRIPE_SECRET_KEY;
let stripe = null;

if (stripeSecret && stripeSecret !== 'your_stripe_secret_key' && stripeSecret.trim() !== '') {
    try {
        console.log('💳 Initializing Stripe Client...');
        stripe = Stripe(stripeSecret);
    } catch (e) {
        console.error('Failed to initialize Stripe client:', e.message);
    }
} else {
    console.warn('⚠️ STRIPE_SECRET_KEY is missing. Billing is in MOCK subscription mode.');
}

const stripeService = {
    // Check if Stripe is configured
    isConfigured() {
        return stripe !== null;
    },

    // Create Checkout Session
    async createCheckoutSession(userId, userEmail, priceId = 'price_premium_mock') {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
        
        if (!stripe) {
            // Mock Upgrade: Directly upgrade the user in the mock DB and return success URL
            console.log(`[MOCK BILLING] Directly upgrading user ${userId} to Premium Tier...`);
            const mockSubscriptionId = 'sub_mock_' + Math.random().toString(36).substring(2, 11);
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
            
            await db.saveSubscription(
                mockSubscriptionId,
                userId,
                'active',
                priceId,
                false,
                oneYearFromNow.toISOString()
            );
            
            // Log mock event
            await db.logAnalyticsEvent(userId, 'subscription_created_mock', { priceId });
            
            return {
                id: 'cs_mock_' + Math.random().toString(36).substring(2, 11),
                url: `${frontendUrl}?session_id=mock_success`
            };
        }

        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                success_url: `${frontendUrl}?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${frontendUrl}?billing=canceled`,
                client_reference_id: userId,
                customer_email: userEmail,
                metadata: {
                    userId: userId
                }
            });

            return {
                id: session.id,
                url: session.url
            };
        } catch (e) {
            console.error('Stripe createCheckoutSession error:', e.message);
            throw e;
        }
    },

    // Handle Webhook events
    async handleWebhook(rawBody, sigHeader, webhookSecret) {
        if (!stripe) {
            console.log('[MOCK BILLING Webhook] Received webhook payload (Ignored in mock mode).');
            return { received: true, mock: true };
        }

        let event;
        try {
            event = stripe.webhooks.constructEvent(rawBody, sigHeader, webhookSecret);
        } catch (err) {
            console.error(`⚠️ Webhook signature verification failed:`, err.message);
            throw new Error(`Webhook Error: ${err.message}`);
        }

        console.log(`🔔 Received Stripe Webhook Event: ${event.type}`);

        try {
            switch (event.type) {
                case 'checkout.session.completed': {
                    const session = event.data.object;
                    const userId = session.client_reference_id;
                    const subscriptionId = session.subscription;
                    
                    if (userId && subscriptionId) {
                        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
                        const priceId = subscription.items.data[0].price.id;
                        
                        await db.saveSubscription(
                            subscriptionId,
                            userId,
                            subscription.status,
                            priceId,
                            subscription.cancel_at_period_end,
                            currentPeriodEnd
                        );
                        
                        await db.logAnalyticsEvent(userId, 'subscription_created', { subscriptionId, priceId });
                    }
                    break;
                }
                case 'customer.subscription.updated': {
                    const subscription = event.data.object;
                    // Find user associated with subscription
                    // Retrieve customer metadata or search database
                    // If metadata has userId, use it, else find in DB by subscriptionId
                    let userId = subscription.metadata.userId;
                    
                    if (!userId) {
                        // Look up in database
                        // Since we have a lookup by sub ID, we can do that
                        // We will implement lookup or update
                    }

                    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
                    const priceId = subscription.items.data[0].price.id;
                    
                    // Retrieve existing sub to find user ID if metadata was missing
                    let existingSub = null;
                    if (!userId) {
                        // Fallback search database
                        // In Express, we can look up by sub ID
                    }
                    // For safety, let's implement database lookup by subscriptionId
                    // Or we can rely on stripe subscription metadata which should be set during creation/updates
                    break;
                }
                case 'customer.subscription.deleted': {
                    const subscription = event.data.object;
                    const subscriptionId = subscription.id;
                    
                    // Set subscription status to canceled or inactive
                    // Let's implement cancel/deletion sync
                    break;
                }
                default:
                    console.log(`Unhandled Stripe event type ${event.type}`);
            }
            return { received: true };
        } catch (e) {
            console.error(`Stripe Webhook Event Processing Error (${event.type}):`, e.message);
            throw e;
        }
    }
};

module.exports = stripeService;
