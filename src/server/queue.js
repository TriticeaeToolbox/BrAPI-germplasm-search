'use strict';

const { v4: uuidv4 } = require('uuid');

let QUEUE = {};


/**
 * Add a long running function in the job queue
 * @param  {Function} f Function to run
 * @return {string}     Job ID
 */
function add(f) {
    let id = uuidv4();
    let job = {
        function: f,
        status: "pending",
        message: undefined,
        progress: undefined,
        results: undefined
    }
    QUEUE[id] = job;
    _update(id);
    return id;
}


/**
 * Start the specified job in the queue
 * @param  {string} id Job ID
 */
function start(id) {
    if ( QUEUE.hasOwnProperty(id) && QUEUE[id].status === "pending" ) {
        QUEUE[id].status = "running";
        _update(id);
        process.nextTick(function() {
            QUEUE[id].function();
        });
    }
}


/**
 * Get the status of the specified job
 * @param  {string} id Job ID
 * @return {string}    Job status
 */
function getStatus(id) {
    if ( QUEUE.hasOwnProperty(id) ) {
        return QUEUE[id].status;
    }
    return "removed";
}


/**
 * Get the message details of the specifed job
 * @param  {string} id Job Id
 * @return {Object}    Job Message Details {title, subtitle}
 */
function getMessage(id) {
    if ( QUEUE.hasOwnProperty(id) ) {
        return QUEUE[id].message;
    }
    return undefined;
}


/**
 * Get the progress of the specified job
 * @param  {string} id Job ID
 * @return {int}       Job Progress
 */
function getProgress(id) {
    if ( QUEUE.hasOwnProperty(id) ) {
        return QUEUE[id].progress;
    }
    return undefined;
}


/**
 * Get the results of the specified job and 
 * remove the job from the queue
 * @param  {string} id Job ID
 * @return {Object}    Job results
 */
function getResults(id) {
    if ( getStatus(id) === "complete" ) {
        return QUEUE[id].results;
    }
    return undefined;
}


/**
 * Set the message details of the specified job
 * @param {string} id       Job ID
 * @param {[type]} title    Message title
 * @param {[type]} subtitle Message subtitle
 */
function setMessage(id, title, subtitle) {
    if ( QUEUE.hasOwnProperty(id) ) {
        QUEUE[id].message = {
            title: title,
            subtitle: subtitle
        }
        _update(id);
    }
}


/**
 * Set the progress of the specified job
 * @param {string} id       Job ID
 * @param {int}    progress Job progress
 */
function setProgress(id, progress) {
    if ( QUEUE.hasOwnProperty(id) ) {
        QUEUE[id].progress = progress;
        _update(id);
    }
}


/**
 * Set the job as complete and add the results
 * @param  {string} id       Job ID
 * @param  {Object} results  The results of the job
 */
function complete(id, results) {
    if ( QUEUE.hasOwnProperty(id) ) {
        QUEUE[id].results = results;
        QUEUE[id].message = undefined;
        QUEUE[id].progress = undefined;
        _update(id);
        QUEUE[id].status = "complete";
    }
}


/**
 * Update the updated timestamp of the specified job
 * @param  {string} id Job ID
 */
function _update(id) {
    if ( QUEUE.hasOwnProperty(id) ) {
        QUEUE[id].updated = new Date();
    }
}



module.exports = {
    add: add, 
    start: start,
    getStatus: getStatus,
    getMessage: getMessage,
    getProgress: getProgress,
    getResults: getResults,
    setMessage: setMessage,
    setProgress: setProgress,
    complete: complete
}