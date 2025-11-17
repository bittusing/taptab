const walletService = require('./wallet.service');

exports.getMyWallet = async (req, res, next) => {
    try {
        const result = await walletService.getWalletDetails(req.user._id, req.query);
        return res.json({ success: true, data: result });
    } catch (error) {
        return next(error);
    }
};

exports.requestWithdrawal = async (req, res, next) => {
    try {
        const transaction = await walletService.requestWithdrawal(req.body, req.user);
        return res.json({ success: true, data: transaction });
    } catch (error) {
        return next(error);
    }
};

exports.getUserWallet = async (req, res, next) => {
    try {
        const result = await walletService.getUserWallet(req.params.userId, req.query);
        return res.json({ success: true, data: result });
    } catch (error) {
        return next(error);
    }
};

exports.updateTransactionStatus = async (req, res, next) => {
    try {
        const transaction = await walletService.updateTransactionStatus(
            req.params.transactionId,
            req.body,
            req.user
        );
        return res.json({ success: true, data: transaction });
    } catch (error) {
        return next(error);
    }
};

exports.createManualCredit = async (req, res, next) => {
    try {
        const transaction = await walletService.createManualCredit(req.body, req.user);
        return res.json({ success: true, data: transaction });
    } catch (error) {
        return next(error);
    }
};

