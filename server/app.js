'use strict';
require('express-async-errors');
const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
let app = express();
let server = require('http').createServer(app);
var mongoose = require('mongoose');
require('dotenv').config({
	path: __dirname + '/config/.env'
});





// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';

const config = require('./config/environment');

//make database conection
require('./config/dataSource')(config);

// Avoid TypeScript "element implicitly has an 'any' type" for global
(global).responseHandler = require('./config/responseHandler');
(global).logger = require('./config/logger')(app, config);

const expressConfig = require('./config/express');
(expressConfig.default ? expressConfig.default : expressConfig)(app);

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.use((req, res, next) => {
  res.locals.theme = 'light';
  res.locals.additionalStyles = [];
  res.locals.additionalScripts = [];
  res.locals.bodyClass = '';
  next();
});

const routes = require('./route');
(routes.default ? routes.default : routes)(app);
const errorHandling = require('./config/errorHandling');
(errorHandling.default ? errorHandling.default : errorHandling)(app, config);

// Start server
server.listen(config.port, config.ip, function () {
	(global).logger.info('Express server listening on %d, in %s mode', config.port, app.get('env'));
	console.log(" *****listening", config.port + " port On", app.get('env') + " Environment *****");
});

// Expose app
exports = module.exports = app;