'use strict';

/**
 * Perform a substring match test on the terms
 * @param  {string}  dt database term
 * @param  {string}  mt match term
 * @return {Boolean}    true if a match
 */
 function search(dt, mt) {
    return dt !== mt && dt.includes(mt);
}

module.exports = {
    name: "Substring Match",
    key: "substring",
    weight: 60,
    search: search
}