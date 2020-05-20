'use strict';

const extend = require('deep-extend');
const DEFAULT_CONFIG = require('./config.js').search;


// Search Subroutine start functions
const SEARCH_SUBROUTINES = [
    _startExact,
    _startSynonym,
    _startPunctuation,
    _startEditDistance
]

/**
 * Search the BrAPI database terms for germplasm entries that match the specified search 
 * terms.  The callback function will return an object (with keys set to the original 
 * search terms) where each property is an object with the properties:
 *     - term = original search term
 *     - matchType = type of match (exact, synonym, none)
 *     - matches = object of possible matching germplasm entries (object key = input search term)
 * Configuration Properties:
 *     {boolean} exact = match search terms to database names (case-insensitive)
 *     {boolean} synonyms = match search terms to database synonyms (case-insensitive)
 *     {boolean} punctuation = match search terms to database terms after removing special characters
 *     {boolean} edit_distance = perform edit distance search on database names and synonyms
 *     {int} max_edit_distance = maximum edit distance for a match
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
            term: search_terms[i],
            matchType: 'none',
            matches: []
        }
    }

    console.log(matches);


    // Reset progress
    if ( progress ) progress({}, 0);

    // Start the first search subroutine
    _startSubroutine(db_terms, matches, config, progress, callback);

}


/**
 * Start a search subroutine with the general search parameters.  After the 
 * subroutine has finished, start the next one or return to the callback
 * @param  {Object[]}   db_terms List of database terms (names, synonyms)
 * @param  {Object}     matches  Search terms and their match results
 * @param  {Object}     config   Search configuration options
 * @param  {Function}   progress Progress function(status, progress)
 * @param  {Function}   callback Callback function(matches)
 * @param  {int}        [index]  Index of the search routine to call (default = 0)
 */
function _startSubroutine(db_terms, matches, config, progress, callback, index) {
    if ( !index ) index = 0;
    
    let count = index+1;
    let total = SEARCH_SUBROUTINES.length;
    if ( progress ) {
        progress(
            {
                title: "Performing search...",
                subtitle: "Step " + count + " / " + total
            }, 
            (count/total)*100
        );
    }
    
    SEARCH_SUBROUTINES[index](db_terms, matches, config, function(matches) {
        index++;
        if ( index < SEARCH_SUBROUTINES.length ) {
            setTimeout(function() {
                _startSubroutine(db_terms, matches, config, progress, callback, index);
            }, 500);
        }
        else {
            setTimeout(function() {
                return callback(matches);
            }, 500);
        }
    });
}


/**
 * Start the exact match search, if requested
 * @param  {Object[]}   db_terms List of database terms (names, synonyms)
 * @param  {Object}     matches  Search terms and their match results
 * @param  {Object}     config   Search configuration options
 * @param  {Function}   callback Callback function(matches)
 */
function _startExact(db_terms, matches, config, callback) {
    if ( config.exact ) {
        _getExactMatches(db_terms, matches, callback);
    }
    else {
        return callback(matches);
    }
}


/**
 * Start the synonym match search, if requested
 * @param  {Object[]}   db_terms List of database terms (names, synonyms)
 * @param  {Object}     matches  Search terms and their match results
 * @param  {Object}     config   Search configuration options
 * @param  {Function}   callback Callback function(matches)
 */
function _startSynonym(db_terms, matches, config, callback) {
    if ( config.synonyms ) {
        _getSynonymMatches(db_terms, matches, callback);
    }
    else {
        return callback(matches);
    }
}


/**
 * Start the punctuation match search, if requested
 * @param  {Object[]}   db_terms List of database terms (names, synonyms)
 * @param  {Object}     matches  Search terms and their match results
 * @param  {Object}     config   Search configuration options
 * @param  {Function}   callback Callback function(matches)
 */
function _startPunctuation(db_terms, matches, config, callback) {
    if ( config.punctuation ) {
        _getPunctuationMatches(db_terms, matches, callback);
    }
    else {
        return callback(matches);
    }
}


/**
 * Start the edit distance search, if requested
 * @param  {Object[]}   db_terms List of database terms (names, synonyms)
 * @param  {Object}     matches  Search terms and their match results
 * @param  {Object}     config   Search configuration options
 * @param  {Function}   callback Callback function(matches)
 */
