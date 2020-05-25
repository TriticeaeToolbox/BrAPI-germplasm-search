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
    let info = {
        saved: new Date(),
        value: value
    }
    cache.put(key, info, TIMEOUT);
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
    return cache.get(key).value;
}

/**
 * Get cached value and metadata info
 * @param  {string} key Key of cached value
 * @return {Object}     Cached info{saved, value}
 */
function info(key) {
    if ( isCached(key) ) {
        return cache.get(key);
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
    let keys = cache.keys();
    return keys.includes(key);
}


/**
 * Get all of the keys used by the cache
 * @return {string[]} Cache keys
 */
function keys() {
    return cache.keys();
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


module.exports = {
    put: put,
    get: get,
    info: info,
    isCached: isCached,
    keys: keys,
    import: importJSON,
    export: exportJSON
}