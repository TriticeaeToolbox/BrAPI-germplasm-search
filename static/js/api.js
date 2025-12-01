const API_HOST = window.location.href.split(/[?#]/)[0].replace(/\/?$/, '/') + "api";

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
 * @param  {Object}   params   DB Params
 * @param  {Function} callback Callback function(err, info)
 * @return {[type]}            [description]
 */
function getCacheInfo(address, params, callback) {
    if ( address && address != "" ) {
        const ps = _paramsToQueryString(params);
        _get("/cache?address=" + address + ps, callback);
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
    _post("/search", body, false, function(err, resp) {
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
 * @param {Object} params Database Params
 * @param {function} callback Callback function(err, record)
 */
function getGermplasmRecord(id, address, params, callback) {
    const ps = _paramsToQueryString(params);
    let path = "/germplasm/" + id + "?address=" + address + ps;
    _get(path, callback);
}


/**
 * Download a breedbase accessions template for the specified terms.  The database will 
 * determine which base template to use and the species to assume for the terms.
 * @param {string} database The URL of the database the terms will be uploaded to
 * @param {string[]} terms A list of germplasm names to add to the template
 */
function getBreedbaseTemplate(database, terms) {
    _post("/template", { database, terms }, true, function(err, resp) {
        var blob=new Blob([resp]);
        var link=document.createElement('a');
        link.href=window.URL.createObjectURL(blob);
        link.download="accessions.xlsx";
        link.click();
    });
}


/**
 * Make a GET Request
 * @param  {string}   path     API Path
 * @param  {Function} callback Callback function(err, response)
 */
function _get(path, callback) {
    _request("GET", path, undefined, false, callback);
}

/**
 * Make a PUT Request
 * @param  {string}   path     API Path
 * @param  {Object}   body     JSON Request Body
 * @param  {Function} callback Callback function(err, response)
 */
function _put(path, body, callback) {
    _request("PUT", path, body, false, callback);
}

/**
 * Make a POST Request
 * @param  {string}   path     API Path
 * @param  {Object}   body     JSON Request Body
 * @param  {Boolean}  binary   Flag to download a binary file
 * @param  {Function} callback Callback function(err, response)
 */
function _post(path, body, binary, callback) {
    _request("POST", path, body, binary, callback);
}


/**
 * Send an API Request
 * @param  {string}   method   HTTP Method
 * @param  {string}   path     API Path
 * @param  {Object}   body     JSON Request Body
 * @param  {Function} callback Callback function(err, response)
 */
function _request(method, path, body, binary, callback) {
    // console.log("--> API REQUEST [" + method + "] " + path);
    
    // Set URL to Config API Host
    let url = path.startsWith("http") ? path : API_HOST + path;

    // Set Request
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.responseType = binary ? "blob" : "text";

    // Set Error Listener
    xhr.onerror = function() {
        console.log("XHR ERROR [" + method + " " + path + "]");
        return callback(new Error("Could not make API request. Please try again later."));
    }

    // Set Load Listener
    xhr.onload = function(e) {
        if ( xhr.response ) {
            try {

                // Return response as-is
                if ( binary ) {
                    return callback(null, xhr.response);
                }

                // Parse Response to JSON
                else {
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


/**
 * Convert the params object into a query string
 * @param {Object} params Server Params
 * @returns {String} Params as query string (starting with &)
 */
function _paramsToQueryString(params) {
    let ps = "";
    Object.keys(params).forEach((key) => {
        if ( key && key !== "" ) {
            ps += `&${key}=${params[key]}`;
        }
    });
    return ps;
}
