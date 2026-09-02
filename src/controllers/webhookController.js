const { constructWebhookEvent } = require('../services/stripeService');
const { createUserFromWebhook, findByStripeCustomerId, activateMembership, deactivateMembership } = require('../services/userService');
const { sendWelcomeEmail } = require('../services/emailService');
const Donation = require('../models/Donation');
const User = require('../models/User');
const stripe = require('../config/stripe');

/**
 * Helper to find a user by stripe customer ID, email, or subscription ID
 */
const findUserByStripeData = async (customerId, customerEmail, subscriptionId) => {
    let user = null;
    if (customerId) {
        user = await User.findOne({ stripeCustomerId: customerId });
    }
    if (!user && subscriptionId) {
        user = await User.findOne({ stripeSubscriptionId: subscriptionId });
    }
    if (!user && customerEmail) {
        user = await User.findOne({ email: customerEmail.toLowerCase().trim() });
    }
    if (!user && customerId) {
        try {
            const cust = await stripe.customers.retrieve(customerId);
            if (cust && cust.email) {
                user = await User.findOne({ email: cust.email.toLowerCase().trim() });
            }
        } catch (err) {
            console.error('[Webhook] Failed to fetch customer from Stripe:', err.message);
        }
    }
    return user;
};

/**
 * POST /webhook
 *
 * Handles all Stripe webhook events. Requires raw body (no JSON parsing).
 * Events handled:
 *  - checkout.session.completed     → create user / activate + send welcome email
 *  - invoice.payment_succeeded      → extend subscription end date & ensure active
 *  - invoice.payment_failed         → deactivate membership
 *  - customer.subscription.updated  → sync subscription state & end date
 *  - customer.subscription.deleted  → deactivate membership
 */
const handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = constructWebhookEvent(req.body, sig);
        console.log('Webhook event received:', event.type);
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;
            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;
            case 'customer.subscription.updated':
            case 'customer.subscription.created':
                await handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            default:
                console.log(`Unhandled Stripe event: ${event.type}`);
        }
    } catch (err) {
        // Log error, but always return 200 to prevent Stripe retries for internal errors
        console.error(`Webhook handler error for ${event.type}: ${err.message}`, err);
    }

    // Always acknowledge receipt to Stripe immediately
    res.status(200).json({ received: true });
};

// ─── checkout.session.completed ───────────────────────────────────────────────
const handleCheckoutCompleted = async (session) => {
    // Handle one-time donation payments
    if (session.mode === 'payment' && session.metadata?.isDonation === 'true') {
        try {
            await Donation.create({
                userId: session.metadata.userId !== 'anonymous' ? session.metadata.userId : null,
                donorName: session.metadata.donorName || 'Anonymous',
                amount: session.amount_total / 100,
                currency: session.currency.toUpperCase(),
                stripeSessionId: session.id,
                paymentStatus: session.payment_status === 'paid' ? 'completed' : 'pending',
            });
            console.log(`Donation of ${(session.amount_total / 100).toFixed(2)} ${session.currency.toUpperCase()} recorded.`);
        } catch (error) {
            console.error('Error saving donation:', error);
        }
        return;
    }

    // Handle Event Tickets
    if (session.mode === 'payment' && session.metadata?.isEventTicket === 'true') {
        const Ticket = require('../models/Ticket');
        try {
            await Ticket.create({
                user: session.metadata.userId,
                event: session.metadata.eventId,
                ticketType: session.metadata.ticketType,
                pricePaid: session.amount_total / 100,
                paymentStatus: session.payment_status === 'paid' ? 'paid' : 'pending',
                stripeSessionId: session.id,
            });
            console.log(`Event ticket created for user ${session.metadata.userId} (Event: ${session.metadata.eventId}).`);
        } catch (error) {
            console.error('Error saving event ticket:', error);
        }
        return;
    }

    if (session.mode !== 'subscription') return;

    const { metadata, customer, subscription } = session;

    if (!metadata || !metadata.email) {
        console.error('checkout.session.completed: Missing metadata/email');
        return;
    }

    // Get subscription details to find current_period_end
    const subscriptionObj = await stripe.subscriptions.retrieve(subscription);

    const subscriptionStartDate = new Date(subscriptionObj.current_period_start * 1000);
    const subscriptionEndDate = new Date(subscriptionObj.current_period_end * 1000);

    const user = await createUserFromWebhook({
        metadata,
        stripeCustomerId: customer,
        stripeSubscriptionId: subscription,
        subscriptionStartDate,
        subscriptionEndDate,
    });

    // Send welcome email asynchronously (non-blocking)
    sendWelcomeEmail(user).catch((err) =>
        console.error(`Welcome email failed for ${user.email}: ${err.message}`)
    );

    console.log(`New member created: ${user.email} (${user.memberId})`);
};

