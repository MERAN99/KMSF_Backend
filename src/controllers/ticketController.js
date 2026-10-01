const Event = require('../models/Event');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const { createEventTicketCheckoutSession } = require('../services/stripeService');
const { sendTicketConfirmationEmail } = require('../services/emailService');

// ─── POST /events/:id/tickets/checkout ──────────────────────────────────────
const checkoutTicket = async (req, res, next) => {
    try {
        const { id: eventId } = req.params;
        const { ticketType, amount } = req.body; // amount should be in numeric format (e.g., 10.00)
        const user = req.user;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Validate ticket type eligibility
        if (ticketType === 'Member' && user.membershipStatus !== 'active' && user.role !== 'admin') {
             return res.status(403).json({ success: false, message: 'You must have an active KMSF membership to select a Member ticket.' });
        }
        if (ticketType === 'Student' && (!user.profession || user.profession.toLowerCase() !== 'student') && user.role !== 'admin') {
             return res.status(403).json({ success: false, message: 'Only students can select the Student ticket type. Please update your profile profession.' });
        }

        // Validate that the user hasn't already bought ANY ticket for this event
        const existingTicket = await Ticket.findOne({ 
            user: user._id, 
            event: eventId, 
            paymentStatus: { $in: ['paid', 'free'] } 
        });
        if (existingTicket) {
             return res.status(400).json({ success: false, message: 'You have already acquired a ticket for this event.' });
        }

        // Amount must be > 0 for Stripe checkout. If free, they should use the /free endpoint.
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount for checkout. Use the claim-free endpoint for free tickets.' });
        }

        const session = await createEventTicketCheckoutSession(
            event,
            ticketType,
            amount,
            'GBP',
            user._id
        );

        res.status(200).json({
            success: true,
            url: session.url,
            sessionId: session.id,
        });
    } catch (error) {
        next(error);
    }
};

// ─── POST /events/:id/tickets/free ──────────────────────────────────────────
const claimFreeTicket = async (req, res, next) => {
    try {
        const { id: eventId } = req.params;
        const { ticketType } = req.body;
        const user = req.user;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Validate ticket type eligibility
        if (ticketType === 'Member' && user.membershipStatus !== 'active' && user.role !== 'admin') {
             return res.status(403).json({ success: false, message: 'You must have an active KMSF membership to select a Member ticket.' });
        }
        if (ticketType === 'Student' && (!user.profession || user.profession.toLowerCase() !== 'student') && user.role !== 'admin') {
             return res.status(403).json({ success: false, message: 'Only students can select the Student ticket type. Please update your profile profession.' });
        }

        // Verify that the requested ticket type is actually free in the event prices
        const priceConfig = event.prices.find(p => p.type === ticketType);
        if (!priceConfig || (priceConfig.amount.toLowerCase() !== 'free' && parseFloat(priceConfig.amount.replace(/[^0-9.-]+/g,"")) > 0)) {
            return res.status(400).json({ success: false, message: 'This ticket type is not free.' });
        }

        const existingTicket = await Ticket.findOne({ 
            user: user._id, 
            event: eventId, 
            paymentStatus: { $in: ['paid', 'free'] } 
        });
        if (existingTicket) {
             return res.status(400).json({ success: false, message: 'You have already acquired a ticket for this event.' });
        }

        const ticket = await Ticket.create({
            user: user._id,
            event: eventId,
            ticketType: ticketType,
            pricePaid: 0,
            paymentStatus: 'free'
        });

        // Send confirmation email asynchronously (non-blocking)
        sendTicketConfirmationEmail(ticket, user, event)
            .catch(err => console.error('[claimFreeTicket] Email failed:', err.message));

        res.status(201).json({
            success: true,
            message: 'Free ticket claimed successfully.',
            data: ticket
        });
    } catch (error) {
        next(error);
    }
};

// ─── GET /users/me/tickets ──────────────────────────────────────────────────
const getUserTickets = async (req, res, next) => {
    try {
        const user = req.user;
        const tickets = await Ticket.find({ user: user._id, paymentStatus: { $in: ['paid', 'free'] } })
            .populate('event', 'title date time location image category isTBD')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: tickets,
        });
    } catch (error) {
        next(error);
    }
};

