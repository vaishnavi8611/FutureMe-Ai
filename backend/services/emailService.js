const { Resend } = require('resend');

const resendKey = process.env.RESEND_API_KEY;
let resend = null;

if (resendKey && resendKey !== 'your_resend_api_key' && resendKey.trim() !== '') {
    try {
        console.log('✉️ Initializing Resend Email Client...');
        resend = new Resend(resendKey);
    } catch (e) {
        console.error('Failed to initialize Resend client:', e.message);
    }
} else {
    console.warn('⚠️ RESEND_API_KEY is missing. Email is running in log-only MOCK mode.');
}

const emailService = {
    // Send Welcome Email
    async sendWelcomeEmail(toEmail, userName) {
        const subject = 'Welcome to FutureMe — Meet Your Future Self';
        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050505; color: #ffffff; border-radius: 12px;">
                <h2 style="color: #5b8cff; margin-bottom: 20px;">Welcome to FutureMe, ${userName}!</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #d5d5d5;">
                    You have officially taken the first step toward a more reflective, intentional future.
                </p>
                <p style="font-size: 16px; line-height: 1.6; color: #d5d5d5;">
                    FutureMe is an AI-powered self-reflection platform designed to connect you with the version of you who already achieved your goals.
                </p>
                <div style="margin: 30px 0; text-align: center;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}#create" style="background: linear-gradient(135deg, #5b8cff, #8b5cf6); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 999px; font-weight: 600; font-size: 15px; display: inline-block;">
                        Create Your Future Self
                    </a>
                </div>
                <p style="font-size: 14px; color: #8f8f8f; border-top: 1px solid #222; padding-top: 20px; margin-top: 30px;">
                    This is an automated welcome message. We are excited to support you on your personal growth journey.
                </p>
            </div>
        `;

        if (!resend) {
            console.log(`[MOCK EMAIL] Welcome Email sent to ${toEmail} for ${userName}`);
            return { mock: true };
        }

        try {
            return await resend.emails.send({
                from: 'FutureMe <onboarding@resend.dev>', // Use verified domain in production
                to: toEmail,
                subject,
                html,
            });
        } catch (e) {
            console.error('Resend sendWelcomeEmail error:', e.message);
            return { error: e.message };
        }
    },

    // Send Weekly Letter
    async sendWeeklyLetterEmail(toEmail, userName, subject, letterContent) {
        // Format letterContent with line breaks
        const formattedContent = letterContent.replace(/\n/g, '<br>');
        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; background-color: #090909; color: #ffffff; border: 1px solid #222; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="color: #8f8f8f; font-size: 12px; margin-bottom: 20px; letter-spacing: 1px; text-transform: uppercase;">
                    A Letter From Your Future Self
                </div>
                <div style="font-size: 16px; line-height: 1.8; color: #e5e5e5; font-style: italic;">
                    "${formattedContent}"
                </div>
                <div style="margin-top: 30px; border-top: 1px solid #222; padding-top: 15px; text-align: center;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}#dashboard" style="color: #5b8cff; text-decoration: none; font-size: 14px; font-weight: 500;">
                        View your full Growth Timeline &rarr;
                    </a>
                </div>
            </div>
        `;

        if (!resend) {
            console.log(`[MOCK EMAIL] Weekly Letter sent to ${toEmail}. Subject: ${subject}`);
            return { mock: true };
        }

        try {
            return await resend.emails.send({
                from: 'FutureMe letters <letters@resend.dev>',
                to: toEmail,
                subject,
                html,
            });
        } catch (e) {
            console.error('Resend sendWeeklyLetterEmail error:', e.message);
            return { error: e.message };
        }
    },

    // Send Milestone Celebration
    async sendMilestoneEmail(toEmail, userName, milestoneDescription) {
        const subject = 'Congratulations on reaching a new milestone! 🎉';
        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050505; color: #ffffff; border-radius: 12px;">
                <h2 style="color: #4ade80; margin-bottom: 20px;">Milestone Achieved!</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #d5d5d5;">
                    Hey ${userName}, we wanted to celebrate a major milestone in your self-reflection journey:
                </p>
                <blockquote style="border-left: 4px solid #4ade80; padding-left: 15px; margin: 20px 0; color: #e5e5e5; font-style: italic;">
                    ${milestoneDescription}
                </blockquote>
                <p style="font-size: 16px; line-height: 1.6; color: #d5d5d5;">
                    Your future self is getting closer and closer with every milestone you log. Keep up the amazing work!
                </p>
                <div style="margin: 30px 0; text-align: center;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}#dashboard" style="background: #4ade80; color: #000000; text-decoration: none; padding: 12px 24px; border-radius: 999px; font-weight: 600; font-size: 15px; display: inline-block;">
                        Open Reflection Dashboard
                    </a>
                </div>
            </div>
        `;

        if (!resend) {
            console.log(`[MOCK EMAIL] Milestone Email sent to ${toEmail}. Milestone: ${milestoneDescription}`);
            return { mock: true };
        }

        try {
            return await resend.emails.send({
                from: 'FutureMe Milestones <milestones@resend.dev>',
                to: toEmail,
                subject,
                html,
            });
        } catch (e) {
            console.error('Resend sendMilestoneEmail error:', e.message);
            return { error: e.message };
        }
    }
};

module.exports = emailService;
