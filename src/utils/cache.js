'use strict';

const md5 = require('md5');
const PersistentCache = require('persistent-cache');
const config = require('./config.js');


// Setup Cache Options
const cache = PersistentCache(config.cache);


/**
 * Save the terms for the specified server in the cache
 * @param  {string} address     Server address
 * @param  {int}    index       Cache index
 * @param  {Object} terms       Terms to save
 * @param  {int}    start       Term index of the first term
 * @param  {int}    end         Term index of the last term
 */
function put(address, index, terms, start, end) {
    address = _cleanAddress(address);
    let info = {
        address: address,
        index: index,
        start: start,
        end: end,
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
 * @param  {int}    [index] Cache index
 * @return {Object}         Cached info{address, chunks, saved, count, [start], [end]}
 */
function info(address, index) {
    address = _cleanAddress(address);
    if ( !isCached(address, index) ) {
        return undefined;
    }

    // Get max number of terms
    let chunks = getCount(address);
    let m = cache.getSync(md5(address)+'-'+chunks);
    let term_count = m.end;

    // Get info for specific cache
    if ( index ) {
        let c = cache.getSync(md5(address)+'-'+index);
        return {
            address: address,
            chunks: chunks,
            saved: c.saved,
            count: term_count,
            start: c.start,
            end: c.end
        }
    }

    // Get general info for all caches
    else {
        return {
            address: address,
            chunks: chunks,
            saved: m.saved,
            count: term_count
        }
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