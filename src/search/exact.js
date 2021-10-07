'use strict';

/**
 * Perform an exact match test on the terms
 * @param  {string}  dt database term
 * @param  {string}  mt match term
 * @return {Boolean}    true if a match
 */
 function search(dt, mt) {
    return dt === mt;
}

module.exports = {
    name: "Exact Match",
    key: "exact",
    weight: 100,
    search: search
}