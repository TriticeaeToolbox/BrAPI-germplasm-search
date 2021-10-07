'use string';

const getEditDistance = require('../utils/editdistance.js');

/**
 * Perform an edit distance match test on the terms
 * Perform an exact match test on the terms
 * @param  {string}  dt database term
 * @param  {string}  st search term
 * @param  {Object}  opts search routine options
 * @return {Boolean}    true if a match
 */
 function search(dt, mt, opts) {
    let ed = getEditDistance(dt, mt);
    return {
        isMatch: ed > 0 && ed <= opts.max_edit_distance,
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