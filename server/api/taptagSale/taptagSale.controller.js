const taptagSaleService = require('./taptagSale.service');

exports.saleList = (req, res, next) => {
    return taptagSaleService
        .saleList(req.query, req.user)
        .then((result) => responseHandler.success(res, result, 'Sale list fetched successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};


exports.saleCreate = (req, res, next) => {
    return taptagSaleService
        .saleCreate(req.body, req.user)
        .then((result) => responseHandler.success(res, result, 'Sale created successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};


exports.saleUpdate = (req, res, next) => {
    return taptagSaleService
        .saleUpdate(req.params.id, req.body, req.user)
        .then((result) => responseHandler.success(res, result, 'Sale updated successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};


exports.tagVarify = (req, res, next) => {
    return taptagSaleService
        .tagVarify(req.params.tagId, req.user)
        .then((result) => responseHandler.success(res, result, 'Tag varified successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};

exports.saleDetail = (req, res, next) => {
    return taptagSaleService
        .saleDetail(req.params.id, req.user)
        .then((result) => responseHandler.success(res, result, 'Sale detail fetched successfully!', 200))
        .catch((error) => responseHandler.error(res, error, error.message || 'Failed', 400));
};