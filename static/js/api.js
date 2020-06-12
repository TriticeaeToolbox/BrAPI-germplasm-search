const API_HOST = window.location.origin + "/api";

// CACHE OF DATABASES
let DATABASES = undefined;


/**
 * Get a list of supported databases
 * @param  {Function} callback Callback function(err, databases)
 */
function getDatabases(callback) {
    if ( DATABASES ) {
        return callback(null, DATABASES);
    }
    else {
        _get("/databases", function(err, databases) {
            if ( databases ) {
                DATABASES = databases;
            }
            return callback(err, DATABASES);
        });
    }
}


/**
 * Get cache info for the specified database
 * @param  {string}   address  DB Address
 * @param  {Function} callback Callback function(err, info)
 * @return {[type]}            [description]
 */
function getCacheInfo(address, callback) {
    if ( address && address != "" ) {
        _get("/cache?address=" + address, callback);
    }
    else {
        return callback();
    }
}


/**
 * Update the cache for the specified database
 * @param  {Object}   database Database properties
 * @param  {Function} callback Callback function(err, job id)
 * @return {[type]}            [description]
 */
function updateCache(database, callback) {
    _put("/cache", database, function(err, resp) {
        if ( err || !resp.job || !resp.job.id ) {
            return callback(err);
        }
        return callback(null, resp.job.id);
    });
}


/**
 * Start the search on the API Server
 * @param  {String[]}   terms    Search terms
 * @param  {Object}     database Database properties
 * @param  {Object}     config   Search config options
 * @param  {Function}   callback Callback function(err, job id)
 */
function startSearch(terms, database, config, callback) {
    let body = {
        terms: terms,
        database: database,
        config: config
    }
    _post("/search", body, function(err, resp) {
        if ( err || !resp.job || !resp.job.id ) {
            return callback(err);
        }
        return callback(null, resp.job.id);
    });
}


/**
 * Get the status and info of a job and optionally its results
 * @param  {string}   id       Job ID
 * @param  {boolean}  results  Request the results of a completed job
 * @param  {Function} callback Callback function(err, status, job|results)
 */
function getJobInfo(id, results, callback) {
    let path = "/job/" + id;
    if ( !results ) path += "?results=false";
    _get(path, function(err, resp) {
        if ( err ) {
            return callback(err);
        }
        return callback(err, resp.status, resp.job);
    });
}


/**
 * Get the record of the specified germplasm on the specified database
 * @param {string} id Germplasm Database ID
 * @param {string} address Database Address to query
 * @param {function} callback Callback function(err, record)
 */
function getGermplasmRecord(id, address, callback) {
    let path = "/germplasm/" + id + "?address=" + address;
    _get(path, callback);
}


/**
 * Make a GET Request
 * @param  {string}   path     API Path
 * @param  {Function} callback Callback function(err, response)
 */
function _get(path, callback) {
    _request("GET", path, undefined, callback);
}

/**
 * Make a PUT Request
 * @param  {string}   path     API Path
 * @param  {Object}   body     JSON Request Body
 * @param  {Function} callback Callback function(err, response)
 */
function _put(path, body, callback) {
    _request("PUT", path, body, callback);
}

/**
 * Make a POST Request
 * @param  {string}   path     API Path
 * @param  {Object}   body     JSON Request Body
 * @param  {Function} callback Callback function(err, response)
 */
function _post(path, body, callback) {
    _request("POST", path, body, callback);
}


/**
 * Send an API Request
 * @param  {string}   method   HTTP Method
 * @param  {string}   path     API Path
 * @param  {Object}   body     JSON Request Body
 * @param  {Function} callback Callback function(err, response)
 */
function _request(method, path, body, callback) {
    // console.log("--> API REQUEST [" + method + "] " + path);
    
    // Set URL to Config API Host
    let url = path.startsWith("http") ? path : API_HOST + path;

    // Set Request
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.responseType = "text";

    // Set Error Listener
    xhr.onerror = function() {
        console.log("XHR ERROR [" + method + " " + path + "]");
        return callback(new Error("Could not make API request. Please try again later."));
    }

    // Set Load Listener
    xhr.onload = function(e) {
        if ( xhr.response ) {
            try {

                // Parse Response to JSON
                var resp = JSON.parse(xhr.response);

                // console.log("--> API RESPONSE:");
                // console.log(resp);

                // Request Error
                if ( resp.status === "error" ) {
                    return callback(new Error(resp.error.message));
                }

                // Request Success
                else if ( resp.status === "success" ) {
                    return callback(null, resp.response);
                }

                // Job Status
                else if ( resp.job ) {
                    return callback(null, resp);
                }

            }
            catch(err) {
                console.log("API Response Error: " + err);
                console.log(xhr.response);
            }
        }

        // Request Failure
        return callback(new Error("Could not make API request to " + path));
    };

    // Send POST Request (w/ Content-Type and Body)
    if ( method === "POST" || method === "PUT" ) {
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(body));
    }

    // Send all other Requests
    else {
        xhr.send();
    }

}