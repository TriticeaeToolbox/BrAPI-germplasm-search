'use strict';

const Trie = require('trie-prefix-tree');
const flatten = require('flat');

/**
 * Prefix Search Setup: set prefixes to use
 * - include user-provided prefixes
 * - find common prefixes in database, if enabled
 * @param {Object[]} db_terms List of database terms
 * @param {Object} matches Search terms and their matches
 * @param {Object} opts Search routine options
 * @returns 
 */
function setup(db_terms, matches, opts) {
    let dt = db_terms.map(a => a.term);
    let dt_trie = Trie(dt);

    let prefixes = opts.prefixes ? opts.prefixes : [];
    if ( opts.find_db_prefixes ) {
        let db_prefixes = _findPrefixes(
            dt_trie, 
            opts.prefix_length_min, 
            opts.prefix_length_max,
            opts.threshold
        )
        prefixes = prefixes.concat(db_prefixes);
    }

    return {
        prefixes: prefixes
    }
}

/**
 * Find prefixes from the DB that match the specified criteria
 * @param {Trie}  trie      Parsed Trie of DB Terms
 * @param {int}   min       Min Length of prefix
 * @param {int}   max       Max length of prefix
 * @param {int}   threshold Min count of prefix occurrence in DB
 * @returns {String[]}      Array of prefixes from the Database
 */
function _findPrefixes(trie, min, max, threshold) {
    let tree = trie.tree();
    let prefixes = [];
    for ( let i = min; i <= max; i++ ) {
        let _prefixes = _findPrefixesLength(tree, i);
        for ( let j = 0; j < _prefixes.length; j++ ) {
            let _prefix = _prefixes[j];
            let _count = trie.getPrefix(_prefix, false).length;
            let _length = _prefix.length;
            if ( _count >= threshold && _length >= min && _length <= max ) {
                prefixes.push(_prefix);
            }
        }
    }
    return prefixes;
}

/**
 * Flatten the DB Tree to get prefixes of the specified length
 * @param {Tree}   tree   Tree from the DB Trie
 * @param {int}    max    Max depth / length
 * @returns {String[]}    Array of prefixes of the specified length
 */
function _findPrefixesLength(tree, max) {
    let flat = flatten(tree, { delimiter: '!', maxDepth: max });
    let p = Object.keys(flat).map(function(e) {
        return e.replace(/\!/g, "");
    });
    return p;
}


function search(dt, mt, opts, setup) {
    dt = dt.toLowerCase();
    mt = mt.toLowerCase();
    let prefixes = setup.prefixes;

    // Find prefixes that are contained in the database and search terms
    let found = prefixes.filter(function(e) {
        return dt.startsWith(e.toLowerCase()) || mt.startsWith(e.toLowerCase());
    });

    // Remove the prefixes from the database and search terms
    let _dt = [];
    let _mt = [];
    for ( let i = 0; i < found.length; i++ ) {
        let re = RegExp("^" + found[i], "i");
        _dt.push({ term: dt.replace(re, ""), prefix: found[i] });
        _mt.push({ term: mt.replace(re, ""), prefix: found[i] });
    }

    // Find matches with prefixes removed
    let matching_prefixes = [];
    for ( let i = 0; i < _dt.length; i++ ) {
        for ( let j = 0; j < _mt.length; j++ ) {
            if ( _dt[i].term === _mt[j].term ) {
                if ( !matching_prefixes.includes(_dt[i].prefix) ) matching_prefixes.push(_dt[i].prefix);
                if ( !matching_prefixes.includes(_mt[j].prefix) ) matching_prefixes.push(_mt[j].prefix);
            }
        }
    }

    // Return a match if matches with prefixes removed
    return {
        isMatch: matching_prefixes.length > 0,
        properties: {
            prefixes: matching_prefixes
        }
    };
}

module.exports = {
    name: "Remove Prefixes",
    key: "prefix",
    weight: 50,
    setup: setup,
    search: search
}