// ─── GET /admin/events/:id/tickets ──────────────────────────────────────────
const getEventTicketsAdmin = async (req, res, next) => {
    try {
        const { id: eventId } = req.params;
        
        const tickets = await Ticket.find({ event: eventId, paymentStatus: { $ne: 'pending' } })
            .populate('user', 'firstName lastName email telephone role membershipStatus organization profession')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: tickets,
        });
    } catch (error) {
        next(error);
    }
};

// ─── POST /admin/tickets/recover ─────────────────────────────────────────────
// Manually recover a ticket from a Stripe session when the webhook failed
const recoverTicketFromStripe = async (req, res, next) => {
    try {
        const stripe = require('../config/stripe');
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ success: false, message: 'Stripe session ID is required.' });
        }

        // Fetch the session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (!session) {
            return res.status(404).json({ success: false, message: 'Stripe session not found.' });
        }

        if (session.payment_status !== 'paid') {
            return res.status(400).json({ success: false, message: `Payment not completed. Status: ${session.payment_status}` });
        }

        if (session.metadata?.isEventTicket !== 'true') {
            return res.status(400).json({ success: false, message: 'This session is not an event ticket purchase.' });
        }

        // Check if ticket already exists
        const existingTicket = await Ticket.findOne({ stripeSessionId: sessionId });
        if (existingTicket) {
            return res.status(409).json({ success: false, message: 'Ticket already exists for this session.', data: existingTicket });
        }

        const ticket = await Ticket.create({
            user: session.metadata.userId,
            event: session.metadata.eventId,
            ticketType: session.metadata.ticketType,
            pricePaid: session.amount_total / 100,
            paymentStatus: 'paid',
            stripeSessionId: session.id,
        });

        res.status(201).json({
            success: true,
            message: 'Ticket recovered successfully from Stripe session.',
            data: ticket,
        });
    } catch (error) {
        next(error);
    }
};

// ─── POST /tickets/verify-session ────────────────────────────────────────────
// Called by frontend after Stripe redirect — ensures ticket is created even if webhook failed
const verifyTicketSession = async (req, res, next) => {
    try {
        const stripe = require('../config/stripe');
        const { sessionId } = req.body;
        const user = req.user;

        if (!sessionId) {
            return res.status(400).json({ success: false, message: 'Session ID is required.' });
        }

        // 1) Check if ticket already exists (webhook already handled it)
        const existingTicket = await Ticket.findOne({ stripeSessionId: sessionId })
            .populate('event', 'title date time location image');
        if (existingTicket) {
            return res.status(200).json({
                success: true,
                message: 'Ticket already exists.',
                data: existingTicket,
            });
        }

        // 2) Fetch session from Stripe to validate
        let session;
        try {
            session = await stripe.checkout.sessions.retrieve(sessionId);
        } catch (stripeErr) {
            console.error('[verifyTicketSession] Stripe retrieve error:', stripeErr.message);
            return res.status(404).json({ success: false, message: 'Stripe session not found.' });
        }

        // 3) Validate the session
        if (session.payment_status !== 'paid') {
            return res.status(400).json({ 
                success: false, 
                message: `Payment not completed. Status: ${session.payment_status}` 
            });
        }

        if (session.metadata?.isEventTicket !== 'true') {
            return res.status(400).json({ success: false, message: 'This session is not an event ticket purchase.' });
        }

        // 4) Verify this session belongs to the requesting user
        if (session.metadata.userId !== user._id.toString()) {
            return res.status(403).json({ success: false, message: 'This session does not belong to you.' });
        }

        // 5) Create the ticket (webhook missed it or hasn't processed yet)
        let ticket;
        try {
            ticket = await Ticket.create({
                user: session.metadata.userId,
                event: session.metadata.eventId,
                ticketType: session.metadata.ticketType,
                pricePaid: session.amount_total / 100,
                paymentStatus: 'paid',
                stripeSessionId: session.id,
            });
            console.log(`[verifyTicketSession] Ticket CREATED via fallback: ${ticket._id} (code: ${ticket.ticketCode}) for user ${session.metadata.userId}`);
        } catch (createErr) {
            // If duplicate key error (code 11000), webhook or concurrent request created it simultaneously
            if (createErr.code === 11000) {
                const existing = await Ticket.findOne({ stripeSessionId: sessionId })
                    .populate('event', 'title date time location image');
                return res.status(200).json({
                    success: true,
                    message: 'Ticket already exists.',
                    data: existing,
                });
            }
            throw createErr;
        }

        const populatedTicket = await Ticket.findById(ticket._id)
            .populate('event', 'title date time location image');

        // Send confirmation email asynchronously (non-blocking)
        const ticketEvent = await Event.findById(session.metadata.eventId);
        if (ticketEvent) {
            sendTicketConfirmationEmail(ticket, user, ticketEvent)
                .catch(err => console.error('[verifyTicketSession] Email failed:', err.message));
        }

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully.',
            data: populatedTicket,
        });
    } catch (error) {
        next(error);
    }
};

