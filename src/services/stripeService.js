const stripe = require('../config/stripe');

/**
 * Creates a Stripe Checkout Session in subscription mode.
 * All profile data is embedded in metadata so webhook can create the user.
 */
const createCheckoutSession = async (profileData) => {
    // Stripe metadata values must be strings
    const metadata = {
        title: profileData.title,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        gender: profileData.gender,
        organization: profileData.organization,
        email: profileData.email,
        hashedPassword: profileData.hashedPassword || '',
        speciality: profileData.speciality,
        addressLine1: profileData.addressLine1,
        addressLine2: profileData.addressLine2 || '',
        city: profileData.city,
        country: profileData.country,
        postCode: profileData.postCode,
        telephone: profileData.telephone,
    };

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
            {
                price: process.env.STRIPE_PRICE_ID,
                quantity: 1,
            },
        ],
        customer_email: profileData.email,
        metadata,
        subscription_data: {
            metadata, // Also attach to subscription for invoice events
        },
        success_url: process.env.STRIPE_SUCCESS_URL,
        cancel_url: process.env.STRIPE_CANCEL_URL,
    });

    return session;
};

/**
 * Creates a Stripe Billing Portal session for managing an existing subscription.
 */
const createBillingPortalSession = async (customerId) => {
    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: process.env.STRIPE_PORTAL_RETURN_URL,
    });
    return session;
};

/**
 * Creates a new Stripe Checkout Session for renewal (used when portal is not configured).
 */
const createRenewalCheckoutSession = async (customerId, email) => {
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer: customerId,
        line_items: [
            {
                price: process.env.STRIPE_PRICE_ID,
                quantity: 1,
            },
        ],
        success_url: process.env.STRIPE_SUCCESS_URL,
        cancel_url: process.env.STRIPE_CANCEL_URL,
    });
    return session;
};

/**
 * Verifies Stripe webhook signature and constructs the event.
 */
const constructWebhookEvent = (rawBody, signature) => {
    return stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
    );
};

module.exports = {
    createCheckoutSession,
    createBillingPortalSession,
    createRenewalCheckoutSession,
    constructWebhookEvent,
};
