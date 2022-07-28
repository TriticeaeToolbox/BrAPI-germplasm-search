'use strict';

const extend = require('deep-extend');
const DEFAULT_CONFIG = require('./config.js').search;
const SEARCH_ROUTINES = require('../search');

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
 *         punctuation = find matches that are the same with special characters removed
 *         substring = find db terms that contain the search term
 *         prefix = find matches that are the same when common prefixes are removed
 *         edit_distance = find matches that have an edit distance <= max_edit_distance
 *      search_routine_options: additional options for each of the search routines
 *      return_records = true to include germplasm records with matches
 * @param  {String[]||Object[]}   search_terms  List of germplasm names to find matches for
 * @param  {Object[]}             db_terms      The database terms to perform the search on
 * @param  {Object}               [config]      Search configuration properties
 * @param  {Function}             [progress]    Callback function(status, progress) for updating search progress
 * @param  {Function}             callback      Callback function(matches)
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
    }
    else if ( !db_terms || db_terms.length === 0 ) {
        throw("DB terms are required");
    }

    // Merge provided config into default config
    config = extend(DEFAULT_CONFIG, config);

    // Set intial matches
    let matches = {}
    for ( let i = 0; i < search_terms.length; i++ ) {
        let st = typeof search_terms[i] === 'object' ? search_terms[i].term : search_terms[i];
        matches[st] = {
            search_term: st,
            search_term_type: typeof search_terms[i] === 'object' ? search_terms[i].type : undefined,
            search_term_id: typeof search_terms[i] === 'object' ? search_terms[i].id : undefined,
            exact_match: false,
            search_routines: [],
            matches: {}
        }
    }

    // Perform the Setup
    if ( progress ) progress({title: "Performing Search Setup...", subtitle: ""}, 0);
    let setup = _performSetup(db_terms, matches, config)

    // Perform the Search
    if ( progress ) progress({title: "Performing Search...", subtitle: ""}, 0);
    _performSearch(db_terms, matches, config, setup, progress, callback);
}


/**
 * Perform the setup for any of the enabled search routines
 * @param {Object[]}   db_terms List of database terms
 * @param {Object}     matches  Search terms and their match results
 * @param {Object}     config   Search configuration options
 * @returns {Object}            Object of setup results for each search routine
 */
function _performSetup(db_terms, matches, config) {
    let setup = {};
    for (let i = 0; i < SEARCH_ROUTINES.length; i++ ) {
        let routine = SEARCH_ROUTINES[i];
        if ( config.search_routines[routine.key] === true && routine.setup ) {
            let s = routine.setup(db_terms, matches, config.search_routine_options[routine.key]);
            setup[routine.key] = s;
        }
    }
    return setup;
}


/**
 * Perform the search on the provided search terms
 * @param  {Object[]}   db_terms List of database terms
 * @param  {Object}     matches  Search terms and their match results
 * @param  {Object}     config   Search configuration options
 * @param  {Object}     setup    Search setup results
 * @param  {Function}   progress Progress function(status, progress)
 * @param  {Function}   callback Callback function(matches)
 */
function _performSearch(db_terms, matches, config, setup, progress, callback) {

    // Chuck DB Terms
    let chunks = _chunkArray(db_terms, 1000);

    // Start processing the first chunk
    _processChunk();
    
    /**
     * Process the chunk of DB Terms
     * @param int index Chunk Index
     */
    function _processChunk(index) {

        // Get the current chunk
        index = index ? index : 0;
        let chunk = chunks[index];

        // Update Progress
        let count = index+1;
        let total = chunks.length;
        if ( progress ) {
            progress(
                {
                    title: "Performing Search...",
                    subtitle: "Matching search terms to database terms"
                }, 
                (count/total)*100
            );
        }

        // Loop through DB Terms...
        for ( let i = 0; i < chunk.length; i++ ) {
            let db_term = chunk[i];
            if ( _isDBTermTypeIncluded(db_term.type, config) ) {
                
                // Loop through Search Terms...
                for ( let key in matches ) {
                    if ( matches.hasOwnProperty(key) ) {
                        let match = matches[key];

                        // Run the Search Routines
                        matches[key] = _runSearchRoutines(db_term, match, config, setup);
                    }
                }

            }
        }
        
        // PROCESS NEXT CHUNK
        if ( index < chunks.length-1 ) {
            setImmediate(function() {
                _processChunk(index+1);
            });
        }
        else {
            _finish();
        }
    }

    /**
     * Finish the search: 
     *  remove records (if not requested), 
     *  return to the callacbk
     */
    function _finish() {

        // Sort and set the record of the matches
        let rtn = {};
        for ( let key in matches ) {
            if ( matches.hasOwnProperty(key) ) {
                let match = matches[key];

                // Remove record if not requested
                if ( !config.return_records ) {
                    for ( let m in match.matches ) {
                        if ( match.matches.hasOwnProperty(m) ) {
                            match.matches[m].record = undefined
                        }
                    }
                }

                rtn[key] = match;
            }
        }

        // Return the sorted matches
        return callback(rtn);
    }
}



