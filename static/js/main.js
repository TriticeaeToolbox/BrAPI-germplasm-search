let MATCHES = {};
let EDIT_DATABASE_TOGGLED = false;
let MAX_SEARCH_TERMS = 1000;

/**
 * Set the Database Selection menu options
 * @param {string|int} [selected] Index or name of selected database
 * @param {Function} [callback] Callback function(databases)
 */
function setDatabases(selected, callback) {
    
    // Set element names
    let select = "#database-select";
    let edit = "#edit-database";
    let settings = "#database-settings";
    let settings_inputs = ".database-setting";
    let settings_database_address = "#database-address";
    let settings_database_version = "#database-version";
    let settings_database_auth_token = "#database-auth-token";
    let settings_database_call_limit = "#database-call-limit";
    let cache_switch = "#use-cache";
    let cache_available_info = "#cache-available-info";
    let cache_available_date = "#cache-available-date";
    let cache_unavailable_info = "#cache-unavailable-info";

    // Get supported Databases
    getDatabases(function(err, databases) {
        if ( err ) {
            console.log(err);
            alert("Could not get database list.  Please refresh the page and try again.")
        }

        // Get the selected index
        let selected_index = undefined;
        if ( selected && Number.isInteger(parseInt(selected)) ) {
            selected_index = selected;
        }
        else if ( selected && selected.toLowerCase() === "custom" ) {
            selected_index = databases.length;
        }
        else if ( selected && databases ) {
            for ( let i = 0; i < databases.length; i++ ) {
                if ( databases[i].name.toLowerCase() === selected.toLowerCase() ) {
                    selected_index = i;
                }
            }
        }
        
        // Set the Select options
        let html = "";
        if ( databases ) {
            for ( let i = 0; i < databases.length; i++ ) {
                let db = databases[i];
                html += "<option value='" + i + "'";
                if ( selected_index && parseInt(selected_index) === i ) html += " selected";
                html += ">"
                html += db.name + " (" + db.address + ")";
                if ( db.version ) html += " [" + db.version + "]";
                html += "</option>";
            }
        }
        html += "<option value='custom'";
        if ( selected_index && parseInt(selected_index) === databases.length ) html += " selected";
        html += ">Custom</option>";
        $(select).html(html);

        // Set the Select listener
        $(select).change(_databaseChanged);
        $(settings_database_address).change(_databaseAddressChanged);
        _databaseChanged();

        // Return to callback
        if ( callback ) return callback(databases);

        /**
         * Listener for selected database change
         */
        function _databaseChanged() {
            let selected = $(select + " option:selected").val();
            if ( selected === 'custom' ) {
                $(settings_inputs).val('');
                $(settings).show();
                $(edit).attr('disabled', true);
            }
            else {  
                $(edit).attr('disabled', false);
                if ( !EDIT_DATABASE_TOGGLED ) $(settings).hide();
                let database = databases[selected];
                $(settings_database_address).val(database.address);
                $(settings_database_version).val(database.version);
                $(settings_database_auth_token).val(database.auth_token);
                $(settings_database_call_limit).val(database.call_limit);
            }
            _databaseAddressChanged();
        }

        /**
         * Listener for database address change
         */
        function _databaseAddressChanged() {
            let db_address = $(settings_database_address).val();
            // TODO: Update address cache info
        }

    });
}


/**
 * Set custom database properties
 * @param {string} address    DB Address
 * @param {string} version    DB Version
 * @param {string} auth_token DB Auth Token
 * @param {int}    call_limit DB Call Limit
 */
function setDatabaseProperties(address, version, auth_token, call_limit) {
    if ( address || version || auth_token || call_limit ) {
        setDatabases("custom", function() {
            $("#database-settings").show();
            if ( address ) $("#database-address").val(address);
            if ( version ) $("#database-version").val(version);
            if ( auth_token ) $("#database-auth-token").val(auth_token);
            if ( call_limit ) $("#database-call-limit").val(call_limit);
        });
    }
}


/**
 * Set search options
 * @param {string} include_synonyms      Include Synonyms
 * @param {string} include_punctuation   Include Punctuation
 * @param {string} include_edit_distance Include Edit Distance
 * @param {string} max_edit_distance     Max Edit Distance
 * @param {string[]} terms               Search Terms
 */
