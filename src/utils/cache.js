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
    address = _cleanAddress(address);
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
    address = _cleanAddress(address);
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
    address = _cleanAddress(address);
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
    address = _cleanAddress(address);
    let keys = cache.keysSync();
    return keys.includes(md5(address));
}


/**
 * Get all of the addresses in the cache
 * @return {string[]} Addresses in cache
 */
function addresses() {
    let keys = cache.keysSync();
    let addresses = [];
    for ( let i = 0; i < keys.length; i++ ) {
        console.log(keys[i]);
        addresses.push(
            cache.getSync(keys[i]).address
        );
    }
    return addresses;
}


/**
 * Remove the trailing space from the address
 * @param {string} address Address to clean
 * @returns cleaned address
 */
function _cleanAddress(address) {
    return address.replace(/\/$/, "");
}


module.exports = {
    put: put,
    get: get,
    info: info,
    isCached: isCached,
    addresses: addresses
}