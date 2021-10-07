'use string';

const getEditDistance = require('../utils/editdistance.js');

/**
 * Perform an edit distance match test on the terms
 * Perform an exact match test on the terms
 * @param  {string}  dt database term
 * @param  {string}  st search term
 * @param  {Object}  config search config
 * @return {Boolean}    true if a match
 */
 function search(dt, mt, config) {
    let ed = getEditDistance(dt, mt);
    return {
        isMatch: ed > 0 && ed <= config.search_routines.max_edit_distance,
        properties: {
            edit_distance: ed
        }
    }
}

module.exports = {
    name: "Edit Distance Comparison",
    key: "edit_distance",
    weight: 10,
    search: search
}