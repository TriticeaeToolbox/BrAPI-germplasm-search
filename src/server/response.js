'use strict';

/**
 * Send an Error Response
 * @param  {Object} res     Express Response
 * @param  {int}    code    HTTP Status Code
 * @param  {string} message Error Message
 */
function error(res, code, message) {
    res.status(code);
    let resp = {
        status: "error",
        error: {
            code: code,
            message: message
        }
    }
    res.json(resp);
}

/**
 * Send a Success Response
 * @param  {Object} res     Express Response
 * @param  {Object} body    Body of the Response
 */
function success(res, body) {
    res.status(200);
    let resp = {
        status: "success",
        response: body
    }
    res.json(resp);
}

/**
 * Send a queued job response
 * @param  {Object} res Express Response
 * @param  {string} id  Job ID
 */
function queued(res, id) {
    res.status(202);
    let resp = {
        status: 'queued',
        job: {
            id: id
        }
    }
    res.json(resp);
}


/**
 * Send a pending job response
 * @param  {Object} res    Express Response
 * @param  {string} status Job Status
 * @param  {Object} job    Job information
 */
function pending(res, status, job) {
    res.status(202);
    let resp = {
        status: status,
        job: job
    }
    res.json(resp);
}


module.exports = {
    error: error,
    success: success,
    queued: queued,
    pending: pending
}