'use strict';

const fs = require('fs');
const cache = require('memory-cache');
const md5 = require('md5');
const config = require('./config.js');

// Max time to keep the records in the cache (ms)
const TIMEOUT = config.cache.timeout;


// Automatically import on init
if ( config.cache.autoImport ) {
    importJSON();
}


/**
 * Put the value into the memory cache
 * @param  {string} key   Key of cache value
 * @param  {Object} value Value to cache
 */
function put(key, value) {
    let cache_key = _checksum(key);
    let info = {
        saved: new Date(),
        value: value
    }
    cache.put(cache_key, info, TIMEOUT);
    if ( config.cache.autoExport ) {
        exportJSON();
    }
}

/**
 * Get the value from the memory cache
 * @param  {string} key Key of cached value
 * @return {Object}     Value from cache
 */
function get(key) {
    let cache_key = _checksum(key);
    return cache.get(cache_key).value;
}

/**
 * Get cached value and metadata info
 * @param  {string} key Key of cached value
 * @return {Object}     Cached info{saved, value}
 */
function info(key) {
    if ( isCached(key) ) {
        let cache_key = _checksum(key);
        return cache.get(cache_key);
    }
    else {
        return undefined;
    }
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
 * @param  {string} [path] Path to a JSON file of an exported cache
 */
function importJSON(path) {
    path = path ? path : config.cache.export;
    try {
        if ( fs.existsSync(path) ) {
            let data = fs.readFileSync(path);
            cache.importJson(data.toString());
        }
    }
    catch(e) {
        console.log(e);
    }
}

/**
 * Export the cache to a JSON file
 * @param  {string} [path] Path of a JSON file to write the exported cache to
 */
function exportJSON(path) {
    path = path ? path : config.cache.export;
    try {
        let data = cache.exportJson();
        fs.writeFileSync(path, data);
    }
    catch(e) {
        console.log(e);
    }
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
    info: info,
    isCached: isCached,
    import: importJSON,
    export: exportJSON
}