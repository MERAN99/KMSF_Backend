const User = require('../models/User');
const { generateMemberId } = require('../utils/memberId');

/**
 * Creates a new user document from Stripe webhook metadata.
 * Called ONLY from checkout.session.completed webhook handler.
 */
const createUserFromWebhook = async ({ metadata, stripeCustomerId, stripeSubscriptionId, subscriptionStartDate, subscriptionEndDate }) => {
    // Find existing user by email (covers registered-then-paying flow)
    const existing = await User.findOne({ email: metadata.email.toLowerCase() });
    if (existing) {
        // Always update membership fields on every successful payment
        existing.stripeCustomerId = stripeCustomerId;
        existing.stripeSubscriptionId = stripeSubscriptionId;
        existing.membershipStatus = 'active';
        existing.subscriptionStartDate = subscriptionStartDate;
        existing.subscriptionEndDate = subscriptionEndDate;
        await existing.save();
        return existing;
    }

    const memberId = await generateMemberId();

    const user = new User({
        title: metadata.title,
        firstName: metadata.firstName,
        lastName: metadata.lastName,
        gender: metadata.gender,
        organization: metadata.organization,
        email: metadata.email.toLowerCase(),
        password: metadata.hashedPassword || undefined,
        speciality: metadata.speciality,
        addressLine1: metadata.addressLine1,
        addressLine2: metadata.addressLine2,
        city: metadata.city,
        country: metadata.country,
        postCode: metadata.postCode,
        telephone: metadata.telephone,
        role: 'member',
        membershipStatus: 'active',
        memberId,
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionStartDate,
        subscriptionEndDate,
    });

    await user.save();
    return user;
};

/**
 * Find user by email.
 */
const findByEmail = (email) => User.findOne({ email: email.toLowerCase() }).select('+password');

/**
 * Find user by Stripe customer ID.
 */
const findByStripeCustomerId = (customerId) => User.findOne({ stripeCustomerId: customerId });

/**
 * Find user by Stripe subscription ID.
 */
const findByStripeSubscriptionId = (subscriptionId) =>
    User.findOne({ stripeSubscriptionId: subscriptionId });

/**
 * Activate membership after successful payment / renewal.
 */
const activateMembership = (userId, stripeSubscriptionId, subscriptionEndDate) =>
    User.findByIdAndUpdate(
        userId,
        {
            membershipStatus: 'active',
            stripeSubscriptionId,
            subscriptionEndDate,
        },
        { new: true }
    );

/**
 * Deactivate membership on payment failure or subscription deletion.
 */
const deactivateMembership = (userId) =>
    User.findByIdAndUpdate(userId, { membershipStatus: 'inactive' }, { new: true });

module.exports = {
    createUserFromWebhook,
    findByEmail,
    findByStripeCustomerId,
    findByStripeSubscriptionId,
    activateMembership,
    deactivateMembership,
};
