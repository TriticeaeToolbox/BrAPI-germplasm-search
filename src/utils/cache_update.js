#!/usr/bin/env node
'use strict';

const progress = require('cli-progress');
const dbs = require('./config.js').databases;
const getDBTerms = require('./database.js');

let IS_UPDATING = false;
const bar = new progress.SingleBar({
    format: '     [{bar}] | {percentage}%'
});


const update = function() {
    let index = 0;
    let total = dbs.length;
    let database = process.env.npm_config_database;
    
    if ( !IS_UPDATING ) {
        console.log("===> STARTING CACHE UPDATE...");
        _run();
    }

    function _run() {
        if ( index < total ) {
            IS_UPDATING = true;
            if ( !database || database === '' || database === dbs[index].name ) {
                _updateDB(dbs[index], function() {
                    index++;
                    _run();
                });
            }
            else {
                index++;
                _run();
            }
        }
        else {
            IS_UPDATING = false;
            console.log("===> ...CACHE UPDATE COMPLETE");
        }
    }
}


const _updateDB = function(db, callback) {
    console.log("---> Updating Database: " + db.address);
    bar.start(100, 0);
    getDBTerms(
        db,
        true,
        function(msg, progress) {
            bar.update(parseFloat(progress.toFixed(2)));
        },
        function() {
            bar.update(100);
            bar.stop();
            return callback();   
        }
    );
}


module.exports = update;