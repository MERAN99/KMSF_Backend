const stripe = require('../config/stripe');

/**
 * Creates a Stripe Checkout Session in subscription mode.
 * All profile data is embedded in metadata so webhook can create the user.
 */
const createCheckoutSession = async (profileData) => {
    // Stripe metadata values must be strings and cannot be null
    const rawMetadata = {
        title: profileData.title,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        gender: profileData.gender,
        organization: profileData.organization,
        email: profileData.email,
        hashedPassword: profileData.hashedPassword || '',
        speciality: profileData.speciality,
        addressLine1: profileData.addressLine1,
        addressLine2: profileData.addressLine2,
        city: profileData.city,
        country: profileData.country,
        postCode: profileData.postCode,
        telephone: profileData.telephone,
    };

    const metadata = Object.fromEntries(
        Object.entries(rawMetadata).map(([key, value]) => [key, value == null ? '' : String(value)])
    );

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
 * Creates a new Stripe Checkout Session for a one-time donation.
 */
const createDonationCheckoutSession = async (amount, currency, userId, donorName, message = '') => {
    // Stripe expects amounts in cents/pence, so amount * 100
    const metadata = {
        isDonation: 'true',
        userId: userId ? userId.toString() : 'anonymous',
        donorName: donorName || 'Anonymous',
        message: message || '',
    };

    const baseUrl = process.env.STRIPE_CANCEL_URL.replace(/\/membership$/, '');

    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: currency || 'GBP',
                    product_data: {
                        name: 'KMSF Donation',
                        description: 'One-time donation to the Kurdistan Medical & Scientific Foundation',
                    },
                    unit_amount: Math.round(amount * 100),
                },
                quantity: 1,
            },
        ],
        metadata,
        success_url: `${baseUrl}/donations?donation=success&session_id={CHECKOUT_SESSION_ID}&amount=${amount}`,
        cancel_url: `${baseUrl}/donations?donation=canceled`,
    });

    return session;
};

/**
 * Creates a new Stripe Checkout Session for buying an event ticket.
 */
const createEventTicketCheckoutSession = async (event, ticketType, amount, currency, userId) => {
    const metadata = {
        isEventTicket: 'true',
        userId: userId.toString(),
        eventId: event._id.toString(),
        ticketType: ticketType
    };

    const baseUrl = process.env.STRIPE_CANCEL_URL.replace(/\/membership$/, '');

    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: currency || 'GBP',
                    product_data: {
                        name: `Ticket for: ${event.title}`,
                        description: `Ticket Type: ${ticketType}`,
                    },
                    unit_amount: Math.round(amount * 100),
                },
                quantity: 1,
            },
        ],
        metadata,
        success_url: `${baseUrl}/ticket-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/events/${event._id}?checkout=canceled`,
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
    createDonationCheckoutSession,
    createEventTicketCheckoutSession,
    constructWebhookEvent,
};
