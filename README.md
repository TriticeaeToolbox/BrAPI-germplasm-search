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

## API Usage

The RESTful API is available at `{{host}}/api` with endpoints that can be used to get the list of pre-configured 
databases, get the germplasm cache status, update a germplasm cache, start a search and get pending job status 
information or results.

### `GET` `/databases` - Get Pre-Configured Databases

Get a list of the database properties for all of the pre-configured BrAPI databases.

**Response:**

```json
{
    "status": "success",
    "response": [
        {
            "name": "T3/Wheat",
            "address": "https://wheat.triticeaetoolbox.org/brapi/v1",
            "version": "v1.3",
            "call_limit": 10
        },
        {
            "name": "T3/Oat",
            "address": "https://oat.triticeaetoolbox.org/brapi/v1",
            "version": "v1.3",
            "call_limit": 10
        }
    ]
}
```

### `GET` `/cache[?address=]` - Get Germplasm Cache Info

Get the cache status (when the cache was saved and the number of database terms) for all 
of the cached databases (or the one specified by its address)

**Response:** `/cache`
```json
{
    "status": "success",
    "response": [
        {
            "address": "http://localhost:8080/brapi/v1",
            "saved": "2020-05-25T18:00:55.350Z",
            "terms": 28869
        },
        {
            "address": "http://localhost:8081/brapi/v1",
            "saved": "2020-05-25T18:03:15.374Z",
            "terms": 63320
        }
    ]
}
```

**Response:** `/cache?address=http://localhost:8080/brapi/v1`
```json
{
    "status": "success",
    "response": {
        "saved": "2020-05-25T17:49:34.592Z",
        "terms": 28869
    }
}
```

**Response:** `/cache?address=https://oat.triticeaetoolbox.org/brapi/v1`
```json
{
    "status": "error",
    "error": {
        "code": 404,
        "message": "Cache not found for address https://oat.triticeaetoolbox.org/brapi/v1"
    }
}
```

### `PUT` `/cache` - Update Cache

Update the cache of germplasm records for the database specified in the request body.  Since this is 
long running-task the request is added to a job queue and the response will include the job id.  Use the 
`/job/:id?results=false` endpoint to get the status of the job to determine when the update is complete.

**Body:**
```json
{
    "address": "http://localhost:8080/brapi/v1",
    "version": "v1.3",
    "auth_token": "",
    "call_limit": 10
}
```

**Response:**
```json
{
    "status": "queued",
    "job": {
        "id": "61d43d31-3dbb-470c-80dd-43372bb796ed"
    }
}
```

### `POST` `/search` - Start Search

Start a germplasm search on the database, terms and search options provided in the request body.  Since this is 
long running-task the request is added to a job queue and the response will include the job id.  Use the 
`/job/:id?results=true` endpoint to get the status of the job and its results when the job is complete.

**Body:**
```json
{
    "database": {
        "address": "http://localhost:8081/brapi/v1",
        "version": "v1.3",
        "auth_token": "",
        "call_limit": 10
    },
    "terms": ["JERRY", "syn_a", "ogle"],
    "config": {
        "database_terms": {
            "name": true,
            "synonyms": true,
            "accession_numbers": true
        },
        "search_routines": {
            "name": true,
            "punctuation": true,
            "substring": true,
            "edit_distance": false,
            "max_edit_distance": 2
        }
    }
}
```

**Response:**
```json
{
    "status": "queued",
    "job": {
        "id": "c6a62106-a741-4ddc-a968-b09762908cec"
    }
}
```

### `GET` `/job/:id[?results=false]` - Get Job Status

Get the status of the specified job (status, message, progress) and the results 
of a completed job. The results can be optionally disabled in the response, which 
is recommended for jobs that are updating the germplasm cache if you don't actually 
need the generated database terms (the response with the results is fairly large).

A job can have one of the following statuses:
  - **pending:** the job has been added but not yet started
  - **running:** the job is running (a running job will have the message and progress properties set)
  - **complete:** the job has finished and will include the results if `results=true`
  - **removed:** the job no longer exists
  
**Running Response:**
```json
{
    "status": "running",
    "job": {
        "id": "d2395274-1cbe-414c-b7b5-f6fbeda06547",
        "message": {
            "title": "Getting germplasm entries from the database",
            "subtitle": "This will take a few moments..."
        },
        "progress": 25.94899169632266
    }
}
```

**Update Cache Response:** `?results=false`
```json
{
    "status": "complete",
    "job": {
        "id": "de5b5f37-8229-4cb8-b360-2f2552200aa5"
    }
}
```

