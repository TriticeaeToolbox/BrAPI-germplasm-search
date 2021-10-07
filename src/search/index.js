const fs = require('fs');

let search = [];

try {
    let filenames = fs.readdirSync(__dirname);
    filenames.forEach(function(file) {
        if ( file !== "index.js" ) {
            console.log("Loading Search Module [" + file + "]...");
            search.push(require('./' + file));
        }
    });
}
catch(err) {
    console.log("ERROR: Could not read search functions! [" + err + "]");
}

module.exports = search;