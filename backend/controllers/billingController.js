const stripeService = require('../services/stripeService');
const posthogService = require('../services/posthogService');

const billingController = {
    // POST /billing/create-checkout
    async createCheckout(req, res) {
        const userId = req.user.id;
        const userEmail = req.user.email;
        const { priceId } = req.body;

        try {
            const session = await stripeService.createCheckoutSession(userId, userEmail, priceId);
            
            posthogService.trackEvent(userId, 'checkout_started', { priceId });

            return res.status(200).json({
                message: 'Stripe checkout session created.',
                sessionId: session.id,
                url: session.url
            });
        } catch (e) {
            console.error('Checkout creation error:', e.message);
            return res.status(500).json({ error: 'Failed to initiate Stripe Checkout. Please try again.' });
        }
    },

    // POST /billing/webhook (handles Stripe event updates)
    async handleWebhook(req, res) {
        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        // Note: Express needs raw body parser configuration for this route
        const rawBody = req.rawBody || req.body; 

        try {
            const result = await stripeService.handleWebhook(rawBody, sig, webhookSecret);
            return res.status(200).json(result);
        } catch (e) {
            console.error('Webhook error:', e.message);
            return res.status(400).send(`Webhook Error: ${e.message}`);
        }
    }
};

module.exports = billingController;