**Search Response:** `?results=true`
```json
{
    "status": "complete",
    "job": {
        "id": "5500da49-5a3c-4e69-8106-8095055dbe40",
        "results": {
            "JERRY": {
                "search_term": "JERRY",
                "search_routines": [
                    "exact"
                ],
                "matches": [
                    {
                        "search_routine": {
                            "key": "exact",
                            "name": "Exact Match",
                            "weight": 100
                        },
                        "db_term": {
                            "term": "JERRY",
                            "type": "name",
                            "record": {
                                "subtaxa": null,
                                "typeOfGermplasmStorageCode": [],
                                "seedSource": "",
                                "commonCropName": "cultivated oat,oat",
                                "subtaxaAuthority": null,
                                "instituteName": "",
                                "accessionNumber": "PI 591808",
                                "countryOfOriginCode": "",
                                "defaultDisplayName": "JERRY",
                                "acquisitionDate": "",
                                "breedingMethodDbId": null,
                                "biologicalStatusOfAccessionCode": 0,
                                "germplasmPUI": "https://oat.triticeaetoolbox.org/stock/102642/view",
                                "germplasmName": "JERRY",
                                "taxonIds": [],
                                "donors": [],
                                "instituteCode": "",
                                "speciesAuthority": null,
                                "germplasmSeedSource": "",
                                "germplasmGenus": "Avena",
                                "species": "Avena sativa",
                                "germplasmDbId": 102642,
                                "documentationURL": null,
                                "pedigree": "VALLEY/ND810458",
                                "synonyms": [
                                    "ND870952",
                                    "03C0701856"
                                ],
                                "germplasmSpecies": "Avena sativa",
                                "genus": "Avena"
                            }
                        }
                    }
                ]
            },
            "syn_a": {
                "search_term": "syn_a",
                "search_routines": [],
                "matches": []
            },
            "ogle": {
                "search_term": "ogle",
                "search_routines": [
                    "exact",
                    "substring"
                ],
                "matches": [
                    {
                        "search_routine": {
                            "key": "exact",
                            "name": "Exact Match",
                            "weight": 100
                        },
                        "db_term": {
                            "term": "OGLE",
                            "type": "name",
                            "record": {
                                "germplasmName": "OGLE",
                                "taxonIds": [],
                                "acquisitionDate": "",
                                "breedingMethodDbId": null,
                                "germplasmPUI": "https://oat.triticeaetoolbox.org/stock/97779/view",
                                "biologicalStatusOfAccessionCode": 0,
                                "accessionNumber": "CIav 9401,VIR 13904,CN 39352,PGR 16342,CN 43110,PGR 16405,CN 43171,CN 58321,PGR 12295,Ogle CIav9401,CIav 09401",
                                "subtaxaAuthority": null,
                                "instituteName": "",
                                "commonCropName": "cultivated oat,oat",
                                "defaultDisplayName": "OGLE",
                                "countryOfOriginCode": "",
                                "subtaxa": null,
                                "typeOfGermplasmStorageCode": [],
                                "seedSource": "",
                                "germplasmDbId": 97779,
                                "documentationURL": null,
                                "pedigree": "UNNAMED336/BRAVE",
                                "germplasmSpecies": "Avena sativa",
                                "synonyms": [
                                    "OGLE",
                                    "TLVA5908",
                                    "03C0700697",
                                    "W87678",
                                    "IL73-2664",
                                    "RL 1475",
                                    "Illinois 73-2664",
                                    "AVE 2932",
                                    "IL 73-2664",
                                    "TLVA5829"
                                ],
                                "genus": "Avena",
                                "speciesAuthority": null,
                                "germplasmGenus": "Avena",
                                "germplasmSeedSource": "",
                                "species": "Avena sativa",
                                "donors": [],
                                "instituteCode": ""
                            }
                        }
                    },
                    {
                        "search_routine": {
                            "key": "exact",
                            "name": "Exact Match",
                            "weight": 100
                        },
                        "db_term": {
                            "term": "OGLE",
                            "type": "synonym",
                            "record": {
                                "germplasmName": "OGLE",
                                "taxonIds": [],
                                "acquisitionDate": "",
                                "breedingMethodDbId": null,
                                "germplasmPUI": "https://oat.triticeaetoolbox.org/stock/97779/view",
                                "biologicalStatusOfAccessionCode": 0,
                                "accessionNumber": "CIav 9401,VIR 13904,CN 39352,PGR 16342,CN 43110,PGR 16405,CN 43171,CN 58321,PGR 12295,Ogle CIav9401,CIav 09401",
                                "subtaxaAuthority": null,
                                "instituteName": "",
                                "commonCropName": "cultivated oat,oat",
                                "defaultDisplayName": "OGLE",
                                "countryOfOriginCode": "",
                                "subtaxa": null,
                                "typeOfGermplasmStorageCode": [],
                                "seedSource": "",
                                "germplasmDbId": 97779,
                                "documentationURL": null,
                                "pedigree": "UNNAMED336/BRAVE",
                                "germplasmSpecies": "Avena sativa",
                                "synonyms": [
                                    "OGLE",
                                    "TLVA5908",
                                    "03C0700697",
                                    "W87678",
                                    "IL73-2664",
                                    "RL 1475",
                                    "Illinois 73-2664",
                                    "AVE 2932",
                                    "IL 73-2664",
                                    "TLVA5829"
                                ],
                                "genus": "Avena",
                                "speciesAuthority": null,
                                "germplasmGenus": "Avena",
                                "germplasmSeedSource": "",
                                "species": "Avena sativa",
                                "donors": [],
                                "instituteCode": ""
                            }
                        }
                    },
                    {
                        "search_routine": {
                            "key": "substring",
                            "name": "Substring Match",
                            "weight": 60
                        },
                        "db_term": {
                            "term": "Ogle CIav9401",
                            "type": "accession_number",
                            "record": {
                                "germplasmName": "OGLE",
                                "taxonIds": [],
                                "acquisitionDate": "",
                                "breedingMethodDbId": null,
                                "germplasmPUI": "https://oat.triticeaetoolbox.org/stock/97779/view",
                                "biologicalStatusOfAccessionCode": 0,
                                "accessionNumber": "CIav 9401,VIR 13904,CN 39352,PGR 16342,CN 43110,PGR 16405,CN 43171,CN 58321,PGR 12295,Ogle CIav9401,CIav 09401",
                                "subtaxaAuthority": null,
                                "instituteName": "",
                                "commonCropName": "cultivated oat,oat",
                                "defaultDisplayName": "OGLE",
                                "countryOfOriginCode": "",
                                "subtaxa": null,
                                "typeOfGermplasmStorageCode": [],
                                "seedSource": "",
                                "germplasmDbId": 97779,
                                "documentationURL": null,
                                "pedigree": "UNNAMED336/BRAVE",
                                "germplasmSpecies": "Avena sativa",
                                "synonyms": [
                                    "OGLE",
                                    "TLVA5908",
                                    "03C0700697",
                                    "W87678",
                                    "IL73-2664",
                                    "RL 1475",
                                    "Illinois 73-2664",
                                    "AVE 2932",
                                    "IL 73-2664",
                                    "TLVA5829"
                                ],
                                "genus": "Avena",
                                "speciesAuthority": null,
                                "germplasmGenus": "Avena",
                                "germplasmSeedSource": "",
                                "species": "Avena sativa",
                                "donors": [],
                                "instituteCode": ""
                            }
                        }
                    },
                    {
                        "search_routine": {
                            "key": "substring",
                            "name": "Substring Match",
                            "weight": 60
                        },
                        "db_term": {
                            "term": "OGLE-C-1",
                            "type": "name",
                            "record": {
                                "seedSource": "",
                                "typeOfGermplasmStorageCode": [],
                                "subtaxa": null,
                                "defaultDisplayName": "OGLE-C-1",
                                "countryOfOriginCode": "",
                                "subtaxaAuthority": null,
                                "commonCropName": "cultivated oat,oat",
                                "instituteName": "",
                                "accessionNumber": "",
                                "biologicalStatusOfAccessionCode": 0,
                                "germplasmPUI": "https://oat.triticeaetoolbox.org/stock/98759/view",
                                "breedingMethodDbId": null,
                                "acquisitionDate": "",
                                "taxonIds": [],
                                "germplasmName": "OGLE-C-1",
                                "instituteCode": "",
                                "donors": [],
                                "species": "Avena sativa",
                                "germplasmGenus": "Avena",
                                "germplasmSeedSource": "",
                                "speciesAuthority": null,
                                "genus": "Avena",
                                "germplasmSpecies": "Avena sativa",
                                "synonyms": [],
                                "pedigree": "NA/NA",
                                "germplasmDbId": 98759,
                                "documentationURL": null
                            }
                        }
                    }
                ]
            }
        }
    }
}
```

