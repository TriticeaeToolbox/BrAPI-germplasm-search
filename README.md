# BrAPI-germplasm-search
A BrAPI-powered bulk germplasm search API server and website

## Installation
This project is packaged as a node module that includes a small 
[Express](https://expressjs.com/) web server that runs the search 
API server and serves the search web page.

To install the package globally directly from GitHub:
```
npm install -g git+https://git@github.com/TriticeaeToolbox/BrAPI-germplasm-search.git
```

This will install the executable `brapi-germplasm-search` which can be used to start the server.

## Configuration

The default configuration options are read from the `config.json` file in the root of 
the project directory.  A `config.local.json` file can be placed in this same directory 
and properties found in this file will override the default values.

**Available Configuration Options:**
  - **port:** the port the web server will listen on
  - **databases:** an array of objects containting pre-configured BrAPI database options
    - **name:** (required) Database name
    - **address:** (required) Database BrAPI endpoint address
    - **version:** Database version string (vx.y)
    - **auth_token:** BrAPI auth token, if one is required for the `/germplasm` call
    - **call_limit:** The max number of simultaneous connections
  - **cache:** an object of options for the cache of downloaded germplasm records
    - **timeout:** the max amount of time to store the cache (ms) (default: `1209600000`)
    - **export:** the location of the exported cache file (relative to the project root directory) (default: `./cache.json`)
    - **autoImport:** when `true` the cache will automatically import the export file on start (default: `true`)
    - **autoExport:** when `true` the cache will automatically export the cache to the export file on update (default: `true`)
  - **search:** an object default search options (all of these can be overriden as parameters to individual search queries
    - **database_terms:** the database terms to include in the search
      - **name:** germplasm name (default: `true`)
      - **synonyms:** germplasm alternate names (default: `true`)
      - **accession_numbers:** germplasm accession numbers (default: `true`)
    - **search_routines:** the search routines to use in the search
      - **exact:** find exact matches between search and database terms (default: `true`)
      - **substring:** find database terms that contain the search term (default: `false`)
      - **punctuation:** find matches that are the same after non-alphanumeric characters are removed (default: `false`)
      - **edit_distance:** find matches where the edit distance between terms is within the max edit distance (default: `false`)
      - **max_edit_distance:** the maximum number of changes for the edit distance comparison (default: `2`)
      
## Website Usage

The website can accept a number of query params that can be used to set 
the initial search parameters.

**Available Query Params:**

The following query params will set the initial database properties:
  - **db:** set the selected database by database index or name
  - **db_address:** the BrAPI database address (will set the selected database to 'Custom')
  - **db_version:** the BrAPI database version (will set the selected database to 'Custom')
  - **db_auth_token:** the BrAPI database auth token (will set the selected database to 'Custom')
  - **db_call_limit:** the BrAPI database call limit (will set the selected database to 'Custom')
  - **force:** when set to `1`, `true` or `on` fresh germplasm records will be downloaded from the database (otherwise cached records will be used, if available)
  
The following query params use boolean values to toggle the initial search options
(`1`, `true`, `on` = enabled; `0`, `false`, `off` = disabled):
  - **name:** toggle the name database term type
  - **synonyms:** toggle the synonyms database term type
  - **accession_numbers:** toggle the accession numbers database term type
  - **exact:** toggle the exact match search routine
  - **substring:** toggle the substring match search routine
  - **punctuation:** toggle the punctuation removal search routine
  - **edit_distance:** toggle the edit distance comparison search routine
  - **max_edit_distance:** (integer) set the max edit distance used by the edit distance comparison search routine
 
 When the `auto` query param is set to `1`/`true`/`on` the search will start automatically
 with the default and provided search parameters.
  
