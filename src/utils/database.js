'use strict';

const BrAPI = require('@solgenomics/brapijs');
const cache = require('./cache.js');

/**
 * Get all germplasm records from a BrAPI database - use cached if available otherwise 
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
 * @param  {Function} callback   Callback function(db_terms)
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
    let cache_key = brapi.brapi.brapi_base_url;

    // Set initial progress status
    if ( progress ) {
        progress({
            title: "Getting germplasm entries from the database", 
            subtitle: "This will take a few moments..."
        }, -1);
    }
    
    // Return cached records, if available and allowed
    if ( !force && cache.isCached(cache_key) ) {
        return callback(cache.get(cache_key));
    }

    // Get fresh germplasm records
    _getFreshDBTerms(brapi, progress, function(db_terms) {
        cache.put(cache_key, db_terms);
        return callback(db_terms);
    });
}


/**
 * Get fresh germplasm records from the database and parse out the 
 * terms to search on (database name, synonyms, etc)
 * @param  {BrAPI}    brapi    BrAPI Node
 * @param  {Function} progress Progress callback function
 * @param  {Function} callback Callback function(db_terms)
 */
function _getFreshDBTerms(brapi, progress, callback) {
    if ( progress ) {
        progress({
            title: "Getting germplasm entries from the database", 
            subtitle: "This will take a few moments..."
        }, -1);
    }

    let count = 0;
    let total = undefined;
    let db_terms = [];
    
    brapi
        .germplasm({pageSize: 1000})
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

            db_terms.push({
                term: datum.germplasmName.trim(),
                type: "name",
                record: record
            });
            for ( let i = 0; i < datum.synonyms.length; i++ ) {
                db_terms.push({
                    term: datum.synonyms[i].trim(),
                    type: "synonym",
                    record: record
                });
            }
        })
        .all(function(resp) {
            return callback(db_terms);
        });
}


module.exports = getDBTerms;
