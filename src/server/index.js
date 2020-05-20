'use strict';

const express = require('express');
const config = require('../utils/config.js');
const api = require('./api.js');

// Initialize the Server
let server = express();

// Set Server middleware
server.use(express.json());

// Set API Routes
server.use('/api', api);

// Start the Server
server.listen(config.port, function() {
    console.log("Server running on port " + config.port + "...");
});