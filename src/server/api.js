'use strict';

const router = require('express').Router();
const response = require('./response.js');
const queue = require('./queue.js');
const config = require('../utils/config.js');
const cache = require('../utils/cache.js');
const getDBTerms = require('../utils/database.js');
const search = require('../utils/search.js');


/**
 * Log API Requests to the console
 * @param  {Object}   req   Express Request
 * @param  {Object}   res   Express Response
 * @param  {Function} next  Express handler stack callback
 */
router.use(function(req, res, next) {
    let ts = new Date().toISOString();
    console.log("[API] [" + ts + "] {" + req.method + "} " + req.originalUrl);
    return next();
});


/**
 * Get a list of all supported databases
 * Or the properties of database specified by name
 * @param  {Object}   req   Express Request
 * @param  {Object}   res   Express Response
 * @param  {Function} next  Express handler stack callback
 */
router.get('/databases', function(req, res, next) {
    let name = req.query.name;
    let databases = config.databases;

    // Return a specific database
    if ( name ) {
        for ( let i = 0; i < databases.length; i++ ) {
            if ( databases[i].name.toLowerCase() === name.toLowerCase() ) {
                response.success(res, databases[i]);
                return next();
            }
        }
        response.error(res, 404, "Database not found for name " + name);
        return next();
    }

    // Return all databases
    response.success(res, databases);
    return next(); 
});


/**
 * Get the status, progress and/or results 
 * @param  {Object}   req   Express Request
 * @param  {Object}   res   Express Response
 * @param  {Function} next  Express handler stack callback
 */
router.get('/job/:id', function(req, res, next) {
    let id = req.params.id;
    let results = !(req.query.results && req.query.results === 'false');
    let status = queue.getStatus(id);

    // Complete Job
    if ( status === "complete" ) {
        let body = {
            id: id,
            results: results ? queue.getResults(id) : undefined
        }
        response.pending(res, status, body);
        return next();
    }

    // Incomplete Job
    else {
        let body = {
            id: id,
            message: queue.getMessage(id),
            progress: queue.getProgress(id)
        }
        response.pending(res, status, body);
        return next();
    }
});


/**
 * Get Cache Info for a specific address
 * @param  {Object}   req   Express Request
 * @param  {Object}   res   Express Response
 * @param  {Function} next  Express handler stack callback
 */
router.get('/cache', function(req, res, next) {
    let address = req.query.address;
    let index = req.query.index;
    let params = req.query;
    delete params.address;
    delete params.index;

    // Get all caches
    if ( !address ) {
        let rtn = [];
        let addresses = cache.addresses();
        for ( let i = 0; i < addresses.length; i++ ) {
            let info = cache.info(addresses[i].address, addresses[i].params);
            let body = {
                address: info.address,
                params: info.params,
                chunks: info.chunks,
                saved: info.saved,
                terms: info.count
            }
            rtn.push(body);
        }
        response.success(res, rtn);
        return next();
    }

    // Get cache info
    let info = cache.info(address, params, index);

    // Return cache info
    if ( info ) {
        let body = {
            address: info.address,
            params: info.params,
            chunks: info.chunks,
            saved: info.saved,
            terms: info.count,
            start: info.start,
            end: info.end
        }
        response.success(res, body);
        return next();
    }

    // Cache not found
    else {
        response.error(res, 404, "Cache not found for address " + address);
        return next();
    }
});


/**
 * Update the cache for the specified database
 * @param  {Object}   req   Express Request
 * @param  {Object}   res   Express Response
 * @param  {Function} next  Express handler stack callback
 */
router.put('/cache', function(req, res, next) {
    let address = req.body.address;
    let params = req.body.params;
    let version = req.body.version;
    let auth_token = req.body.auth_token;
    let call_limit = req.body.call_limit;

    // Address not provided
    if ( !address ) {
        response.error(res, 400, "Database address not provided as 'address' in the request body");
        return next();
    }

    // Set database properties
    let database = {
        address: address,
        params: params,
        version: version,
        auth_token: auth_token,
        call_limit: call_limit
    }

    // Add the job to the queue
    let id = queue.add(function() {
        getDBTerms(database, true, function(status, progress) {
            queue.setMessage(id, status.title, status.subtitle);
            queue.setProgress(id, progress);
        }, function(cache_address, cache_params, cache_count, term_count) {
            queue.complete(id, {address: cache_address, params: cache_params, chunks: cache_count, terms: term_count});
        });
    });

    // Start the job
    queue.start(id);

    // Return the Job ID
    response.queued(res, id);
    return next();
});



