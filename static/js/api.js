const API_HOST = window.location.origin + "/api";

// API CACHES
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
 * Make a GET Request
 * @param  {string}   path     API Path
 * @param  {Function} callback Callback function(err, response)
 */
function _get(path, callback) {
    _request("GET", path, undefined, callback);
}


/**
 * Send an API Request
 * @param  {string}   method   HTTP Method
 * @param  {string}   path     API Path
 * @param  {Object}   body     JSON Request Body
 * @param  {Function} callback Callback function(err, response)
 */
function _request(method, path, body, callback) {
    console.log("--> API REQUEST [" + method + "] " + path);
    
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

                console.log("--> API RESPONSE:");
                console.log(resp);

                // Request Error
                if ( resp.status === "error" ) {
                    return callback(new Error("[" + resp.error.type + "] " + resp.error.message));
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