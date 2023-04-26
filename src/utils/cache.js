'use strict';

const md5 = require('md5');
const PersistentCache = require('persistent-cache');
const config = require('./config.js');


// Setup Cache Options
const cache = PersistentCache(config.cache);


/**
 * Save the terms for the specified server in the cache
 * @param  {string} address     Server address
 * @param  {Object} params      Server params
 * @param  {int}    index       Cache index
 * @param  {Object} terms       Terms to save
 * @param  {int}    start       Term index of the first term
 * @param  {int}    end         Term index of the last term
 */
function put(address, params, index, terms, start, end) {
    const key = _addressKey(address, params);
    let info = {
        address: address,
        params: params,
        index: index,
        start: start,
        end: end,
        saved: new Date(),
        terms: terms
    }
    cache.putSync(key+'-'+index, info);
}

/**
 * Get the terms for the specifed server from the cache
 * @param  {string} address Server address
 * @param  {Object} params  Server params
 * @param  {int}    index   Cache index
 * @return {Object}         Saved terms
 */
function get(address, params, index) {
    const key = _addressKey(address, params)
    if ( isCached(address, params) ) {
        return cache.getSync(key+'-'+index).terms;
    }
    else {
        return undefined;
    }
}

/**
 * Get cached terms and metadata info
 * @param  {string} address  Server address
 * @param  {Object} [params] Server params
 * @param  {int}    [index]  Cache index
 * @return {Object}          Cached info{address, chunks, saved, count, [start], [end]}
 */
function info(address, params, index) {
    const key = _addressKey(address, params);
    if ( !isCached(address, params) ) {
        return undefined;
    }

    // Get max number of terms
    let chunks = getCount(address, params);
    let m = cache.getSync(key+'-'+chunks);
    let term_count = m ? m.end : 0;

    // Get info for specific cache
    if ( index ) {
        let c = cache.getSync(key+'-'+index);
        return {
            address: address,
            params: params,
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
            params: params,
            chunks: chunks,
            saved: m ? m.saved : undefined,
            count: term_count
        }
    }
}

/**
 * Check if there is a cached value for the specified server
 * @param  {string}  address  Server address
 * @param  {Object}  [params] Server params
 * @param  {int}     [index]  Cache index to ensure
 * @return {Boolean}          true if there is cached info
 */
function isCached(address, params, index) {
    const key = _addressKey(address, params)
    let keys = cache.keysSync();
    for ( let i = 0; i < keys.length; i++ ) {
        let k = keys[i];
        if ( k.startsWith(key) ) {
            if ( !index || (index || k.endsWith("-" + index)) ) {
                return true;
            }
        }
    }
    return false;
}


/**
 * Get the number of caches for the specified server
 * @param {string} address  Server address
 * @param {Object} [params] Server params
 * @returns {integer}       The count of caches for the server
 */
function getCount(address, params) {
    const key = _addressKey(address, params);
    let count = 0;
    let keys = cache.keysSync();
    for ( let i = 0; i < keys.length; i++ ) {
        let k = keys[i];
        if ( k.startsWith(key) ) {
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
    let seen = [];
    let addresses = [];
    for ( let i = 0; i < keys.length; i++ ) {
        const c = cache.getSync(keys[i]);
        if ( c && c.address ) {
            if ( !seen.includes(c.address) ) {
                addresses.push({
                    address: c.address,
                    params: c.params
                });
                seen.push(c.address);
            }
        }
    }
    return addresses;
}

/**
 * Remove all of the caches for the spcified server
 * @param {string} address  Server address
 * @param {Object} [params] Server params
 */
 function clear(address, params) {
    const key = _addressKey(address, params);
    if ( isCached(address, params) ) {
        let count = getCount(address, params);
        for ( let i = 1; i <= count; i++ ) {
            try {
                cache.deleteSync(key+'-'+i);
            }
            catch (err) {}
        }
    }
}


/**
 * Get the md5 key of the specified database
 * @param {String} address Database Address
 * @param {Object} [params] Database Params
 * @returns {String} Address key composed of address and params
 */
function _addressKey(address, params) {
    address = address.replace(/\/$/, "");
    params = params && JSON.stringify(params) !== '{}' ? JSON.stringify(params, Object.keys(params).sort()) : '';
    return md5(address + params);
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