function setOptions(include_synonyms, include_punctuation, include_edit_distance, max_edit_distance, terms) {
    if ( include_synonyms ) {
      if ( ['true', '1', 'on'].includes(include_synonyms.toLowerCase()) ) {
        $("#include-synonyms").attr('checked', true);
      }
      else if ( ['false', '0', 'off'].includes(include_synonyms.toLowerCase()) ) {
        $("#include-synonyms").attr('checked', false);
      }
    }
    if ( include_punctuation ) {
      if ( ['true', '1', 'on'].includes(include_punctuation.toLowerCase()) ) {
        $("#include-punctuation").attr('checked', true);
      }
      else if ( ['false', '0', 'off'].includes(include_punctuation.toLowerCase()) ) {
        $("#include-punctuation").attr('checked', false);
      }
    }
    if ( include_edit_distance ) {
      if ( ['true', '1', 'on'].includes(include_edit_distance.toLowerCase()) ) {
        $("#include-edit-distance").attr('checked', true);
      }
      else if ( ['false', '0', 'off'].includes(include_edit_distance.toLowerCase()) ) {
        $("#include-edit-distance").attr('checked', false);
      }
    }
    if ( max_edit_distance ) {
      $("#max-edit-distance").val(max_edit_distance);
    }
    if ( terms && terms.length > 0 ) {
      $("#input-terms").val(terms.join('\n'));
    }
}


/**
 * Toggle the display of the database settings container
 */
function toggleEditDatabase() {
    EDIT_DATABASE_TOGGLED = !EDIT_DATABASE_TOGGLED;
    $("#database-settings").toggle();
}


/**
 * Start the Search
 */
function startSearch() {

    // Disable the search button
    $("#search").attr("disabled", true);

    // Get database properties
    let database = {
        address: $("#database-address").val(),
        version: $("#database-version").val(),
        auth_token: $("#database-auth-token").val(),
        call_limit: $("#database-call-limit").val()
    }

    // BrAPI needs at least an address
    if ( !database.address || database.address === "" ) {
        return displayError("A database address / URL is required");
    }

    // Get search parameters
    let config = {};
    config.exact = true;
    config.synonyms = $("#include-synonyms").prop("checked");
    config.punctuation = $("#include-punctuation").prop("checked");
    config.edit_distance = $("#include-edit-distance").prop("checked");
    config.max_edit_distance = $("#max-edit-distance").val();
    
    // Get search terms
    let t = $("#input-terms").val();
    t = t.replace(/\n/g, ",").split(',');
    let terms = [];
    for ( let i = 0; i < t.length; i++ ) {
        let x = t[i].trim();
        if ( x && x !== "" ) {
            terms.push(x);
        }
    }

    // No terms provided...
    if ( terms.length === 0 ) {
        return displayError("Please provide a list of germplasm names to search");
    }

    // Too many terms provided...
    else if ( terms.length > MAX_SEARCH_TERMS ) {
        return displayError("Please limit the number of germplasm search terms to a maximum of " + MAX_SEARCH_TERMS);
    }

    // Toggle the searching display
    displayContainer("searching");

    // Add global error listener
    window.addEventListener("unhandledrejection", function(err) {
        displayError(err.reason);
    });

    // Start the search
    search(terms, config, updateProgress, displayMatches);
}


/**
 * Update the progress display of the search
 * @param  {Object} status    Status message
 * @param  {int}    progress  Percent progress
 */
function updateProgress(status, progress) {
    $("#searching-status").html(status.title + "<br />" + status.subtitle);
    if ( progress ) {
        if ( progress === -1 ) {
            $("#searching-progress-bar").addClass("progress-bar-striped");
            $("#searching-progress-bar").css("width", "100%");
            $("#searching-progress-bar").attr("aria-valuenow", "100");    
        }
        else {
            $("#searching-progress-bar").removeClass("progress-bar-striped");
            $("#searching-progress-bar").css("width", progress + "%");
            $("#searching-progress-bar").attr("aria-valuenow", progress);
        }
        $("#searching-progress").show();
    }
    else {
        $("#searching-progress").hide();
    }
}



/**
 * Display the matches from the search
 * @param  {Object[]} matches Search matches
 */
