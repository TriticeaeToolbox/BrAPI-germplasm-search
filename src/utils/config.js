'use strict';

const path = require('path');
const extend = require('deep-extend');

const CONFIG_PATH = '../../config.json';
const LOCAL_CONFIG_PATH = '../../config.local.json';


// Read default config
let config = require(CONFIG_PATH);
_updateObjectValue(config, "cache.export", function(value) {
    return _setAbsolutePath(value, path.dirname(require.resolve(CONFIG_PATH)));
});

// Read local config
let local_config = {}
try {
    local_config = require(LOCAL_CONFIG_PATH);
    _updateObjectValue(local_config, "cache.export", function(value) {
        return _setAbsolutePath(value, path.dirname(require.resolve(LOCAL_CONFIG_PATH)));
    });
}
catch(exception) {}




// Merge the config objects
extend(config, local_config);


/**
 * Update an object value with a modifier function
 * @param  {Object}   o  The object to modify
 * @param  {String}   p  The property path of the value to modify
 * @param  {Function} f  Modifier function(value) that returns the modified value
 * @return {Object}      The modified object
 */
function _updateObjectValue(o, p, f) {
    let parts = p.split('.');
    let x = o;
    for ( let i = 0; i < parts.length; i++ ) {
        if ( x ) {
            x = x[parts[i]];
        }
    }
    if ( x ) {
        let v = f(x);
        _assign(o, p, v);
    }
    return(o);
}

/**
 * Assign an object property value
 * @param  {Object} obj   Object to modify
 * @param  {string} prop  Prop path
 * @param  {Object} value Property value
 */
function _assign(obj, prop, value) {
    if (typeof prop === "string") {
        prop = prop.split(".");
    }
    if (prop.length > 1) {
        var e = prop.shift();
        _assign(obj[e] =
                 Object.prototype.toString.call(obj[e]) === "[object Object]"
                 ? obj[e]
                 : {},
               prop,
               value);
    } 
    else {
        obj[prop[0]] = value;
    }
}


/**
 * Set a relative path relative to the specified directory
 * @param {string} file      File path to update
 * @param {string} directory Directory of starting path
 */
function _setAbsolutePath(file, directory) {
    if ( file.startsWith('/') ) {
        return file;
    }
    return path.resolve(directory, file);
}


// Export the merged config
module.exports = config;