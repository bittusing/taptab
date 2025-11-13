function responseHandlerWithOptions(res, responseObject, message, error, status) {
	const { data, options } = responseObject;

	res.status(status).send({
		"error": error,
		"message": message,
		"data": data ? data : responseObject,
		"options": options
	});
	res.end();
}

function responseHandler(res, responseObject, message, error, status) {
	res.status(status).send({
		"error": error,
		"message": message,
		"data": responseObject
	});
	res.end();
}

exports.error = function(res, responseObject, message, status){
	responseHandler(res, responseObject, message, true, status);
};

exports.success = function(res, responseObject, message, status){
	responseHandler(res, responseObject, message, false, status);
};

exports.success1 = function(res, responseObject, message, status){
	responseHandlerWithOptions(res, responseObject, message, false, status);
};
