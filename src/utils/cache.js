'use strict';

const md5 = require('md5');
const PersistentCache = require('persistent-cache');
const config = require('./config.js');


// Setup Cache Options
const cache = PersistentCache(config.cache);


/**
 * Save the terms for the specified server in the cache
 * @param  {string} address Server address
 * @param  {int}    index   Cache index
 * @param  {Object} terms   Terms to save
 */
function put(address, index, terms) {
    address = _cleanAddress(address);
    let info = {
        address: address,
        saved: new Date(),
        terms: terms
    }
    cache.putSync(md5(address)+'-'+index, info);
}

/**
 * Get the terms for the specifed server from the cache
 * @param  {string} address Server address
 * @param  {int}    index   Cache index
 * @return {Object}         Saved terms
 */
function get(address, index) {
    address = _cleanAddress(address);
    if ( isCached(address, index) ) {
        return cache.getSync(md5(address)+'-'+index).terms;
    }
    else {
        return undefined;
    }
}

/**
 * Get cached terms and metadata info
 * @param  {string} address Server address
 * @return {Object}         Cached info{address, saved, count}
 */
function info(address) {
    address = _cleanAddress(address);
    if ( !isCached(address) ) {
        return undefined;
    }
    let count = getCount(address);
    let term_count = 0;
    let saved;
    for ( let i = 1; i <= count; i++ ) {
        let c = cache.getSync(md5(address)+'-'+i);
        if ( c && c.terms && c.saved ) {
            term_count = term_count + c.terms.length;
            saved = !saved || c.saved < saved ? c.saved : saved
        }
    }
    return {
        address: address,
        saved: saved,
        count: term_count
    }
}

/**
 * Check if there is a cached value for the specified server
 * @param  {string}  address Server address
 * @param  {int}     [index] Cache index to ensure
 * @return {Boolean}         true if there is cached info
 */
function isCached(address, index) {
    address = _cleanAddress(address);
    let address_key = md5(address);
    let keys = cache.keysSync();
    for ( let i = 0; i < keys.length; i++ ) {
        let key = keys[i];
        if ( key.startsWith(address_key) ) {
            if ( !index || (index || key.endsWith("-" + index)) ) {
                return true;
            }
        }
    }
    return false;
}


/**
 * Get the number of caches for the specified server
 * @param {string} address Server address
 * @returns {integer}      The count of caches for the server
 */
function getCount(address) {
    address = _cleanAddress(address);
    let address_key = md5(address);
    let count = 0;
    let keys = cache.keysSync();
    for ( let i = 0; i < keys.length; i++ ) {
        let key = keys[i];
        if ( key.startsWith(address_key) ) {
            count++;
        }
    }
    return count;
}


/**
 * Get all of the addresses in the cache
 * @return {string[]} Addresses in cache
 */
function addresses() {
    let keys = cache.keysSync();
    let addresses = [];
    for ( let i = 0; i < keys.length; i++ ) {
        addresses.push(
            cache.getSync(keys[i]).address
        );
    }
    let rtn = [...new Set(addresses)]
    return rtn;
}

/**
 * Remove all of the caches for the spcified server
 * @param {string} address Server address
 */
 function clear(address) {
    address = _cleanAddress(address);
    if ( isCached(address) ) {
        let count = getCount(address);
        for ( let i = 1; i <= count; i++ ) {
            try {
                cache.deleteSync(md5(address)+'-'+i);
            }
            catch (err) {}
        }
    }
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
    getCount: getCount,
    addresses: addresses,
    clear: clear
}