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

    // Get all caches
    if ( !address ) {
        let rtn = [];
        let addresses = cache.addresses();
        for ( let i = 0; i < addresses.length; i++ ) {
            let info = cache.info(addresses[i]);
            let body = {
                address: info.address,
                saved: info.saved,
                terms: info.count
            }
            rtn.push(body);
        }
        response.success(res, rtn);
        return next();
    }

    // Get cache info
    let info = cache.info(address);
    
    // Return cache info
    if ( info ) {
        let body = {
            address: info.address,
            saved: info.saved,
            terms: info.count
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
        version: version,
        auth_token: auth_token,
        call_limit: call_limit
    }

    // Add the job to the queue
    let id = queue.add(function() {
        getDBTerms(database, true, function(status, progress) {
            queue.setMessage(id, status.title, status.subtitle);
            queue.setProgress(id, progress);
        }, function(cache_key, cache_count) {
            queue.complete(id, {key: cache_key, count: cache_count});
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
    let search_config = req.body.config;
    let full_database_search = search_config.full_database_search;

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

    // Get all of the database terms for a full database search
    if ( full_database_search ) {
        terms = [];
        for ( let i = 1; i <= cache.getCount(database.address); i++ ) {
            let t = cache.get(database.address, i);
            if ( t && t.length > 0 ) {
                for ( let j = 0; j < t.length; j++ ) {
                    terms.push({
                        term: t[j].term,
                        type: t[j].type,
                        id: t[j].record.germplasmDbId
                    });
                }
            }
        }
    }

    // Add the Job to the Queue
    let id = queue.add(function() {

        // Check to see if there are any cached db terms
        let db_terms = cache.get(database.address, 1);
        
        // Update the cache of db terms?
        if ( force || !db_terms || db_terms.length === 0 ) {
            
            // Get Fresh DB Terms
            // Then search on the DB Terms
            getDBTerms(database, true, 
                function(status, progress) {
                    queue.setMessage(id, status.title, status.subtitle);
                    queue.setProgress(id, progress);
                }, 
                function(cache_key, cache_count) {
                    _search(id, terms, cache_key, cache_count, search_config);
                }
            );

        }

        // Use the Cached DB Terms to search on
        else {
            _search(id, terms, database.address, cache.getCount(database.address), search_config);
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
     * @param  {String}     cache_key     Cache Key
     * @param  {int}        cache_count   Cache Count
     * @param  {Object}     search_config Search Parameters
     */
    function _search(id, terms, cache_key, cache_count, search_config) {
        let cache_index = 1;
        let rtn = {};
        _run();

        /**
         * Start the search of the current chunk
         */
        function _run() {
            _search_chuck(id, terms, cache_key, cache_count, cache_index, search_config, _finish);
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
     * @param  {String}     cache_key     Cache Key
     * @param  {int}        cache_count   Cache Count
     * @param  {int}        cache_index   Cache Index
     * @param  {Object}     search_config Search Parameters
     * @param  {Function}   callback      Callback function(matches)
     */
    function _search_chuck(id, terms, cache_key, cache_count, cache_index, search_config, callback) {
        let ps = (100/cache_count)*cache_index-(100/cache_count);
        let pe = (100/cache_count)*cache_index;
        let pd = pe - ps;
        let db_terms = cache.get(cache_key, cache_index);
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

    // Check params
    if ( !address ) {
        response.error(res, 400, "Database address not provided as 'address' as a query param");
        return next();
    }

    // Get the number of caches
    let cache_count = cache.getCount(address);
    
    // Parse each cache
    for ( let i = 1; i <= cache_count; i++ ) {
        let terms = cache.get(address, i);

         // Find a matching term
        for ( let i = 0; i < terms.length; i++ ) {
            if ( terms[i].record && terms[i].record.germplasmDbId.toString() === id ) {
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