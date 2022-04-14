#!/usr/bin/env node
'use strict';

const path = require('path');
const express = require('express');
const cron = require('node-cron');
const api = require('./api.js');
const config = require('../utils/config.js');
const cache_update = require('../utils/cache_update.js');

// Initialize the Server
let server = express();

// Set Server middleware
server.use(express.json());

// Set API Routes
server.use('/api', function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    return next();
});
server.use('/api', api);

// Set Static Resources
server.use(express.static(path.resolve(__dirname, '../../static')));

// Start the Server
server.listen(config.port, function() {
    console.log("Server running on port " + config.port + "...");
});

// Schedule Auto-Update Service
if ( config.cache.auto_update ) {
    cron.schedule(config.cache.auto_update, cache_update);
}