// ─── POST /admin/tickets/recover-all ─────────────────────────────────────────
// Scan recent Stripe sessions and create tickets for any paid sessions missing from DB
const recoverAllMissingTickets = async (req, res, next) => {
    try {
        const stripe = require('../config/stripe');
        
        // Fetch recent completed checkout sessions from Stripe (last 7 days)
        const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
        
        let allSessions = [];
        let hasMore = true;
        let startingAfter = undefined;
        
        while (hasMore) {
            const params = {
                limit: 100,
                created: { gte: sevenDaysAgo },
            };
            if (startingAfter) params.starting_after = startingAfter;
            
            const sessions = await stripe.checkout.sessions.list(params);
            allSessions = allSessions.concat(sessions.data);
            hasMore = sessions.has_more;
            if (sessions.data.length > 0) {
                startingAfter = sessions.data[sessions.data.length - 1].id;
            }
        }
        
        // Filter to only paid event ticket sessions
        const ticketSessions = allSessions.filter(s => 
            s.payment_status === 'paid' && 
            s.metadata?.isEventTicket === 'true' &&
            s.metadata?.userId &&
            s.metadata?.eventId
        );
        
        const recovered = [];
        const alreadyExisted = [];
        const errors = [];
        
        for (const session of ticketSessions) {
            try {
                const existing = await Ticket.findOne({ stripeSessionId: session.id });
                if (existing) {
                    alreadyExisted.push({ sessionId: session.id, ticketId: existing._id });
                    continue;
                }
                
                const ticket = await Ticket.create({
                    user: session.metadata.userId,
                    event: session.metadata.eventId,
                    ticketType: session.metadata.ticketType,
                    pricePaid: session.amount_total / 100,
                    paymentStatus: 'paid',
                    stripeSessionId: session.id,
                });
                
                recovered.push({ sessionId: session.id, ticketId: ticket._id, ticketCode: ticket.ticketCode, userId: session.metadata.userId });
                console.log(`[RecoverAll] Ticket CREATED: ${ticket._id} (code: ${ticket.ticketCode}) for user ${session.metadata.userId}`);
            } catch (err) {
                if (err.code === 11000) {
                    alreadyExisted.push({ sessionId: session.id, note: 'duplicate key' });
                } else {
                    errors.push({ sessionId: session.id, error: err.message });
                    console.error(`[RecoverAll] Error for session ${session.id}:`, err.message);
                }
            }
        }
        
        res.status(200).json({
            success: true,
            message: `Scanned ${ticketSessions.length} paid ticket sessions. Recovered ${recovered.length} missing tickets.`,
            data: { recovered, alreadyExisted: alreadyExisted.length, errors },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    checkoutTicket,
    claimFreeTicket,
    getUserTickets,
    getEventTicketsAdmin,
    recoverTicketFromStripe,
    recoverAllMissingTickets,
    verifyTicketSession
};
