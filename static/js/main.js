let MATCHES = {};
let EDIT_DATABASE_TOGGLED = false;
let MAX_SEARCH_TERMS = 5000;
let FULL_DATABASE_SEARCH = false;
const ICONS = {
    "x": '<svg class="bi bi-x-circle" width="1em" height="1em" viewBox="0 0 16 16" fill="red" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm0 1A8 8 0 108 0a8 8 0 000 16z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M11.854 4.146a.5.5 0 010 .708l-7 7a.5.5 0 01-.708-.708l7-7a.5.5 0 01.708 0z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M4.146 4.146a.5.5 0 000 .708l7 7a.5.5 0 00.708-.708l-7-7a.5.5 0 00-.708 0z" clip-rule="evenodd"/></svg>',
    "dash": '<svg class="bi bi-dash-circle" width="1em" height="1em" viewBox="0 0 16 16" fill="orange" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm0 1A8 8 0 108 0a8 8 0 000 16z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M3.5 8a.5.5 0 01.5-.5h8a.5.5 0 010 1H4a.5.5 0 01-.5-.5z" clip-rule="evenodd"/></svg>',
    "check": '<svg class="bi bi-check-circle" width="1em" height="1em" viewBox="0 0 16 16" fill="green" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M15.354 2.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3-3a.5.5 0 11.708-.708L8 9.293l6.646-6.647a.5.5 0 01.708 0z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M8 2.5A5.5 5.5 0 1013.5 8a.5.5 0 011 0 6.5 6.5 0 11-3.25-5.63.5.5 0 11-.5.865A5.472 5.472 0 008 2.5z" clip-rule="evenodd"/></svg>',
    "check_multiple": '<svg class="bi bi-check2-all" width="1em" height="1em" viewBox="0 0 16 16" fill="green" xmlns="http://www.w3.org/2000/svg"><path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 10.293 1.854 7.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7zm-4.208 7-.896-.897.707-.707.543.543 6.646-6.647a.5.5 0 0 1 .708.708l-7 7a.5.5 0 0 1-.708 0z"/><path d="m5.354 7.146.896.897-.707.707-.897-.896a.5.5 0 1 1 .708-.708z"/></svg>'
}

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
    $("#cache-available-info").hide();
    $("#cache-unavailable-info").hide();
    $("#cache-loading-info").show();
    getCacheInfo(db_address, function(err, info) {
        if ( db_address === $("#database-address").val() ) {
            if ( info && info.saved && info.terms && parseInt(info.terms) > 0 ) {
                let saved = new Date(info.saved);
                let force = ['true', '1', 'on'].includes(q('force'));
                $("#download-records").attr("disabled", false);
                $("#download-records").prop("checked", force || false);
                $("#cache-available-info-saved").html(saved.toLocaleString());
                $("#cache-available-info-terms").html(info.terms);
                $("#cache-loading-info").hide();
                $("#cache-unavailable-info").hide();
                $("#cache-available-info").show();
            }
            else {
                $("#download-records").attr("disabled", true);
                $("#download-records").prop("checked", true);
                $("#cache-loading-info").hide();
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
    _toggle("#include-punctuation", opts.search_routines.punctuation);
    _toggle("#include-substring", opts.search_routines.substring);
    _toggle("#include-prefix", opts.search_routines.prefix);
    _toggle("#include-edit-distance", opts.search_routines.edit_distance);
    if ( opts.search_routine_options.substring.substring_length_min ) {
        $("#substring-length-min").val(opts.search_routine_options.substring.substring_length_min);
    }
    if ( opts.search_routine_options.prefix.prefixes && opts.search_routine_options.prefix.prefixes.length > 0 ) {
        $("#prefixes").val(opts.search_routine_options.prefix.prefixes.join('\n'));
    }
    if ( opts.search_routine_options.prefix.find_db_prefixes ) {
        _toggle("#find-db-prefixes", opts.search_routine_options.prefix.find_db_prefixes);
    }
    if ( opts.search_routine_options.prefix.prefix_length_min ) {
        $("#prefix-length-min").val(opts.search_routine_options.prefix.prefix_length_min);
    }
    if ( opts.search_routine_options.prefix.prefix_length_max ) {
        $("#prefix-length-max").val(opts.search_routine_options.prefix.prefix_length_max);
    }
    if ( opts.search_routine_options.prefix.threshold ) {
        $("#threshold").val(opts.search_routine_options.prefix.threshold);
    }
    if ( opts.search_routine_options.edit_distance.max_edit_distance ) {
        $("#max-edit-distance").val(opts.search_routine_options.edit_distance.max_edit_distance);
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
                $(el + "-opts").show();
            }
            else if ( ['false', '0', 'off'].includes(val.toLowerCase()) ) {
                $(el).prop('checked', false);
                $(el + "-opts").hide();
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
 * Toggle the display of additional options when a switch is toggled
 */
function toggleSearchRoutine() {
    let checked = $(this).prop('checked');
    let id = $(this).attr('id');
    let opts = "#" + id + "-opts";
    if ( checked ) {
        $(opts).show();
    }
    else {
        $(opts).hide();
    }
}


/**
 * Enable the Full Database Search
 * - hide the user-entered search terms
 * - display message that all db terms will be searched
 * @param  {Boolean} [enabled] Enable the full database search
 */
function enableFullDatabaseSearch(enabled=true) {
    FULL_DATABASE_SEARCH = enabled;
    if ( enabled ) {
        $("#input-terms-user").hide();
        $("#input-terms-db").show();
    }
    else {
        $("#input-terms-db").hide();
        $("#input-terms-user").show();
    }
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
            punctuation: $("#include-punctuation").prop('checked'),
            substring: $("#include-substring").prop('checked'),
            prefix: $("#include-prefix").prop('checked'),
            edit_distance: $("#include-edit-distance").prop('checked')
        },
        search_routine_options: {
            substring: {
                substring_length_min: $("#substring-length-min").val()
            },
            prefix: {
                prefixes: $("#prefixes").val().replace(/\n/g, ",").split(','),
                find_db_prefixes: $("#find-db-prefixes").prop('checked'),
                prefix_length_min: $("#prefix-length-min").val(),
                prefix_length_max: $("#prefix-length-max").val(),
                threshold: $("#threshold").val()
            },
            edit_distance: {
                max_edit_distance: $("#max-edit-distance").val()
            }
        },
        return_records: false,
        case_sensitive: $("#options-case-sensitive").prop('checked'),
        full_database_search: FULL_DATABASE_SEARCH
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
    if ( !FULL_DATABASE_SEARCH && terms.length === 0 ) {
        return displayError("Please provide a list of germplasm names to search");
    }
    else if ( !FULL_DATABASE_SEARCH && terms.length > MAX_SEARCH_TERMS ) {
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
 * Display the results from the search
 * @param  {Object} results Search results
 */
function displayMatches(results) {
    MATCHES = results;

    // Build Table HTML
    let html = "";
    for ( term in results ) {
        if ( results.hasOwnProperty(term) ) {
            let result = results[term];

            // Set summary info
            let search_term = result.search_term;
            let exact_match = result.exact_match;
            let matches = result.matches;
            let match_count = Object.keys(matches).length;

            // Set Match Type
            let match_key = "";
            let match_type = "";
            let match_icon = "";
            if ( match_count === 0 ) {
                match_key = "none";
                match_type = "None";
                match_icon = ICONS["x"];
            }
            else if ( exact_match && match_count === 1 ) {
                match_key = "exact";
                match_type = "Exact";
                match_icon = ICONS["check"];
            }
            else if ( exact_match && match_count > 1 ) {
                match_key = "exact_potential";
                match_type = "Exact &amp; Potential";
                match_icon = ICONS["check_multiple"];
            }
            else if ( match_count > 0 ) {
                match_key = "potential";
                match_type = "Potential";
                match_icon = ICONS["dash"];
            }

            // BUILD HTML
            html += "<tr class='match-row match-row-" + match_key + "'>";
            
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
            for ( db_match in result.matches ) {
                if ( result.matches.hasOwnProperty(db_match) ) {
                    let m = result.matches[db_match];
                    let germplasmName = m.germplasmName;
                    let germplasmDbId = m.germplasmDbId;
                    let matched_db_terms = m.matched_db_terms;

                    // DB Entry Header
                    let checked = exact_match && exact_match === germplasmName ? "checked" : "";
                    html += "<h4 class='db-entry-header'>";
                    html += "<input type='radio' name='" + search_term + "' data-id='" + germplasmDbId + "' data-name='" + germplasmName + "' " + checked + ">&nbsp;&nbsp;";
                    html += "<a href='#' onclick='displayGermplasm(\"" + germplasmName + "\", " + germplasmDbId + "); return false;'>";
                    html += germplasmName;
                    html += "</a>";
                    html += "</h4>";

                    // Matches
                    html += "<ul class='db-terms'>";
                    for ( let i = 0; i < matched_db_terms.length; i++ ) {
                        let t = matched_db_terms[i];
                        let b = t.db_term.type === 'name' ? 'primary' : t.db_term.type === 'synonym' ? 'info' : 'secondary';
                        let r = t.search_routine.key === 'exact' ? 'success' : 'warning';
                        html += "<li>";
                        html += "<strong>" + t.db_term.term + "</strong>&nbsp;";
                        html += "<span class='match-badge badge badge-" + b + "'>" + t.db_term.type + "</span>&nbsp;";
                        html += "<span class='match-badge badge badge-" + r + "'>" + t.search_routine.name + "</span>";
                        html += "</li>";
                    }
                    html += "</ul>";

                }
            }

            // No Match
            let checked = match_count === 0 || !exact_match ? 'checked' : '';
            html += "<h4 class='db-entry-header'>";
            html += "<input type='radio' name='" + search_term + "' data-id='' data-name='' " + checked + ">&nbsp;&nbsp;";
            html += "NO MATCH";
            html += "</h4>";

            html += "</td>";
            html += "</tr>";
        }
    }
    $("#matches-table-body").html(html);
    $("[data-toggle='tooltip']").tooltip({delay: {"show": 500, "hide": 0}});

    displayContainer("results");
}


/**
 * Filter the results table by match type
 */
function filterSearch() {
    let type = $(this).data('match-type');
    $('.btn-match-filter').attr('disabled', false);
    $(this).attr('disabled', true);
    if ( type === 'all' ) {
        $('.match-row').show();
    }
    else {
        $('.match-row').hide();
        $('.match-row-' + type).show();
    }
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

    let address = $("#database-address").val();
    getGermplasmRecord(id, address, function(err, record) {
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
            let selected = $("input[name='" + term + "']:checked").data("name");
            if ( selected && selected !== "" ) {
                rows.push([term, selected]);
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
            let selected = $("input[name='" + term + "']:checked").data("name");
            if ( !selected || selected === "" ) {
                rows.push([term]);
            }
        }
    }
    downloadCSV(headers, rows, "noMatches");
}


/**
 * Generate and download the entire match dataset
 */
function downloadAll() {
    let headers = ["search_term", "has_match", "is_match", "database_name", "database_term", "database_term_type", "search_routine", "search_routine_properties"];
    let rows = [];

    // Parse each search term
    for ( term in MATCHES ) {
        if ( MATCHES.hasOwnProperty(term) ) {
            let match = MATCHES[term];
            let selected = $("input[name='" + term + "']:checked").data("name");
            let has_match = selected && selected !== "" ? 'true' : 'false';
            let match_count = Object.keys(match.matches).length;

            // Add each of the potential database terms
            for ( mm in match.matches ) {
                if ( match.matches.hasOwnProperty(mm) ) {
                    let m = match.matches[mm];
                    let database_name = m.germplasmName;
                    let is_match = has_match === 'true' && selected === database_name;
    
                    // Add each of the matched terms
                    for ( let i = 0; i < m.matched_db_terms.length; i++ ) {
                        let d = m.matched_db_terms[i];
                        let database_term = d.db_term.term;
                        let database_term_type = d.db_term.type;
                        let search_routine = d.search_routine.key;
                        let search_routine_properties = [];
                        if ( d.search_routine.properties ) {
                            for ( const [key, value] of Object.entries(d.search_routine.properties) ) {
                                search_routine_properties.push(key + "=" + value);
                            }
                        }
    
                        // Build Row
                        rows.push([term, has_match, is_match, database_name, database_term, database_term_type, search_routine, search_routine_properties.join(";")]);
                    }
                }
    
                // Add row for no match
                if ( match_count === 0 ) {
                    rows.push([term, 'false', 'false', '', '', '', 'none', '']);
                }
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
    e.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
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