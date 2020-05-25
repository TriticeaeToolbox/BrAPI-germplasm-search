'use strict';

const extend = require('deep-extend');
const DEFAULT_CONFIG = require('./config.js').search;
const getEditDistance = require('./editdistance.js');


// Search Routine Info
const SEARCH_ROUTINES = [
    {
        "name": "Exact Match",
        "key": "exact",
        "weight": 100,
        "search": _isExactMatch
    },
    {
        "name": "Remove Punctuation",
        "key": "punctuation",
        "weight": 80,
        "search": _isPunctuationMatch
    },
    {
        "name": "Substring Match",
        "key": "substring",
        "weight": 60,
        "search": _isSubstringMatch
    },
    {
        "name": "Edit Distance Comparision",
        "key": "edit_distance",
        "weight": 10,
        "search": _isEditDistanceMatch
    }
];


/**
 * Search the BrAPI database terms for germplasm entries that match the specified search 
 * terms.  The callback function will return an object (with keys set to the original 
 * search terms) where each property is an object with the properties:
 *     - term = original search term
 *     - matchType = type of match (exact, synonym, none)
 *     - matches = object of possible matching germplasm entries (object key = input search term)
 * Configuration Properties:
 *     database_terms: 
 *         name = true to include germplasm name
 *         synonyms = true to include germplasm synonyms
 *         accession_numbers = true to include germplasm accession numbers
 *     search_routines:
 *         exact = find exact matches to db terms
 *         substring = find db terms that contain the search term
 *         punctuation = find matches that are the same with special characters removed
 *         edit_distance = find matches that have an edit distance <= max_edit_distance
 *         max_edit_distance = the max edit distance for a match
 * @param  {String[]}   search_terms  List of germplasm names to find matches for
 * @param  {Object[]}   db_terms      The database terms to perform the search on
 * @param  {Object}     [config]      Search configuration properties
 * @param  {Function}   [progress]    Callback function(status, progress) for updating search progress
 * @param  {Function}   callback      Callback function(matches)
 */
function search(search_terms, db_terms, config, progress, callback) {

    // Set parameters
    if ( !callback && !progress && typeof config === 'function' ) {
        callback = config;
        progress = undefined;
        config = {};
    }
    if ( !callback && typeof progress === 'function' && typeof config === 'object' ) {
        callback = progress;
        progress = undefined;
    }
    if ( !callback && typeof progress === 'function' && typeof config === 'function' ) {
        callback = progress;
        progress = config;
        config = {};
    }

    // Check for required parameters
    if ( !search_terms || search_terms.length === 0 ) {
        throw("Search terms are required");
        return;
    }
    else if ( !db_terms || db_terms.length === 0 ) {
        throw("DB terms are required");
    }

    // Merge provided config into default config
    config = extend(DEFAULT_CONFIG, config);

    // Set intial matches
    let matches = {}
    for ( let i = 0; i < search_terms.length; i++ ) {
        matches[search_terms[i]] = {
            search_term: search_terms[i],
            search_routines: [],
            matches: []
        }
    }

    // Reset progress
    if ( progress ) progress({title: "Performing Search...", subtitle: ""}, 0);

    // Perform the Search
    _performSearch(db_terms, matches, config, progress, callback);
}


/**
 * Perform the search on the provided search terms
 * @param  {Object[]}   db_terms List of database terms
 * @param  {Object}     matches  Search terms and their match results
 * @param  {Object}     config   Search configuration options
 * @param  {Function}   progress Progress function(status, progress)
 * @param  {Function}   callback Callback function(matches)
 */
function _performSearch(db_terms, matches, config, progress, callback) {

    // Loop through DB Terms...
    for ( let i = 0; i < db_terms.length; i++ ) {
        let db_term = db_terms[i];

        // Update Progress
        let count = i+1;
        let total = db_terms.length;
        if ( progress && count % 500 === 0 ) {
            progress(
                {
                    title: "Performing Search...",
                    subtitle: "Matching search terms to database terms"
                }, 
                (count/total)*100
            );
        }

        // Only search on included DB term types...
        if ( _isDBTermTypeIncluded(db_term.type, config) ) {
            
            // Loop through Search Terms...
            for ( let key in matches ) {
                if ( matches.hasOwnProperty(key) ) {
                    let match = matches[key];

                    // Run the Search Routines
                    matches[key] = _runSearchRoutines(db_term, match, config);
                }
            }
        }
    }

    // Sort the matches
    let rtn = {};
    for ( let key in matches ) {
        if ( matches.hasOwnProperty(key) ) {
            let match = matches[key];
            match.matches.sort(function(a, b) {
                if (a.search_routine.weight < b.search_routine.weight) return 1;
                if (a.search_routine.weight > b.search_routine.weight) return -1;
                if (a.db_term.record.germplasmName > b.db_term.record.germplasmName) return 1;
                if (a.db_term.record.germplasmName < b.db_term.record.germplasmName) return -1;
            });
            rtn[key] = match;
        }
    }

    // Return the sorted matches
    return callback(rtn);
}



