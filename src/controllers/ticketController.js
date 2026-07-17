const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { createEventTicketCheckoutSession } = require('../services/stripeService');

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
        const tickets = await Ticket.find({ user: user._id })
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

module.exports = {
    checkoutTicket,
    claimFreeTicket,
    getUserTickets,
    getEventTicketsAdmin
};
