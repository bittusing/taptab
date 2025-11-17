const mongoose = require('mongoose');

const { Schema } = mongoose;

const WalletTransactionSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        sale: {
            type: Schema.Types.ObjectId,
            ref: 'TapTagSale',
            default: null,
            index: true,
        },
        type: {
            type: String,
            enum: ['credit', 'debit'],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'cancelled'],
            default: 'pending',
            index: true,
        },
        description: {
            type: String,
            default: '',
        },
        notes: {
            type: String,
            default: '',
        },
        balanceSnapshot: {
            type: Number,
            default: 0,
        },
        meta: {
            type: Schema.Types.Mixed,
            default: {},
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        approvedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.models.WalletTransaction || mongoose.model('WalletTransaction', WalletTransactionSchema);

