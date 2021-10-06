'use strict';

const md5 = require('md5');
const PersistentCache = require('persistent-cache');
const config = require('./config.js');


// Setup Cache Options
const cache = PersistentCache(config.cache);


/**
 * Save the terms for the specified server in the cache
 * @param  {string} address Server address
 * @param  {Object} terms   Terms to save
 */
function put(address, terms) {
    let info = {
        address: address,
        saved: new Date(),
        terms: terms
    }
    cache.putSync(md5(address), info);
}

/**
 * Get the terms for the specifed server from the cache
 * @param  {string} address Server address
 * @return {Object}         Saved terms
 */
function get(address) {
    if ( isCached(address) ) {
        return cache.getSync(md5(address)).terms;
    }
    else {
        return undefined;
    }
}

/**
 * Get cached terms and metadata info
 * @param  {string} address Server address
 * @return {Object}         Cached info{address, saved, terms}
 */
function info(address) {
    if ( isCached(address) ) {
        return cache.getSync(md5(address));
    }
    else {
        return undefined;
    }
}

/**
 * Check if there is a cached value for the specified server
 * @param  {string}  address Server address
 * @return {Boolean}         true if there is cached info
 */
function isCached(address) {
    let keys = cache.keysSync();
    return keys.includes(md5(address));
}


/**
 * Get all of the keys used by the cache
 * @return {string[]} Cache keys
 */
function keys() {
    return cache.keysSync();
}


module.exports = {
    put: put,
    get: get,
    info: info,
    isCached: isCached,
    keys: keys
}