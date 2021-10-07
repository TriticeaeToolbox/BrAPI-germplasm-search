'use strict';

/**
 * Perform a punctuation removal match test on the terms
 * @param  {string}  dt database term
 * @param  {string}  mt match term
 * @return {Boolean}    true if a match
 */
 function search(dt, mt) {
    let _dt = dt.replace(/[^A-Z0-9]/gi, '');
    let _mt = mt.replace(/[^A-Z0-9]/gi, '');
    return dt !== mt && _dt === _mt;
}

module.exports = {
    name: "Remove Punctuation",
    key: "punctuation",
    weight: 80,
    search: search
}