// ─── invoice.payment_succeeded ────────────────────────────────────────────────
const handlePaymentSucceeded = async (invoice) => {
    // Only handle subscription invoices
    if (invoice.billing_reason === 'manual') return;

    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;
    const customerEmail = invoice.customer_email;

    const user = await findUserByStripeData(customerId, customerEmail, subscriptionId);
    if (!user) {
        console.warn(`invoice.payment_succeeded: No user found for customer ${customerId} (${customerEmail})`);
        return;
    }

    // Get updated period end from the subscription
    if (subscriptionId) {
        const subscriptionObj = await stripe.subscriptions.retrieve(subscriptionId);

        // Don't re-activate if the subscription is cancelled or not active
        if (subscriptionObj.status !== 'active' && subscriptionObj.status !== 'trialing') {
            console.log(`invoice.payment_succeeded: Skipping — subscription status is '${subscriptionObj.status}'.`);
            return;
        }

        const subscriptionEndDate = new Date(subscriptionObj.current_period_end * 1000);

        user.membershipStatus = 'active';
        user.stripeCustomerId = customerId;
        user.stripeSubscriptionId = subscriptionId;
        user.subscriptionEndDate = subscriptionEndDate;
        await user.save();

        console.log(`Membership renewed/active for ${user.email} until ${subscriptionEndDate.toISOString().split('T')[0]}`);
    }
};

// ─── customer.subscription.updated / created ─────────────────────────────────
const handleSubscriptionUpdated = async (subscription) => {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
    const subscriptionId = subscription.id;

    const user = await findUserByStripeData(customerId, null, subscriptionId);
    if (!user) {
        console.warn(`subscription.updated: No user found for customer ${customerId}`);
        return;
    }

    if (subscription.status === 'active' || subscription.status === 'trialing') {
        const subscriptionEndDate = new Date(subscription.current_period_end * 1000);
        user.membershipStatus = 'active';
        user.stripeCustomerId = customerId;
        user.stripeSubscriptionId = subscriptionId;
        user.subscriptionEndDate = subscriptionEndDate;
        await user.save();
        console.log(`Subscription updated to ACTIVE for ${user.email} (expires: ${subscriptionEndDate.toISOString().split('T')[0]})`);
    } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
        await deactivateMembership(user._id);
        console.log(`Subscription updated to INACTIVE (${subscription.status}) for ${user.email}`);
    }
};

// ─── invoice.payment_failed ───────────────────────────────────────────────────
const handlePaymentFailed = async (invoice) => {
    const customerId = invoice.customer;
    const user = await findUserByStripeData(customerId, invoice.customer_email, invoice.subscription);
    if (!user) {
        console.warn(`invoice.payment_failed: No user found for customer ${customerId}`);
        return;
    }

    await deactivateMembership(user._id);
    console.log(`Membership deactivated (payment failed) for ${user.email}`);
};

// ─── customer.subscription.deleted ───────────────────────────────────────────
const handleSubscriptionDeleted = async (subscription) => {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
    const user = await findUserByStripeData(customerId, null, subscription.id);
    if (!user) {
        console.warn(`customer.subscription.deleted: No user found for customer ${customerId}`);
        return;
    }

    await deactivateMembership(user._id);
    console.log(`Membership deactivated (subscription deleted) for ${user.email}`);
};

module.exports = { handleWebhook };
