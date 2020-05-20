'use strict';

const router = require('express').Router();
const response = require('./response.js');
const queue = require('./queue.js');
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
 * Get the status, progress and/or results 
 * @param  {Object}   req   Express Request
 * @param  {Object}   res   Express Response
 * @param  {Function} next  Express handler stack callback
 */
router.get('/job/:id', function(req, res, next) {
    let id = req.params.id;
    let results = req.query.results && req.query.results === 'true';
    let status = queue.getStatus(id);

    // Complete Job
    if ( status === "complete" ) {
        let body = results ? queue.getResults(id) : {};
        response.success(res, body);
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
 * @param  {Object}   req   Express Request
 * @param  {Object}   res   Express Response
 * @param  {Function} next  Express handler stack callback
 */
router.post('/search', function(req, res, next) {
    
    return next();
});


module.exports = router;