function displayMatches(matches) {
    MATCHES = matches;
    console.log("MATCHES:");
    console.log(matches);

    // Build Table HTML
    let html = "";
    for ( term in matches ) {
        if ( matches.hasOwnProperty(term) ) {
            let match = matches[term];
            html += "<tr>";
            
            // Germplasm Name
            html += "<td>" + match.term + "</td>";

            // Match Type...
            html += "<td>";

            // ...Icon
            if ( match.matchType === 'none' || match.matches.length === 0 ) {
                html += '<svg class="bi bi-x-circle" width="1em" height="1em" viewBox="0 0 16 16" fill="red" xmlns="http://www.w3.org/2000/svg">';
                html += '<path fill-rule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm0 1A8 8 0 108 0a8 8 0 000 16z" clip-rule="evenodd"/>';
                html += '<path fill-rule="evenodd" d="M11.854 4.146a.5.5 0 010 .708l-7 7a.5.5 0 01-.708-.708l7-7a.5.5 0 01.708 0z" clip-rule="evenodd"/>';
                html += '<path fill-rule="evenodd" d="M4.146 4.146a.5.5 0 000 .708l7 7a.5.5 0 00.708-.708l-7-7a.5.5 0 00-.708 0z" clip-rule="evenodd"/>';
                html += '</svg>';
            }
            else if ( match.matchType === 'extended' || match.matches.length > 1 ) {
                html += '<svg class="bi bi-dash-circle" width="1em" height="1em" viewBox="0 0 16 16" fill="orange" xmlns="http://www.w3.org/2000/svg">';
                html += '<path fill-rule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm0 1A8 8 0 108 0a8 8 0 000 16z" clip-rule="evenodd"/>';
                html += '<path fill-rule="evenodd" d="M3.5 8a.5.5 0 01.5-.5h8a.5.5 0 010 1H4a.5.5 0 01-.5-.5z" clip-rule="evenodd"/>';
                html += '</svg>';
            }
            else if ( match.matches.length === 1 ) {
                html += '<svg class="bi bi-check-circle" width="1em" height="1em" viewBox="0 0 16 16" fill="green" xmlns="http://www.w3.org/2000/svg">';
                html += '<path fill-rule="evenodd" d="M15.354 2.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3-3a.5.5 0 11.708-.708L8 9.293l6.646-6.647a.5.5 0 01.708 0z" clip-rule="evenodd"/>';
                html += '<path fill-rule="evenodd" d="M8 2.5A5.5 5.5 0 1013.5 8a.5.5 0 011 0 6.5 6.5 0 11-3.25-5.63.5.5 0 11-.5.865A5.472 5.472 0 008 2.5z" clip-rule="evenodd"/>';
                html += '</svg>';
            }
            

            // ...Text
            if ( match.matchType === 'exact' ) {
                html += "&nbsp;&nbsp;Exact Match"
            }

            // ... Synonym Match
            else if ( match.matchType === 'synonym' ) {
                html += "&nbsp;&nbsp;Synonym Match"
            }

            // ...No Match
            else if ( match.matchType === 'none' ) {
                html += "&nbsp;&nbsp;No Matches"
            }

            // ...Extended Search Match
            else if ( match.matchType === 'extended' ) {
                html += "&nbsp;&nbsp;Potential Matches"
            }

            html += "</td>";

            // Database Matches
            html += "<td>"
            for ( let i = 0; i < match.matches.length; i++ ) {
                html += "<input type='radio' ";
                html += "name='" + match.term + "' ";
                html += "value='" + match.matches[i].germplasmName + "'";
                if ( match.matches.length === 1 && match.matchType !== "extended" ) html += " checked";
                html += ">&nbsp;&nbsp;";
                html += "<a href='#' onclick='displayGermplasm(\"" + term + "\", " + i + ")'>";
                html += match.matches[i].germplasmName;
                html += "</a>"
                if ( match.matches[i].synonyms && match.matches[i].synonyms.length > 0 ) {
                    for ( let j = 0; j < match.matches[i].synonyms.length; j++ ) {
                        html += '<span class="synonym-badge badge badge-secondary">';
                        html += match.matches[i].synonyms[j];
                        html += '</span>';
                    }
                }
                                
                html += "<br />"
            }
            if ( match.matches.length > 0 ) {
                html += "<input type='radio' name='" + match.term + "' value=''";
                if ( match.matches.length !== 1 || match.matchType === 'extended' ) html += " checked";
                html += ">&nbsp;&nbsp;NO MATCHES";
            }
            html += "</td>";

            html += "</tr>";
        }
    }
    $("#matches-table-body").html(html);
    $("[data-toggle='tooltip']").tooltip({delay: {"show": 500, "hide": 0}});

    displayContainer("results");
}

