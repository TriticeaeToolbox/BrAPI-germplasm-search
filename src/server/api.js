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
    let results = !req.query.results || !req.query.results === 'false';
    let status = queue.getStatus(id);

    // Complete Job
    if ( status === "complete" ) {
        let body = {
            id: id,
            results: queue.getResults(id)
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

    // Address not provided
    if ( !address ) {
        response.error(res, 400, "Database address not provided as 'address' query param");
    }

    // Get cache info
    let info = cache.info(address);
    
    // Return cache info
    if ( info ) {
        let body = {
            saved: info.saved,
            records: info.value.length
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
        }, function(db_terms) {
            queue.complete(id, db_terms);
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
    let force = req.body.force && req.body.force === 'true';
    let terms = req.body.terms;
    let search_config = req.body.config

    // Check params
    if ( !database ) {
        response.error(res, 400, "Database properties not provided as 'database' in the request body");
        return next();
    }
    if ( !database.address ) {
        response.error(res, 400, "Database address not provided as 'database.address' in the request body");
        return next();
    }
    if ( !terms || terms.length === 0 ) {
        response.error(res, 400, "Search terms not provided as 'terms' in the request body");
        return next();
    }


    // Add the Job to the Queue
    let id = queue.add(function() {

        // Get DB Terms from the cache
        let db_terms = cache.get(database.address);
        
        // Update the cache of db terms?
        if ( force || !db_terms || db_terms.length === 0 ) {
            
            // Get Fresh DB Terms
            getDBTerms(database, true, function(status, progress) {
                queue.setMessage(id, status.title, status.subtitle);
                queue.setProgress(id, progress);
            }, function(db_terms) {
                
                // Search on the DB Terms
                _search(id, terms, db_terms, search_config);

            });
        }

        // Use the cached db terms...
        else {

            // Search on the DB terms
            _search(id, terms, db_terms, search_config);

        }

    });

    // Star the Job
    queue.start(id);

    // Return a queued response
    response.queued(res, id);
    return next();


    /**
     * Perform the database search
     * @param  {string}     id            Job ID
     * @param  {string[]}   terms         Search Terms
     * @param  {Object}     db_terms      Database Terms
     * @param  {Object}     search_config Search Parameters
     */
    function _search(id, terms, db_terms, search_config) {
        search(terms, db_terms, search_config, function(status, progress) {
            console.log("PROGRESS: " + progress);
            queue.setMessage(id, status.title, status.subtitle);
            queue.setProgress(id, progress);
        }, function(matches) {
            console.log("COMPLETE");
            console.log(matches);
            queue.complete(id, matches);
        });
    }
});


module.exports = router;