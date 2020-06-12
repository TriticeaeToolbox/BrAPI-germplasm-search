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
            setCacheInfo(db_address);
        }

    });
}


/**
 * Set custom database properties
 * @param {Object}   props      DB Properties {address, version, auth_token, call_limit}
 * @param {Function} [callback] Callback function()
 */
function setDatabaseProperties(props, callback) {
    if ( props && (props.address || props.version || props.auth_token || props.call_limit) ) {
        setDatabases("custom", function() {
            $("#database-settings").show();
            if ( props.address ) $("#database-address").val(props.address);
            if ( props.version ) $("#database-version").val(props.version);
            if ( props.auth_token ) $("#database-auth-token").val(props.auth_token);
            if ( props.call_limit ) $("#database-call-limit").val(props.call_limit);

            setCacheInfo(props.address, callback);
        });
    }
    else {
        return callback();
    }
}


/**
 * Set the cache info for the specifed database
 * @param {string}   db_address DB Address
 * @param {Function} [callback] Callback function()
 */
function setCacheInfo(db_address, callback) {
    getCacheInfo(db_address, function(err, info) {
        if ( db_address === $("#database-address").val() ) {
            if ( info && info.saved && info.terms && parseInt(info.terms) > 0 ) {
                let saved = new Date(info.saved);
                let force = ['true', '1', 'on'].includes(q('force'));
                $("#download-records").attr("disabled", false);
                $("#download-records").prop("checked", force || false);
                $("#cache-available-info-saved").html(saved.toLocaleString());
                $("#cache-available-info-terms").html(info.terms);
                $("#cache-unavailable-info").hide();
                $("#cache-available-info").show();
            }
            else {
                $("#download-records").attr("disabled", true);
                $("#download-records").prop("checked", true);
                $("#cache-available-info").hide();
                $("#cache-unavailable-info").show();
            }
            if ( callback ) return callback();
        }
    });
}


/**
 * Set search options
 * @param {Object} opts     Initial search options
 */