/**
 * Perform the germplasm search
 * Required body params: database.address, terms
 * Optional body params: database.version, database.auth_token, database.call_limit, force, config
 * @param  {Object}   req   Express Request
 * @param  {Object}   res   Express Response
 * @param  {Function} next  Express handler stack callback
 */
router.post('/search', function(req, res, next) {
    let database = req.body.database;
    let force = req.body.force && ( req.body.force === 'true' || req.body.force === true );
    let terms = req.body.terms;
    let search_config = req.body.config || {};
    let full_database_search = search_config.full_database_search;
    let full_database_search_options = search_config.full_database_search_options;

    // Check params
    if ( !database ) {
        response.error(res, 400, "Database properties not provided as 'database' in the request body");
        return next();
    }
    if ( !database.address ) {
        response.error(res, 400, "Database address not provided as 'database.address' in the request body");
        return next();
    }
    if ( !full_database_search && (!terms || terms.length === 0) ) {
        response.error(res, 400, "Search terms not provided as 'terms' in the request body");
        return next();
    }

    // Get all of the database terms for a full database search.
    // The database terms will be chunked by chunk_size and chunk_index.
    // This chunk_size and chunk_index is independent of the cache chunk size and indices.
    if ( full_database_search ) {
        terms = [];
        let chunk_size = parseInt(full_database_search_options.chunk_size);
        let chunk_index = parseInt(full_database_search_options.chunk_index);
        let start = (chunk_size*(chunk_index-1))+1;
        let end = chunk_size*chunk_index;

        for ( let i = 1; i <= cache.getCount(database.address, database.params); i++ ) {
            let info = cache.info(database.address, database.params, i);
            if ( (info.start <= start && info.end >= start) || (info.start <= end && info.end >= end) ) {
                let t = cache.get(database.address, database.params, i);
                let si = start <= info.start ? info.start : start;
                let ei = end >= info.end ? info.end : end;
                let sai = si - info.start;
                let eai = ei - info.start;
                let ta = terms.concat(t.slice(sai, eai+1));
                for ( let j = 0; j < ta.length; j++ ) {
                    if ( _isDBTermTypeIncluded(ta[j].type, search_config) ) {
                        terms.push({
                            term: ta[j].term,
                            type: ta[j].type,
                            id: ta[j].record.germplasmDbId || ta[j].record.crossDbId,
                            name: ta[j].record.germplasmName || ta[j].record.crossName
                        });
                    }
                }
            }
        }
    }

    // Add the Job to the Queue
    let id = queue.add(function() {

        // Check to see if there are any cached db terms
        let db_terms = cache.get(database.address, database.params, 1);
        
        // Update the cache of db terms?
        if ( force || !db_terms || db_terms.length === 0 ) {
            
            // Get Fresh DB Terms
            // Then search on the DB Terms
            getDBTerms(database, true, 
                function(status, progress) {
                    queue.setMessage(id, status.title, status.subtitle);
                    queue.setProgress(id, progress);
                }, 
                function(cache_address, cache_params, cache_count) {
                    _search(id, terms, cache_address, cache_params, cache_count, search_config);
                }
            );

        }

        // Use the Cached DB Terms to search on
        else {
            _search(id, terms, database.address, database.params, cache.getCount(database.address, database.params), search_config);
        }

    });

    // Return a queued response
    response.queued(res, id);
    next();
    
    // Start the Job
    queue.start(id);
    return;


    /**
     * Perform the database search
     * @param  {string}     id            Job ID
     * @param  {string[]}   terms         Search Terms
     * @param  {String}     address       Server address
     * @param  {Object}     params        Server params
     * @param  {int}        cache_count   Cache Count
     * @param  {Object}     search_config Search Parameters
     */
    function _search(id, terms, address, params, cache_count, search_config) {
        let cache_index = 1;
        let rtn = {};
        _run();

        /**
         * Start the search of the current chunk
         */
        function _run() {
            _search_chunk(id, terms, address, params, cache_count, cache_index, search_config, _finish);
        }

        /**
         * Handle the return of the chunk's search
         * @param {Object} matches chunk's matches
         */
        function _finish(matches) {
            
            // Process the chunk's matches
            Object.keys(matches).forEach(function(key) {
                if ( !rtn.hasOwnProperty(key) ) {
                    rtn[key] = matches[key];
                }
                else {
                    rtn[key].exact_match = !rtn[key].exact_match ? matches[key].exact_match : rtn[key].exact_match;
                    rtn[key].search_routines = rtn[key].search_routines.concat(matches[key].search_routines).filter(_unique);
                    rtn[key].matches = { ...rtn[key].matches, ...matches[key].matches };
                }
            });

            // Start the next chunk, or finish
            cache_index = cache_index + 1;
            if ( cache_index <= cache_count ) {
                _run();
            }
            else {
                queue.complete(id, rtn);
            }

        }

        /**
         * Array filter - return unique values
         */
        function _unique(value, index, self) {
            return self.indexOf(value) === index;
        }
    }

    /**
     * 
     * @param  {string}     id            Job ID
     * @param  {string[]}   terms         Search Terms
     * @param  {String}     address       Server Address
     * @param  {Object}     params        Server Params
     * @param  {int}        cache_count   Cache Count
     * @param  {int}        cache_index   Cache Index
     * @param  {Object}     search_config Search Parameters
     * @param  {Function}   callback      Callback function(matches)
     */
    function _search_chunk(id, terms, address, params, cache_count, cache_index, search_config, callback) {
        let ps = (100/cache_count)*cache_index-(100/cache_count);
        let pe = (100/cache_count)*cache_index;
        let pd = pe - ps;
        let db_terms = cache.get(address, params, cache_index);
        search(terms, db_terms, search_config,
            function(status, progress) {
                let p = ((progress/100) * pd) + ps;
                queue.setMessage(id, status.title, status.subtitle);
                queue.setProgress(id, p);
            },
            function(matches) {
                return callback(matches);
            }
        );
    }

    /**
     * Check if the specified DB Term type included in the search
     * @param  {string}  type   DB Term Type (name, synonym, accession_number)
     * @param  {Object}  config Search configuration
     * @return {Boolean}        True if the db term type is included
     */
    function _isDBTermTypeIncluded(type, config) {
        if ( type === 'name' ) {
            return config.database_terms.name;
        }
        else if ( type === 'synonym' ) {
            return config.database_terms.synonyms;
        }
        else if ( type === 'accession_number' ) {
            return config.database_terms.accession_numbers;
        }
        else {
            return false;
        }
    }
});

/**
 * Get the record of the specified germplasm
 * @param  {Object}   req   Express Request
 * @param  {Object}   res   Express Response
 * @param  {Function} next  Express handler stack callback
 */
router.get('/germplasm/:id', function(req, res, next) {
    let id = req.params.id;
    let address = req.query.address;
    let params = req.query;
    delete params.address;

    // Check params
    if ( !address ) {
        response.error(res, 400, "Database address not provided as 'address' as a query param");
        return next();
    }

    // Get the number of caches
    let cache_count = cache.getCount(address, params);
    
    // Parse each cache
    for ( let i = 1; i <= cache_count; i++ ) {
        let terms = cache.get(address, params, i);

         // Find a matching term
        for ( let i = 0; i < terms.length; i++ ) {
            if ( terms[i].record && 
                (
                    (terms[i].record.germplasmDbId && terms[i].record.germplasmDbId.toString() === id) ||
                    (terms[i].record.crossDbId && terms[i].record.crossDbId.toString() === id)
                )
            ) {
                let record = terms[i].record;
                response.success(res, record);
                return next();
            }
        }
    }

    // No terms in the cache for the address
    response.error(res, 404, "No database record found for the requested germplasm [" + id + "]");
    return next();
});

module.exports = router;