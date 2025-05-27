'use strict';

const BrAPI = require('@solgenomics/brapijs');
const cache = require('./cache.js');
const config = require('./config.js');

const CACHE_CHUNK_SIZE = config.cache.chunk_size;

/**
 * Get cache info for germplasm records from a BrAPI database - use existing cache if available otherwise 
 * request fresh records from the database
 * Database Properties:
 *     {string}  address = (required) The address for the database BrAPI endpoints (ex: https://wheat.triticeaetoolbox.org/brapi/v1)
 *     {string}  version = The BrAPI version identifier (ex: v1.3)
 *     {string}  auth_token = A BrAPI Auth Token
 *     {int}     call_limit = The maximum number of simultaneous requests to the BrAPI server
 * Parsed Databse Terms:
 * @param  {Object}   database   BrAPI Database properties
 * @param  {boolean}  [force]    Ignore cached database terms and request fresh ones
 * @param  {Function} [progress] Progress callback({title, subtitle}, progress)
 * @param  {Function} callback   Callback function(cache_address, cache_params, cache_count, term_count)
 */
function getDBTerms(database, force, progress, callback) {

    // Set parameters
    if ( !callback && !progress && typeof force === 'function' ) {
        callback = force;
        force = false;
        progress = undefined;
    }
    else if ( !callback && typeof progress === 'function' && typeof force === 'boolean' ) {
        callback = progress;
        progress = undefined;
    }
    else if ( !callback && typeof progress === 'function' && typeof force === 'function' ) {
        callback = progress;
        progress = force;
        force = false;
    }

    // Check Parameters
    if ( !database ) {
        throw("BrAPI database properties not provided");
    }
    else if ( !database.address || typeof database.address !== 'string' ) {
        throw("BrAPI database address is required");
    }
    else if ( typeof callback !== 'function' ) {
        throw("callback must be a function");
    }
    else if ( progress && typeof progress !== 'function' ) {
        throw("progress must be a function");
    }
    else if ( force && typeof force !== 'boolean' ) {
        throw("force must be a boolean set to true or false");
    }

    // Create BrAPI Node
    let brapi = BrAPI(database.address, database.version, database.auth_token, database.call_limit);
    let brapi2 = BrAPI(database.address.replace(/\/v1\/?$/, '/v2'), 'v2', database.auth_token, database.call_limit);
    // The /crosses endpoint is only supported with v2 of BrAPI

    // Return cached records, if available and allowed
    if ( !force && cache.isCached(database.address, database.params) ) {
        return callback(database.address, database.params, cache.getCount(database.address, database.params));
    }

    // Get fresh germplasm records
    _getFreshGermplasm(brapi, database.address, database.params, progress, function(germplasm_cache_count, germplasm_term_count) {
        let init_cache_index = germplasm_cache_count+1;
        let init_start_index = germplasm_term_count+1;
        _getFreshCrosses(brapi2, database.address, database.params, init_cache_index, init_start_index, progress, function(crosses_cache_count, crosses_term_count) {
            return callback(database.address, database.params, crosses_cache_count, germplasm_term_count+crosses_term_count);
        });
    });
}


/**
 * Get fresh germplasm records from the database and parse out the 
 * terms to search on (database name, synonyms, etc)
 * @param  {BrAPI}    brapi     BrAPI Node
 * @param  {String}   address   The server address
 * @param  {Object}   params    The server params
 * @param  {Function} progress  Progress callback function
 * @param  {Function} callback  Callback function(cache_count, term_count)
 */
