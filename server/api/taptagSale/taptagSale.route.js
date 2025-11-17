

'use strict';

const express = require('express');
const taptagSaleController = require('./taptagSale.controller');
const authService = require('../auth/auth.service');
const { joiValidate } = require('../../helpers/apiValidation.helper.js');
const { validateSaleCreate, validateSaleList ,validateSaleUpdate } = require('./taptagSale.validation.js');

const router = express.Router();
const base = '/v1';

// ==================== Admin Routes ====================

router.get(
    base + '/qr/saleList',
   // joiValidate(validateGenerateBulk),
    authService.isAuthenticated({ role: ['Super Admin', 'Admin', 'Support Admin', 'Affiliate'] }),
    taptagSaleController.saleList
);


router.post(
    base + '/qr/saleCreate',
   joiValidate(validateSaleCreate),
    authService.isAuthenticated({ role: ['Super Admin', 'Admin', 'Support Admin', 'Affiliate'] }),
    taptagSaleController.saleCreate
);

router.put(
    base + '/true/qr/saleUpdate/:id',
    joiValidate(validateSaleUpdate),
    authService.isAuthenticated({ role: ['Super Admin', 'Admin', 'Support Admin', 'Affiliate'] }),
    taptagSaleController.saleUpdate
);

///////// make api for tag varify on add sale manually
router.get(
    base + '/qr/tagVarify/:tagId',
    //joiValidate(validateSaleList),
    authService.isAuthenticated({ role: ['Super Admin', 'Admin', 'Support Admin', 'Affiliate'] }),
    taptagSaleController.tagVarify
);


// qr/saleDetail/:id
router.get(
    base + '/qr/saleDetail/:id',
    //joiValidate(validateSaleList),
    authService.isAuthenticated({ role: ['Super Admin', 'Admin', 'Support Admin', 'Affiliate'] }),
    taptagSaleController.saleDetail
);

module.exports = router;