const mongoose = require('mongoose');
const WalletTransaction = require('./wallet.model');
const TapTagSale = require('../taptagSale/taptagSale.model');
const UserModel = require('../user/user.model');

const { Types } = mongoose;

const COMPLETED_SALE_FILTER = {
    varificationStatus: 'completed',
    paymentStatus: 'completed',
};

const buildObjectId = (id) => {
    if (id instanceof Types.ObjectId) return id;
    if (!Types.ObjectId.isValid(id)) {
        throw new Error('Invalid identifier');
    }
    return new Types.ObjectId(id);
};

const getSalesSummary = async (userId) => {
    const affiliateId = buildObjectId(userId);

    const [completedSummary = {}] = await TapTagSale.aggregate([
        {
            $match: {
                SalesPerson: affiliateId,
                ...COMPLETED_SALE_FILTER,
            },
        },
        {
            $group: {
                _id: null,
                totalCommission: { $sum: '$commisionAmountOfSalesPerson' },
                totalSalesAmount: { $sum: '$totalSaleAmount' },
                totalCost: { $sum: '$castAmountOfProductAndServices' },
                totalOwnerCommission: { $sum: '$commisionAmountOfOwner' },
                cardsActivated: { $sum: 1 },
            },
        },
    ]);

    const [pendingSummary = {}] = await TapTagSale.aggregate([
        {
            $match: {
                SalesPerson: affiliateId,
                $or: [
                    { varificationStatus: { $ne: 'completed' } },
                    { paymentStatus: { $ne: 'completed' } },
                ],
            },
        },
        {
            $group: {
                _id: null,
                pendingCommission: { $sum: '$commisionAmountOfSalesPerson' },
                pendingSalesAmount: { $sum: '$totalSaleAmount' },
                pendingCards: { $sum: 1 },
            },
        },
    ]);

    return {
        completed: {
            totalCommission: completedSummary.totalCommission || 0,
            totalSalesAmount: completedSummary.totalSalesAmount || 0,
            totalCost: completedSummary.totalCost || 0,
            totalOwnerCommission: completedSummary.totalOwnerCommission || 0,
            cardsActivated: completedSummary.cardsActivated || 0,
        },
        pending: {
            pendingCommission: pendingSummary.pendingCommission || 0,
            pendingSalesAmount: pendingSummary.pendingSalesAmount || 0,
            pendingCards: pendingSummary.pendingCards || 0,
        },
    };
};

const getWithdrawalSummary = async (userId) => {
    const affiliateId = buildObjectId(userId);
    const [summary = {}] = await WalletTransaction.aggregate([
        {
            $match: {
                user: affiliateId,
                type: 'debit',
            },
        },
        {
            $group: {
                _id: null,
                totalWithdrawn: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0],
                    },
                },
                pendingWithdrawals: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0],
                    },
                },
            },
        },
    ]);

    return {
        totalWithdrawn: summary.totalWithdrawn || 0,
        pendingWithdrawals: summary.pendingWithdrawals || 0,
    };
};

exports.getWalletDetails = async (userId, options = {}) => {
    const { page = 1, limit = 20 } = options;
    const skip = (Number(page) - 1) * Number(limit);
    const affiliateId = buildObjectId(userId);

    const [salesSummary, withdrawals] = await Promise.all([
        getSalesSummary(affiliateId),
        getWithdrawalSummary(affiliateId),
    ]);

    const availableBalance = Math.max(
        (salesSummary.completed.totalCommission || 0) - (withdrawals.totalWithdrawn || 0),
        0
    );

    const transactions = await WalletTransaction.find({ user: affiliateId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();

    return {
        summary: {
            completedSales: salesSummary.completed,
            pendingSales: salesSummary.pending,
            totalWithdrawn: withdrawals.totalWithdrawn,
            pendingWithdrawals: withdrawals.pendingWithdrawals,
            availableBalance,
        },
        transactions,
        page: Number(page),
        limit: Number(limit),
    };
};

exports.requestWithdrawal = async (body, reqUser) => {
    const { amount, notes = '' } = body;
    if (!amount || amount <= 0) {
        throw new Error('Withdrawal amount must be greater than zero');
    }

    const walletDetails = await exports.getWalletDetails(reqUser._id, {
        page: 1,
        limit: 1,
    });

    if (amount > walletDetails.summary.availableBalance) {
        throw new Error('Insufficient wallet balance');
    }

    const transaction = await WalletTransaction.create({
        user: reqUser._id,
        type: 'debit',
        amount,
        status: 'pending',
        description: 'Withdrawal request',
        notes,
        balanceSnapshot: walletDetails.summary.availableBalance - amount,
        createdBy: reqUser._id,
    });

    return transaction;
};

exports.getUserWallet = async (userId, query) => {
    return exports.getWalletDetails(userId, query);
};

exports.updateTransactionStatus = async (transactionId, body, adminUser) => {
    const { status, notes } = body;
    const allowedStatus = ['pending', 'completed', 'cancelled'];
    if (!allowedStatus.includes(status)) {
        throw new Error('Invalid status value');
    }

    const transaction = await WalletTransaction.findById(transactionId);
    if (!transaction) {
        throw new Error('Transaction not found');
    }

    if (transaction.status === status) {
        return transaction;
    }

    transaction.status = status;
    if (notes !== undefined) {
        transaction.notes = notes;
    }

    if (status === 'completed') {
        transaction.approvedBy = adminUser._id;
        transaction.approvedAt = new Date();
    }

    transaction.updatedAt = new Date();
    await transaction.save();

    return transaction;
};

exports.createManualCredit = async (body, adminUser) => {
    const { userId, amount, description = '', notes = '', saleId = null } = body;
    if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than zero');
    }

    const user = await UserModel.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const transaction = await WalletTransaction.create({
        user: user._id,
        sale: saleId || null,
        type: 'credit',
        amount,
        status: 'completed',
        description: description || 'Manual credit adjustment',
        notes,
        balanceSnapshot: amount,
        createdBy: adminUser._id,
        approvedBy: adminUser._id,
        approvedAt: new Date(),
    });

    return transaction;
};

