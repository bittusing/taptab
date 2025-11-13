'use strict';

// import errorHandler from 'errorhandler';

module.exports = function (config) {
    const mongoose = require('mongoose');
    mongoose.Promise = global.Promise;
    // Connect to database
    mongoose.connect(config.mongo.uri, config.mongo.options).then((res) => {
        if (config.seedDB) {
            mongoose.connection.db.dropDatabase();
        }
        console.log("MongoDB connected successfully"); 
    }).catch((error) => {
        console.log("MongoDB connection error: " + error);
    });
    mongoose.connection.on('error', function (err) {
        console.error('MongoDB connection error: ' + err);
        process.exit(-1);
    });
}