function _getFreshGermplasm(brapi, address, params, progress, callback) {
    let brapi_version = parseInt(brapi.brapi.version.major);

    if ( progress ) {
        progress({
            title: "Getting germplasm entries from the database", 
            subtitle: "This will take a few moments..."
        }, -1);
    }

    // Clear the existing cache
    cache.clear(address, params);

    // Make the BrAPI request for the Germplasm
    let count = 0;
    let total = undefined;
    let db_terms = [];
    let cache_index = 1;
    let start_index = 1;
    let end_index = 0;

    try {
        brapi
            .germplasm({pageSize: 1000, ...params})
            .each(function(datum, key) {
                if ( !total ) {
                    total = datum.__response.metadata.pagination.totalCount;
                }
                count++;
                if ( count % 50 === 0 ) {
                    if ( progress ) {
                        progress({
                            title: "Getting germplasm entries from the database",
                            subtitle: "This will take a few moments..."
                        }, (count/total)*100);
                    }
                }

                // Get the record from the datum
                let record = datum;
                delete record.__response;

                // DB Terms to collect from the response
                let names = [];
                let synonyms = [];
                let accession_numbers = [];

                // Collect DB Terms BrAPI v1
                if ( brapi_version === 1 ) {
                    let gn = datum.germplasmName;
                    let dn = datum.defaultDisplayName;
                    let syns = datum.synonyms;
                    let an = datum.accessionNumber;
                    let ans = an && an !== '' ? an.split(',') : [];

                    names.push(gn);
                    if ( gn.toUpperCase() !== dn.toUpperCase() ) {
                        names.push(dn);
                    }
                    synonyms = syns;
                    accession_numbers = ans;
                }

                // Collect DB Terms for BrAPI v2
                else if ( brapi_version === 2 ) {
                    let gn = datum.germplasmName;
                    let dn = datum.defaultDisplayName;
                    let syns = datum.synonyms;
                    let an = datum.accessionNumber;
                    let ans = an && an !== '' ? an.split(',') : [];

                    names.push(gn);
                    if ( gn.toUpperCase() !== dn.toUpperCase() ) {
                        names.push(dn);
                    }
                    syns.forEach(function(syn) {
                        if ( syn && syn.synonym ) {
                            synonyms.push(syn.synonym)
                        }
                    });
                    accession_numbers = ans;
                }

                // Unsupported BrAPI version
                else {
                    throw("Unsupported BrAPI Version " + JSON.stringify(brapi.brapi.version));
                }

                // Add DB Terms to Results
                names.forEach(function(name) {
                    db_terms.push({
                        term: name.trim(),
                        type: "name",
                        record: record,
                    });
                    end_index++;
                });
                synonyms.forEach(function(synonym) {
                    db_terms.push({
                        term: synonym.trim(),
                        type: "synonym",
                        record: record
                    });
                    end_index++;
                });
                accession_numbers.forEach(function(accession_number) {
                    db_terms.push({
                        term: accession_number.trim(),
                        type: "accession_number",
                        record: record
                    });
                    end_index++;
                });

                if ( db_terms.length >= CACHE_CHUNK_SIZE ) {
                    cache.put(address, params, cache_index, db_terms, start_index, end_index);
                    db_terms = [];
                    cache_index++;
                    start_index = end_index+1;
                }
            })
            .all(function() {
                cache.put(address, params, cache_index, db_terms, start_index, end_index);
                return callback(cache_index, end_index);
            });
    }
    catch (err) {
        console.log(`ERROR: Could not fetch germplasm [${err}]`);
        return callback(cache_index, end_index);
    }
}



/**
 * Get fresh cross records from the database
 * @param  {BrAPI}    brapi     BrAPI Node
 * @param  {String}   address   The server address
 * @param  {Object}   params    The server params
 * @param  {int}      init_cache_index The cache index number to start using for the crosses
 * @param  {int}      init_start_index The start index number to start using for the crosses
 * @param  {Function} progress  Progress callback function
 * @param  {Function} callback  Callback function(cache_count, term_count)
 */
function _getFreshCrosses(brapi, address, params, init_cache_index, init_start_index, progress, callback) {
    let brapi_version = parseInt(brapi.brapi.version.major);

    if ( progress ) {
        progress({
            title: "Getting cross entries from the database",
            subtitle: "This will take a few moments..."
        }, -1);
    }

    // Make the BrAPI request for the Crosses
    let count = 0;
    let total = undefined;
    let db_terms = [];
    let cache_index = init_cache_index;
    let start_index = init_start_index;
    let end_index = init_start_index;

    try {
        brapi
            .crosses({pageSize: 1000, ...params})
            .each(function(datum, key) {
                if ( !total ) {
                    total = datum.__response.metadata.pagination.totalCount;
                }
                count++;
                if ( count % 50 === 0 ) {
                    if ( progress ) {
                        progress({
                            title: "Getting cross entries from the database", 
                            subtitle: "This will take a few moments..."
                        }, (count/total)*100);
                    }
                }

                // Get the record from the datum
                let record = datum;
                delete record.__response;

                // DB Terms to collect from the response
                let names = [];

                // Collect DB Terms for BrAPI v2
                if ( brapi_version === 2 ) {
                    let n = datum.crossName;

                    names.push(n);
                }

                // Unsupported BrAPI version
                else {
                    throw("Unsupported BrAPI Version " + JSON.stringify(brapi.brapi.version));
                }

                // Add DB Terms to Results
                names.forEach(function(name) {
                    db_terms.push({
                        term: name.trim(),
                        type: "cross",
                        record: record,
                    });
                    end_index++;
                });

                if ( db_terms.length >= CACHE_CHUNK_SIZE ) {
                    cache.put(address, params, cache_index, db_terms, start_index, end_index);
                    db_terms = [];
                    cache_index++;
                    start_index = end_index+1;
                }
            })
            .all(function() {
                cache.put(address, params, cache_index, db_terms, start_index, end_index);
                return callback(cache_index, end_index);
            });
    }
    catch (err) {
        console.log(`ERROR: Could not fetch crosses [${err}]`);
        return callback(cache_index, end_index)
    }
}

module.exports = getDBTerms;