function setOptions(opts) {
    _toggle("#include-name", opts.database_terms.name);
    _toggle("#include-synonyms", opts.database_terms.synonyms);
    _toggle("#include-accession-numbers", opts.database_terms.accession_numbers);
    _toggle("#include-exact", opts.search_routines.exact);
    _toggle("#include-substring", opts.search_routines.substring);
    _toggle("#include-punctuation", opts.search_routines.punctuation);
    _toggle("#include-edit-distance", opts.search_routines.edit_distance);
    if ( opts.search_routines.max_edit_distance ) {
        $("#max-edit-distance").val(opts.search_routines.max_edit_distance)
    }
    if ( opts.terms && opts.terms.length > 0 ) {
        $("#input-terms").val(opts.terms.join('\n'));
    }

    /**
     * Toggle the specified switch based on the specified value:
     *     true, 1, on = checked
     *     false, 0, off = unchecked
     * @param  {string} el  Element selector
     * @param  {string} val Initial value
     */
    function _toggle(el, val) {
        if ( val ) {
            if ( ['true', '1', 'on'].includes(val.toLowerCase()) ) {
                $(el).prop('checked', true);
            }
            else if ( ['false', '0', 'off'].includes(val.toLowerCase()) ) {
                $(el).prop('checked', false);
            }
        }
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
 * Format the search parameters and start the search workflow
 */
function setupSearch() {

    // Disable the search button
    $("#search").attr("disabled", true);


    // FORMAT PARAMS //

    // Get database properties
    let database = {
        address: $("#database-address").val(),
        version: $("#database-version").val(),
        auth_token: $("#database-auth-token").val(),
        call_limit: $("#database-call-limit").val()
    }

    // Get database request
    let force = $("#download-records").prop("checked");

    // Get search parameters
    let config = {
        database_terms: {
            name: $("#include-name").prop('checked'),
            synonyms: $("#include-synonyms").prop('checked'),
            accession_numbers: $("#include-accession-numbers").prop('checked')
        },
        search_routines: {
            exact: $("#include-exact").prop('checked'),
            substring: $("#include-substring").prop('checked'),
            punctuation: $("#include-punctuation").prop('checked'),
            edit_distance: $("#include-edit-distance").prop('checked'),
            max_edit_distance: $("#max-edit-distance").val()
        },
        return_records: false
    };
    
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


    // CHECK PARAMS //

    // BrAPI needs at least an address
    if ( !database.address || database.address === "" ) {
        return displayError("A database address / URL is required");
    }

    // Ensure at least one database term type
    let db_term_selected = false;
    for ( key in config.database_terms ) {
        if ( config.database_terms.hasOwnProperty(key) ) {
            if ( config.database_terms[key] === true ) db_term_selected = true;
        }
    }
    if ( !db_term_selected ) {
        return displayError("Please select at least one database term to use in the search");
    }

    // Ensure at least one search routine
    let search_routine_selected = false;
    for ( key in config.search_routines ) {
        if ( config.search_routines.hasOwnProperty(key) ) {
            if ( config.search_routines[key] === true ) search_routine_selected = true;
        }
    }
    if ( !search_routine_selected ) {
        return displayError("Please select at least one search routine to use in the search");
    }

    // Check number of search terms
    if ( terms.length === 0 ) {
        return displayError("Please provide a list of germplasm names to search");
    }
    else if ( terms.length > MAX_SEARCH_TERMS ) {
        return displayError("Please limit the number of germplasm search terms to a maximum of " + MAX_SEARCH_TERMS);
    }


    // START SEARCH //

    // Toggle the searching display
    displayContainer("searching");

    // Add global error listener
    window.addEventListener("unhandledrejection", function(err) {
        displayError(err.reason);
    });

    // Start the search
    handleSearch(terms, database, force, config);
}


/**
 * Update the progress display of the search
 * @param  {title}  title     Process Title
 * @param  {Object} status    Status message information {title, subtitle}
 * @param  {int}    progress  Percent progress
 */
function updateProgress(title, status, progress) {
    $("#searching-title").html(title);
    let html = "";
    if ( status && status.title ) html += status.title;
    if ( status && status.subtitle ) html += "<br />" + status.subtitle;
    $("#searching-status").html(html);
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
 * @param  {Object} matches Search matches
 */
function displayMatches(matches) {
    MATCHES = matches;
    console.log("MATCHES:");
    console.log(matches);

    // Set icons
    let icons = {
        "x": '<svg class="bi bi-x-circle" width="1em" height="1em" viewBox="0 0 16 16" fill="red" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm0 1A8 8 0 108 0a8 8 0 000 16z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M11.854 4.146a.5.5 0 010 .708l-7 7a.5.5 0 01-.708-.708l7-7a.5.5 0 01.708 0z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M4.146 4.146a.5.5 0 000 .708l7 7a.5.5 0 00.708-.708l-7-7a.5.5 0 00-.708 0z" clip-rule="evenodd"/></svg>',
        "dash": '<svg class="bi bi-dash-circle" width="1em" height="1em" viewBox="0 0 16 16" fill="orange" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm0 1A8 8 0 108 0a8 8 0 000 16z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M3.5 8a.5.5 0 01.5-.5h8a.5.5 0 010 1H4a.5.5 0 01-.5-.5z" clip-rule="evenodd"/></svg>',
        "check": '<svg class="bi bi-check-circle" width="1em" height="1em" viewBox="0 0 16 16" fill="green" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M15.354 2.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3-3a.5.5 0 11.708-.708L8 9.293l6.646-6.647a.5.5 0 01.708 0z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M8 2.5A5.5 5.5 0 1013.5 8a.5.5 0 011 0 6.5 6.5 0 11-3.25-5.63.5.5 0 11-.5.865A5.472 5.472 0 008 2.5z" clip-rule="evenodd"/></svg>'
    }

    // Build Table HTML
    let html = "";
    for ( term in matches ) {
        if ( matches.hasOwnProperty(term) ) {
            let match = matches[term];

            // Set summary info
            let search_term = match.search_term;
            let match_type = "";
            let match_icon = "";
            if ( match.matches.length === 0 ) {
                match_type = "None";
                match_icon = icons["x"];
            }
            else if ( match.matches.length === 1 && match.search_routines.length === 1 && match.search_routines[0] === 'exact' ) {
                match_type = "Exact";
                match_icon = icons["check"];
            }
            else if ( match.matches.length > 0 ) {
                match_type = "Potential";
                match_icon = icons["dash"];
            }

            // BUILD HTML
            html += "<tr>";
            
            // Search Term
            html += "<td>" + search_term + "</td>";

            // Match Type
            html += "<td>";
            html += match_icon;
            html += "&nbsp;&nbsp;";
            html += match_type;
            html += "</td>";

            // Database Matches
            html += "<td style='padding-top: 2px'>"
            let prev_search_routine = undefined;
            for ( let i = 0; i < match.matches.length; i++ ) {
                let m = match.matches[i];

                // Set search routine header
                let search_routine_header = "";
                if ( m.search_routine.key !== prev_search_routine ) {
                    prev_search_routine = m.search_routine.key;
                    search_routine_header = "<h4 class='search-routine-header'>" + m.search_routine.name + "</h4>";
                }

                // Get Match Info
                let search_term = match.search_term;
                let germplasm_name = match.matches[i].db_term.germplasmName;
                let germplasm_db_id = match.matches[i].db_term.germplasmDbId;
                let db_term_type = match.matches[i].db_term.type;
                let db_term_match = match.matches[i].db_term.term;

                // Set HTML variables
                let input_name = search_term;
                let input_value = i;
                let input_checked = match_type === "Exact" ? " checked" : "";
                let label = germplasm_name;

                // Add HTML
                html += search_routine_header;
                html += "<input type='radio' ";
                html += "name='" + input_name + "' ";
                html += "value='" + input_value + "' ";
                html += input_checked;
                html += ">&nbsp;&nbsp;";
                html += "<a href='#' onclick='displayGermplasm(\"" + germplasm_name + "\", " + germplasm_db_id + "); return false;'>";
                html += germplasm_name;
                html += "</a>";

                // Add synonyms and accession numbers if they're the matching term
                if ( db_term_type === "synonym" ) {
                    html += '<span class="match-badge badge badge-info">';
                    html += db_term_match;
                    html += '</span>';
                }
                else if ( db_term_type === "accession_number" ) {
                    html += '<span class="match-badge badge badge-secondary">';
                    html += db_term_match;
                    html += '</span>';
                }


                html += "<br />";
            }
            if ( match.matches.length > 0 ) {
                html += "<input type='radio' name='" + match.search_term + "' value='' style='margin-top: 12px'";
                if ( match.matches.length > 1 || match_type !== "Exact" ) html += " checked";
                html += ">&nbsp;&nbsp;NO MATCH";
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
 * @param  {String} name The database germplasm name
 * @param  {int}    id   The databse germplasm id
 */
function displayGermplasm(name, id) {
    $("#germplasmModal-title").html(name);
    $("#germplasmModal-details").html("<p>Loading Germplasm Details...</p>");
    $("#germplasmModal").modal("show");

    getGermplasmRecord(id, "https://wheat.triticeaetoolbox.org/brapi/v1", function(err, record) {
        let html = "";
        if ( err || !record ) {
            console.log(err);
            html += "<p><strong>Could not get germplasm record</strong></p>"
            html += "<code>" + err + "</code>";
        }
        else {
            html += "<table class='table table-striped'>";
            html += "<thead class='thead-light'>";
            html += "<tr>";
            html += "<th>Property</th>";
            html += "<th>Value</th>";
            html += "</tr>";
            html += "<tbody>";
            let props = Object.getOwnPropertyNames(record).sort();
            for ( let i = 0; i < props.length; i++ ) {
                let prop = props[i];
                if ( prop !== "__response" ) {
                    html += "<tr>";
                    html += "<td style='word-break:break-all'>" + prop + "</td>";
                    html += "<td style='word-break:break-all'>" + JSON.stringify(record[prop]).replace("\"\"", "") + "</td>";
                    html += "</tr>";
                }
            }
            html += "</tbody>";
            html += "</table>";
        }
        $("#germplasmModal-details").html(html);
    });
}


/**
 * Generate and download the Matches file
 */
function downloadMatches() {
    let headers = ["search_term", "database_name"];
    let rows = [];
    for ( term in MATCHES ) {
        if ( MATCHES.hasOwnProperty(term) ) {
            let match = MATCHES[term];
            if ( match.matches.length > 0 ) {
                let selected = $("input[name='" + term + "']:checked").val();
                if ( selected && selected !== "" ) {
                    let db_name = match.matches[parseInt(selected)].db_term.germplasmName;
                    rows.push([term, db_name]);
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
    let headers = ["search_term"];
    let rows = [];
    for ( term in MATCHES ) {
        if ( MATCHES.hasOwnProperty(term) ) {
            let match = MATCHES[term];
            if ( match.matches.length === 0 ) {
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
    let headers = ["search_term", "is_match", "database_name", "database_term", "database_term_type", "search_routine"];
    let rows = [];

    // Parse each search term
    for ( term in MATCHES ) {
        if ( MATCHES.hasOwnProperty(term) ) {
            let match = MATCHES[term];
            let selected = $("input[name='" + term + "']:checked").val();

            // Add each of the potential database terms
            for ( let i = 0; i < match.matches.length; i++ ) {
                let m = match.matches[i];
                let database_name = m.db_term.germplasmName
                let database_term = m.db_term.term;
                let database_term_type = m.db_term.type;
                let search_routine = m.search_routine.key;
                let is_selected = selected && selected !== "" && parseInt(selected) === i ? 'true' : 'false';
                rows.push([term, is_selected, database_name, database_term, database_term_type, search_routine]);
            }

            // Add row for no match
            if ( match.matches.length === 0 ) {
                rows.push([term, 'false', '', '', '', 'none']);
            }
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
    let csv = "\"" + headers.join("\",\"") + "\"\n";
    for ( let i = 0; i < rows.length; i++ ) {
        csv += "\"" + rows[i].join("\",\"") + "\"\n";
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
    setCacheInfo($("#database-address").val());
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


/**
 * Get a query param from the current URL
 * @param  {string}   name     Query param name
 * @param  {boolean}  [array]  True if the param should be parsed as an array
 * @return {string|string[]}   Query param value
 */
function q(name, array) {
    let searchParams = new URLSearchParams(window.location.search);
    if ( array ) {
        return searchParams ? searchParams.getAll(name) : undefined;
    }
    else {
        return searchParams ? searchParams.get(name) : undefined;
    }
}

/**
 * Set a cookie with the specified value
 * @param {string} cname  Cookie name
 * @param {string} cvalue Cookie value
 */
function setCookie(cname, cvalue) {
    var exdays = 999;
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

/**
 * Get the specified cookie's value
 * @param  {string} cname Cookie name
 * @return {string}       Cookie value
 */
function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}