/**
 * Display a modal dialog with the germplasm details
 * @param  {String} term The search term linked to the germplasm
 * @param  {int}    i    The index of the germplasm in the matches list
 */
function displayGermplasm(term, i) {
    let match = MATCHES[term].matches[i];
    $("#germplasmModal-title").html(match.germplasmName);

    let html = "<table class='table table-striped'>";
    html += "<thead class='thead-light'>";
    html += "<tr>";
    html += "<th>Property</th>";
    html += "<th>Value</th>";
    html += "</tr>";
    html += "<tbody>";
    let props = Object.getOwnPropertyNames(match).sort();
    for ( let i = 0; i < props.length; i++ ) {
        let prop = props[i];
        if ( prop !== "__response" ) {
            html += "<tr>";
            html += "<td style='word-break:break-all'>" + prop + "</td>";
            html += "<td style='word-break:break-all'>" + JSON.stringify(match[prop]).replace("\"\"", "") + "</td>";
            html += "</tr>";
        }
    }
    html += "</tbody>";
    html += "</table>";
    $("#germplasmModal-details").html(html);

    $("#germplasmModal").modal("show");
}


/**
 * Generate and download the Matches file
 */
function downloadMatches() {
    let headers = ["germplasm_name", "database_match"];
    let rows = [];
    for ( term in MATCHES ) {
        if ( MATCHES.hasOwnProperty(term) ) {
            let match = MATCHES[term];
            if ( match.matchType !== "none" ) {
                let selected = $("input[name='" + term + "']:checked").val();
                if ( selected && selected !== "" ) {
                    rows.push([term, selected]);
                }
            }
        }
    }
    downloadCSV(headers, rows, "matches");
}


/**
 * Generate and download the No Matches file
 */
function downloadNoMatches() {
    let headers = ["germplasm_name"];
    let rows = [];
    for ( term in MATCHES ) {
        if ( MATCHES.hasOwnProperty(term) ) {
            let match = MATCHES[term];
            if ( match.matchType === "none" ) {
                rows.push([term]);
            }
            else {
                let selected = $("input[name='" + term + "']:checked").val();
                if ( !selected || selected === "" ) {
                    rows.push([term]);
                }
            }
        }
    }
    downloadCSV(headers, rows, "noMatches");
}


/**
 * Generate and download the entire match dataset
 */
function downloadAll() {
    let headers = ["germplasm_name", "match_type", "database_match", "other_suggestions"];
    let rows = [];
    for ( term in MATCHES ) {
        if ( MATCHES.hasOwnProperty(term) ) {
            let match = MATCHES[term];
            let database_match = "";
            let other_suggestions = "";
            if ( match.matchType !== "none" ) {
                database_match = $("input[name='" + term + "']:checked").val();
                let o = [];
                for ( let i = 0; i < match.matches.length; i++ ) {
                    if ( match.matches[i].germplasmName !== database_match ) {
                        o.push(match.matches[i].germplasmName);
                    }
                }
                other_suggestions = o.join(', ');
            }
            rows.push([term, match.matchType, database_match, other_suggestions]);
        }
    }
    downloadCSV(headers, rows, "allMatchData");
}


/**
 * Create a CSV and start the download of it
 * @param  {String[]}   headers Array of column headers
 * @param  {Arrray[][]} rows    2D Array of row-wise values
 * @param  {String}     file    Name of the CSV file
 */
function downloadCSV(headers, rows, file) {
    let csv = "\"" + headers.join("\", \"") + "\"\n";
    for ( let i = 0; i < rows.length; i++ ) {
        csv += "\"" + rows[i].join("\", \"") + "\"\n";
    }
    let e = document.createElement("a");
    e.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
    e.target = "_blank";
    e.download = file + ".csv";
    e.click();
}


/**
 * Display an error message
 * @param  {string} err Error Message
 */
function displayError(err) {
    $("#error-text").html(err);
    displayContainer("error");
}


/**
 * Display the initial search container
 */
function displaySearch() {
    $("#search").attr("disabled", false);
    displayContainer("search");
}


/**
 * Display the specified section container, hiding all others
 * @param  {string} name Name of the section container (id = {name}-container)
 */
function displayContainer(name) {
    let el = "#" + name + "-container";
    $(".section-container").hide();
    $(el).show();
}