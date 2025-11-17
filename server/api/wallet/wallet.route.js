const express = require('express');
const authService = require('../auth/auth.service');
const walletController = require('./wallet.controller');
const { joiValidate } = require('../../helpers/apiValidation.helper');
const {
    validateWithdrawalRequest,
    validateTransactionStatus,
    validateManualCredit,
} = require('./wallet.validation');

const router = express.Router();
const base = '/v1';

const affiliateRoles = ['Affiliate', 'Support Admin', 'Admin', 'Super Admin'];
const adminRoles = ['Support Admin', 'Admin', 'Super Admin'];

router.get(
    base + '/wallet/me',
    authService.isAuthenticated({ role: affiliateRoles }),
    walletController.getMyWallet
);

router.post(
    base + '/wallet/withdraw',
    joiValidate(validateWithdrawalRequest),
    authService.isAuthenticated({ role: affiliateRoles }),
    walletController.requestWithdrawal
);

router.get(
    base + '/wallet/:userId',
    authService.isAuthenticated({ role: adminRoles }),
    walletController.getUserWallet
);

router.patch(
    base + '/wallet/transaction/:transactionId',
    joiValidate(validateTransactionStatus),
    authService.isAuthenticated({ role: adminRoles }),
    walletController.updateTransactionStatus
);

router.post(
    base + '/wallet/manual-credit',
    joiValidate(validateManualCredit),
    authService.isAuthenticated({ role: adminRoles }),
    walletController.createManualCredit
);

module.exports = router;

