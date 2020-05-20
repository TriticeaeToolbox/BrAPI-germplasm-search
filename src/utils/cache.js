'use strict';

const fs = require('fs');
const cache = require('memory-cache');
const md5 = require('md5');

// Max time to keep the records in the cache (ms)
const TIMEOUT = 1000*60*60*24*7*2;   // = 2 weeks


/**
 * Put the value into the memory cache
 * @param  {string} key   Key of cache value
 * @param  {Object} value Value to cache
 */
function put(key, value) {
    let cache_key = _checksum(key);
    cache.put(cache_key, value, TIMEOUT);
}

/**
 * Get the value from the memory cache
 * @param  {string} key Key of cached value
 * @return {Object}     Value from cache
 */
function get(key) {
    let cache_key = _checksum(key);
    return cache.get(cache_key);
}

/**
 * Check if there is a cached value for the specified key
 * @param  {string}  key Key of cached value
 * @return {Boolean}     true if there is a cached value
 */
function isCached(key) {
    let cache_key = _checksum(key);
    let keys = cache.keys();
    return keys.includes(cache_key);
}


/**
 * Import the cache from a JSON file
 * @param  {string} path Path to a JSON file of an exported cache
 */
function importJSON(path) {
    try {
        if ( fs.existsSync(path) ) {
            let data = fs.readFileSync(path);
            cache.importJson(data);
        }
    }
    catch(e) {}
}

/**
 * Export the cache to a JSON file
 * @param  {string} path Path of a JSON file to write the exported cache to
 */
function exportJSON(path) {
    try {
        let data = cache.exportJson();
        fs.writeFileSync(path, data);
    }
    catch(e) {}
}


/**
 * Generate an md5 checksum of the value
 * @param  {string} value Value to checksum
 * @return {string}       Checksum of value
 */
function _checksum(value) {
    return md5(value);
}


module.exports = {
    put: put,
    get: get,
    isCached: isCached,
    import: importJSON,
    export: exportJSON
}