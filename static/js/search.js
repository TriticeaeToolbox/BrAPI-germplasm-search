/**
 * Perfrom and handle the search
 * @param  {string[]}   terms     Search Terms
 * @param  {Object}     database  Database properties
 * @param  {boolean}    force     Force download of new records
 * @param  {Object}     config    Search Config
 */
function search(terms, database, force, config) {
    if ( force ) {
        _updateGermplasm(database, function() {
            _startSearch(terms, database, config, displayMatches);
        });
    }
    else {
        _startSearch(terms, database, config, displayMatches);
    }
}


/**
 * Update the Germplasm Cache
 * @param  {Object}   database Database Properties
 * @param  {Function} callback Callback function()
 */
function _updateGermplasm(database, callback) {
    updateCache(database, function(err, id) {
        if ( err || !id ) {
            console.log(err);
            return displayError("Could not update germplasm records");
        }
        _watchJob(id, false, "Updating Germplasm Records", callback);
    });
}


/**
 * Start the germplasm search
 * @param  {string[]}   terms     Search Terms
 * @param  {Object}     database  Database properties
 * @param  {Object}     config    Search Config
 * @param {Function}    callback  Callback function(matches)
 */
function _startSearch(terms, database, config, callback) {
    startSearch(terms, database, config, function(err, id) {
        if ( err || !id ) {
            console.log(err);
            return displayError("Could not start the germplasm search");
        }
        _watchJob(id, true, "Performing Search", function(job) {
            let rtn = job && job.results ? job.results : {}
            return callback(rtn);
        });
    });
}


/**
 * Watch a running job and update the progress
 * @param  {string}   id       Job ID
 * @param  {boolean}  results  True to get results from completed job
 * @param  {string}   title    Job Title (displayed on website)
 * @param  {Function} callback Callback function(results)
 */
function _watchJob(id, results, title, callback) {
    getJobInfo(id, results, function(err, status, info) {
        if ( status === 'complete' ) {
            updateProgress(title, {title: '', subtitle: ''}, 100);
        }
        else if ( info && info.message && info.progress ) {
           updateProgress(title, info.message, info.progress); 
        }

        if ( status === "complete" ) {
            return callback(info);
        }
        else if ( ['queued', 'pending', 'running'].includes(status) ) {
            setTimeout(function() {
                _watchJob(id, results, title, callback)
            }, 1500)
        }
    });
}