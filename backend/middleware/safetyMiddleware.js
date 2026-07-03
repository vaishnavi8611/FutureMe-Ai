const HARMFUL_KEYWORDS = [
    // Self-harm
    'suicide', 'kill myself', 'end my life', 'harm myself', 'cut myself', 'hang myself',
    // Medical Advice
    'diagnose', 'prescribe', 'medication', 'medical treatment', 'cure disease',
    // Legal Advice
    'legal representation', 'draft a contract', 'sue them', 'court defense', 'lawsuit'
];

function safetyMiddleware(req, res, next) {
    const fieldsToScan = [
        req.body.goal,
        req.body.struggle,
        req.body.future,
        req.body.message // for chat
    ];

    const foundViolation = fieldsToScan.some(text => {
        if (!text) return false;
        const normalized = text.toLowerCase();
        return HARMFUL_KEYWORDS.some(kw => normalized.includes(kw));
    });

    if (foundViolation) {
        return res.status(400).json({
            error: 'AI Safety Moderation Flag: FutureMe is an AI reflection platform and cannot provide medical, legal, or self-harm guidance. Please consult a qualified professional for these concerns.'
        });
    }

    next();
}

module.exports = safetyMiddleware;