function _startEditDistance(db_terms, matches, config, callback) {
    if ( config.edit_distance ) {
        _getEditDistanceMatches(db_terms, matches, config.max_edit_distance, callback);
    }
    else {
        return callback(matches);
    }
}


/**
 * Get germplasm entries from the database that exactly match the search terms
 * @param  {Object[]}   db_terms List of database terms (names, synonyms)
 * @param  {Object}     matches  Search terms and their match results
 * @param  {Function}   callback Callback function(matches)
 */
function _getExactMatches(db_terms, matches, callback) {
    for ( let i = 0; i < db_terms.length; i++ ) {
        let db_term = db_terms[i];
        if ( db_term.type === 'name' ) {
            for ( let key in matches ) {
                if ( matches.hasOwnProperty(key) ) {
                    let match = matches[key];
                    if ( db_term.term.toUpperCase() === match.term.toUpperCase() ) {
                        matches[key] = _addMatch(match, 'exact', db_term.record);
                    }
                }
            }
        }
    }
    return callback(matches);
}


/**
 * Get germplasm entries from the database that match synonyms to the search terms
 * @param  {Object[]}   db_terms List of database terms (names, synonyms)
 * @param  {Object}     matches  Search terms and their match results
 * @param  {Function}   callback Callback function(matches)
 */
function _getSynonymMatches(db_terms, matches, callback) {
    for ( let i = 0; i < db_terms.length; i++ ) {
        let db_term = db_terms[i];
        if ( db_term.type === 'synonym' ) {
            for ( let key in matches ) {
                if ( matches.hasOwnProperty(key) ) {
                    let match = matches[key];
                    if ( db_term.term.toUpperCase() === match.term.toUpperCase() ) {
                        matches[key] = _addMatch(match, 'synonym', db_term.record);
                    }
                }
            }
        }
    }
    return callback(matches);
}


/**
 * Get matches to the database terms that are the same when 
 * special characters are removed
 * @param  {Object[]}   db_terms List of database terms (names, synonyms)
 * @param  {Object}     matches  Search terms and their match results
 * @param  {Function}   callback Callback function(matches)
 */
function _getPunctuationMatches(db_terms, matches, callback) {
    for ( let i = 0; i < db_terms.length; i++ ) {
        let db_term = db_terms[i];
        for ( let key in matches ) {
            if ( matches.hasOwnProperty(key) ) {
                let match = matches[key];
                if ( !["exact", "synonym"].includes(match.matchType) ) {
                    let dbt = db_term.term.toUpperCase().replace(/[^A-Z0-9]/gi, '');
                    let mat = match.term.toUpperCase().replace(/[^A-Z0-9]/gi, '');
                    if ( dbt === mat ) {
                        matches[key] = _addMatch(match, 'extended', db_term.record);
                    }
                }
            }
        }
    }
    return callback(matches);
}


/**
 * Get matches to the database terms that are within the specified edit distance
 * @param  {Object[]}   db_terms          List of database terms (names, synonyms)
 * @param  {Object}     matches           Search terms and their match results
 * @param  {int}        max_edit_distance the maximum edit distance to include as a match
 * @param  {Function}   callback          Callback function(matches)
 */
function _getEditDistanceMatches(db_terms, matches, max_edit_distance, callback) {
    for ( let i = 0; i < db_terms.length; i++ ) {
        let db_term = db_terms[i];
        for ( let key in matches ) {
            if ( matches.hasOwnProperty(key) ) {
                let match = matches[key];
                if ( !["exact", "synonym"].includes(match.matchType) ) {
                    let dbt = db_term.term.toUpperCase();
                    let mat = match.term.toUpperCase();
                    let ed = getEditDistance(dbt, mat);
                    if ( ed <= max_edit_distance ) {
                        matches[key] = _addMatch(match, 'extended', db_term.record);
                    }
                }
            }
        }
    }
    return callback(matches);
}


/**
 * Add a germplasm record to the specified match object, 
 * if it is not already in the list of matches
 * @param {Object} match  Match Object
 * @param {string} type   Match Type
 * @param {Object} record Germplasm record
 */
function _addMatch(match, type, record) {
    if ( match.matchType === 'none' ) match.matchType = type;
    let add = true;
    for ( let i = 0; i < match.matches.length; i++ ) {
        if ( match.matches[i].germplasmDbId === record.germplasmDbId ) add = false;
    }
    if ( add ) match.matches.push(record);
    return match;
}



module.exports = search;