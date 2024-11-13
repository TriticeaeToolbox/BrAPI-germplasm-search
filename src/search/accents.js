'use strict';

const replacements = require('../utils/accent_replacements');

function search(dt, mt, opts) {
  const dts = buildReplacements(dt);
  const mts = buildReplacements(mt);

  // Compare each pair of replacement dt and mt terms for a match
  let match = false;
  for ( let d = 0; d < dts.length; d++ ) {
    for ( let m = 0; m < mts.length; m++ ) {
      if ( dts[d] === mts[m] ) {
        match = true;
      }
    }
  }

  return dt !== mt && match;
}


/**
 * Find all possible replacement terms
 * @param {String} term Term to replace special characters in
 * @returns {String[]}
 */
function buildReplacements(term) {

  // Build a tree of replacement characters
  let tree = [];
  for ( let i = 0; i < term.length; i++ ) {
    let c = term.charAt(i);
    if ( replacements.hasOwnProperty(c) ) {
      let r = replacements[c];
      tree.push(replacements[c]);
    }
    else {
      tree.push([c]);
    }
  }

  // Collapse tree into all possible strings
  let output = [''];
  for ( let t = 0; t < tree.length; t++ ) {
    let chars = tree[t];

    let new_output = [];
    for ( let o = 0; o < output.length; o++ ) {
      let pre = output[o];

      for ( let c = 0; c < chars.length; c++ ) {
        new_output.push(pre + chars[c]);
      }
    }

    output = new_output;
  }

  return output;
}


module.exports = {
  name: "Simplify Accents",
  key: "accents",
  weight: 90,
  search: search
}