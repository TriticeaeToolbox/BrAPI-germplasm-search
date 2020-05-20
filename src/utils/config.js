'use strict';

const extend = require('deep-extend');

const CONFIG_PATH = '../../config.json';
const LOCAL_CONFIG_PATH = '../../config.local.json';

// Read Default and Local config objects
let config = require(CONFIG_PATH);
let local_config = {}
try {
    local_config = require(LOCAL_CONFIG_PATH);
}
catch(exception) {}

// Merge the config objects
extend(config, local_config);

// Export the merged config
module.exports = config;