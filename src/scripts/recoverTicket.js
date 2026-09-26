/**
 * One-time script to recover a ticket from a Stripe checkout session.
 * Usage: node src/scripts/recoverTicket.js <stripe_session_id>
 */
require('dotenv').config();
const mongoose = require('mongoose');
const stripe = require('../config/stripe');
const Ticket = require('../models/Ticket');

const sessionId = process.argv[2];

if (!sessionId) {
    console.error('Usage: node src/scripts/recoverTicket.js <stripe_session_id>');
    process.exit(1);
}

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if ticket already exists
        const existing = await Ticket.findOne({ stripeSessionId: sessionId });
        if (existing) {
            console.log('Ticket already exists for this session:', existing);
            process.exit(0);
        }

        // Fetch session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        console.log('Stripe session:', {
            id: session.id,
            payment_status: session.payment_status,
            metadata: session.metadata,
            amount_total: session.amount_total,
        });

        if (session.payment_status !== 'paid') {
            console.error(`Payment not completed. Status: ${session.payment_status}`);
            process.exit(1);
        }

        if (session.metadata?.isEventTicket !== 'true') {
            console.error('This session is not an event ticket purchase.');
            process.exit(1);
        }

        const ticket = await Ticket.create({
            user: session.metadata.userId,
            event: session.metadata.eventId,
            ticketType: session.metadata.ticketType,
            pricePaid: session.amount_total / 100,
            paymentStatus: 'paid',
            stripeSessionId: session.id,
        });

        console.log('✅ Ticket recovered successfully:', {
            ticketId: ticket._id,
            ticketCode: ticket.ticketCode,
            user: ticket.user,
            event: ticket.event,
            ticketType: ticket.ticketType,
            pricePaid: ticket.pricePaid,
        });

        process.exit(0);
    } catch (err) {
        console.error('Error recovering ticket:', err);
        process.exit(1);
    }
})();