/**
 * Run the included search routines on the provided db and match terms
 * @param  {Object} db_term DB Term Object
 * @param  {Object} match   Match Term Object
 * @param  {Object} config  Search Config
 * @return {Object}         Modified Match Object
 */
function _runSearchRoutines(db_term, match, config) {
    let dt = db_term.term.toUpperCase();
    let mt = match.search_term.toUpperCase();

    for ( let i = 0; i < SEARCH_ROUTINES.length; i++ ) {
        let routine = SEARCH_ROUTINES[i];

        if ( config.search_routines[routine.key] === true ) {
            let isMatch = routine.search(dt, mt, config);
            if ( isMatch ) {
                match = _addMatch(
                    routine.name,
                    routine.key, 
                    routine.weight,
                    match,
                    db_term
                );
            }
        }
    }

    return match;
}



// ==== SEARCH ROUTINE TESTS ==== //


/**
 * Perform an exact match test on the terms
 * @param  {string}  dt database term
 * @param  {string}  mt match term
 * @return {Boolean}    true if a match
 */
function _isExactMatch(dt, st) {
    return dt === st;
}

/**
 * Perform a punctuation removal match test on the terms
 * @param  {string}  dt database term
 * @param  {string}  mt match term
 * @return {Boolean}    true if a match
 */
function _isPunctuationMatch(dt, mt) {
    let _dt = dt.replace(/[^A-Z0-9]/gi, '');
    let _mt = mt.replace(/[^A-Z0-9]/gi, '');
    return dt !== mt && _dt === _mt;
}

/**
 * Perform a substring match test on the terms
 * @param  {string}  dt database term
 * @param  {string}  st search term
 * @return {Boolean}    true if a match
 */
function _isSubstringMatch(dt, mt) {
    return dt !== mt && dt.includes(mt);
}

/**
 * Perform an edit distance match test on the terms
 * Perform an exact match test on the terms
 * @param  {string}  dt database term
 * @param  {string}  st search term
 * @param  {Object}  config search config
 * @return {Boolean}    true if a match
 */
function _isEditDistanceMatch(dt, mt, config) {
    let ed = getEditDistance(dt, mt);
    return ed <= config.search_routines.max_edit_distance;
}




// ==== HELPER FUNCTIONS ==== //


/**
 * Add a germplasm record to the specified match object, 
 * if it is not already in the list of matches
 * @param  {string} routine_name  Search routine name that found the match
 * @param  {string} routine_key   Search routine key that found the match
 * @param  {weight} weight   Search routine weight
 * @param  {Object} match    Match Object to modify
 * @param  {Object} db_term  DB Term Object of the match
 * @return {Object}          Modified Match Object
 */
function _addMatch(routine_name, routine_key, weight, match, db_term) {
    
    // Add match info
    match.matches.push({
        search_routine: {
            key: routine_key,
            name: routine_name,
            weight: weight
        },
        db_term: {
            term: db_term.term,
            type: db_term.type,
            record: db_term.record
        }
    });

    // Return the updated match
    return match;
}


/**
 * Check if the specified DB Term type included in the search
 * @param  {string}  type   DB Term Type (name, synonym, accession_number)
 * @param  {Object}  config Search configuration
 * @return {Boolean}        True if the db term type is included
 */
function _isDBTermTypeIncluded(type, config) {
    if ( type === 'name' ) {
        return config.database_terms.name;
    }
    else if ( type === 'synonym' ) {
        return config.database_terms.synonyms;
    }
    else if ( type === 'accession_number' ) {
        return config.database_terms.accession_numbers;
    }
    else {
        return false;
    }
}



module.exports = search;