/**
 * Run the included search routines on the provided db and match terms
 * @param  {Object} db_term DB Term Object
 * @param  {Object} match   Match Term Object
 * @param  {Object} config  Search Config
 * @param  {Object} setup   Search Setup results
 * @return {Object}         Modified Match Object
 */
function _runSearchRoutines(db_term, match, config, setup) {
    let dt = config.case_sensitive ? db_term.term : db_term.term.toUpperCase();
    let mt = config.case_sensitive ? match.search_term : match.search_term.toUpperCase();

    // Exclude the same stock entry for full database searches
    if ( match.search_term_id && match.search_term_id === db_term.record.germplasmDbId ) {
        return match;
    }

    for ( let i = 0; i < SEARCH_ROUTINES.length; i++ ) {
        let routine = SEARCH_ROUTINES[i];

        if ( config.search_routines[routine.key] === true ) {
            let results = routine.search(dt, mt, config.search_routine_options[routine.key], setup[routine.key]);
            let isMatch = typeof results === 'object' && results !== null ? results.isMatch : results;
            let properties = typeof results === 'object' && results !== null ? results.properties : undefined;
            if ( isMatch ) {
                match = _addMatch(
                    routine.name,
                    routine.key, 
                    routine.weight,
                    properties,
                    match,
                    db_term
                );
            }

            // Perform a separate case-insensitive search, 
            // when case_sensitive is enabled and there was no case-sensitive match
            else if ( config.case_sensitive ) {
                let ci_results = routine.search(dt.toUpperCase(), mt.toUpperCase(), config.search_routine_options[routine.key], setup[routine.key]);
                let ci_isMatch = typeof ci_results === 'object' && ci_results !== null ? ci_results.isMatch : ci_results;
                let ci_properties = typeof ci_results === 'object' && ci_results !== null ? ci_results.properties : undefined;
                if ( ci_isMatch ) {
                    match = _addMatch(
                        routine.name + " - Case Insensitive",
                        routine.key + "-case_insensitive",
                        routine.weight,
                        ci_properties,
                        match,
                        db_term
                    );
                }
            }
        }
    }

    return match;
}



// ==== HELPER FUNCTIONS ==== //


/**
 * Add a germplasm record to the specified match object, 
 * if it is not already in the list of matches
 * @param  {string} routine_name  Search routine name that found the match
 * @param  {string} routine_key   Search routine key that found the match
 * @param  {int}    weight        Search routine weight
 * @param  {Object} properties    Search routine result properties
 * @param  {Object} match    Match Object to modify
 * @param  {Object} db_term  DB Term Object of the match
 * @return {Object}          Modified Match Object
 */
function _addMatch(routine_name, routine_key, weight, properties, match, db_term) {
    
    // Add Search Routine
    if ( !match.search_routines.includes(routine_key) ) {
        match.search_routines.push(routine_key);
    }

    // Set Exact Match Flag
    if ( routine_key === 'exact' ) {
        match.exact_match = db_term.record.germplasmName;
    }

    // Create Match for DB Term
    if ( !match.matches.hasOwnProperty(db_term.record.germplasmName) ) {
        match.matches[db_term.record.germplasmName] = {
            germplasmName: db_term.record.germplasmName,
            germplasmDbId: db_term.record.germplasmDbId,
            record: db_term.record,
            matched_db_terms: []
        }
    }

    // Add match info
    match.matches[db_term.record.germplasmName].matched_db_terms.push({
        search_routine: {
            key: routine_key,
            name: routine_name,
            weight: weight,
            properties: properties
        },
        db_term: {
            term: db_term.term,
            type: db_term.type,
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


/**
 * Split an array into separate chunks
 * @param {Array} arr Array to separate into chunks
 * @param {int} size Max size of the chunks
 */
function _chunkArray(arr, size) {
    var index = 0;
    var arrayLength = arr.length;
    var tempArray = [];
    for ( let index = 0; index < arrayLength; index += size ) {
        let myChunk = arr.slice(index, index+size);
        tempArray.push(myChunk);
    }
    return tempArray;
};



module.exports = search;