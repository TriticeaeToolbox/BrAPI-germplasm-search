'use strict';

/**
 * Perform a substring match test on the terms
 * @param  {string}  dt database term
 * @param  {string}  mt match term
 * @return {Boolean}    true if a match
 */
 function search(dt, mt, opts) {
    return (dt.includes(mt) || mt.includes(dt)) && 
        dt !== mt && 
        (opts.substring_length_min && dt.length >= opts.substring_length_min && mt.length >= opts.substring_length_min);
}

module.exports = {
    name: "Substring Match",
    key: "substring",
    weight: 60,
    search: search
}