const { constructWebhookEvent } = require('../services/stripeService');
const { createUserFromWebhook, findByStripeCustomerId, activateMembership, deactivateMembership } = require('../services/userService');
const { sendWelcomeEmail } = require('../services/emailService');
const Donation = require('../models/Donation');

/**
 * POST /webhook
 *
 * Handles all Stripe webhook events. Requires raw body (no JSON parsing).
 * Events handled:
 *  - checkout.session.completed   → create user + send welcome email
 *  - invoice.payment_succeeded    → extend subscription end date
 *  - invoice.payment_failed       → deactivate membership
 *  - customer.subscription.deleted → deactivate membership
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
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            default:
                // Acknowledge but ignore unhandled events
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

    if (session.mode !== 'subscription') return;

    const { metadata, customer, subscription } = session;

    if (!metadata || !metadata.email) {
        console.error('checkout.session.completed: Missing metadata/email');
        return;
    }

    // Get subscription details to find current_period_end
    const stripe = require('../config/stripe');
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
    // Only handle subscription invoices (not one-off)
    if (invoice.billing_reason === 'manual') return;

    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;

    const user = await findByStripeCustomerId(customerId);
    if (!user) {
        console.warn(`invoice.payment_succeeded: No user found for customer ${customerId}`);
        return;
    }

    // Get updated period end from the subscription
    const stripe = require('../config/stripe');
    const subscriptionObj = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionEndDate = new Date(subscriptionObj.current_period_end * 1000);

    await activateMembership(user._id, subscriptionId, subscriptionEndDate);
    console.log(`Membership renewed for ${user.email} until ${subscriptionEndDate.toISOString()}`);
};

// ─── invoice.payment_failed ───────────────────────────────────────────────────
const handlePaymentFailed = async (invoice) => {
    const customerId = invoice.customer;

    const user = await findByStripeCustomerId(customerId);
    if (!user) {
        console.warn(`invoice.payment_failed: No user found for customer ${customerId}`);
        return;
    }

    await deactivateMembership(user._id);
    console.log(`Membership deactivated (payment failed) for ${user.email}`);
};

// ─── customer.subscription.deleted ───────────────────────────────────────────
const handleSubscriptionDeleted = async (subscription) => {
    const customerId = subscription.customer;

    const user = await findByStripeCustomerId(customerId);
    if (!user) {
        console.warn(`customer.subscription.deleted: No user found for customer ${customerId}`);
        return;
    }

    await deactivateMembership(user._id);
    console.log(`Membership deactivated (subscription deleted) for ${user.email}`);
};

module.exports = { handleWebhook };
