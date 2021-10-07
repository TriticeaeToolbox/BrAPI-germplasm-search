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
  - **cache:** `persistent-cache` options
    - **base:** The base directory where persistent-cache will save its caches.
    - **name:** The name of the cache. Determines the name of the created folder where the data is stored, which is just base + name.
    - **duration:** The amount of milliseconds a cache entry should be valid for. If not set, cache entries are not invalidated (stay until deleted).
    - **memory:** The amount of milliseconds a cache entry should be valid for. If not set, cache entries are not invalidated (stay until deleted).
    - **persist:** Whether the cache should be persistent, aka if it should write its data to the disk for later use or not. Set this to false to create a memory-only cache.
  - **search:** an object default search options (all of these can be overriden as parameters to individual search queries
    - **database_terms:** the database terms to include in the search
      - **name:** germplasm name (default: `true`)
      - **synonyms:** germplasm alternate names (default: `true`)
      - **accession_numbers:** germplasm accession numbers (default: `true`)
    - **search_routines:** the search routines to use in the search
      - **exact:** find exact matches between search and database terms (default: `true`)
      - **punctuation:** find matches that are the same after non-alphanumeric characters are removed (default: `false`)
      - **substring:** find database terms that contain the search term (default: `false`)
      - **prefix:** find matches that are the same when prefixes have been removed (default: `false`)
      - **edit_distance:** find matches where the edit distance between terms is within the max edit distance (default: `false`)
    - **search_routine_options:** additional options used for individual search routines
      - **prefix:**
        - **prefixes:** default prefixes to include (default: `[]`)
        - **find_db_prefixes:** scan the database terms to find common prefixes (default: `true`)
        - **prefix_length_min:** when finding db prefixes, the minimum length of a prefix to include (default: `2`)
        - **prefix_length_max:** when finding db prefixes, the maximum length of a prefix to include (default: `5`)
        - **threshold:** when finding db prefixes, the minimum number of times a prefix is used before it is included (default: `250`)
      - **edit_distance:**
        - **max_edit_distance:** the maximum number of changes for the edit distance comparison (default: `2`)
    - **return_records:** when `true` the search results will include the full germplasm record of each math (default: `false`)
      
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
  - **punctuation:** toggle the punctuation removal search routine
  - **substring:** toggle the substring match search routine
  - **prefix:** toggle the prefix removal search routine
  - **edit_distance:** toggle the edit distance comparison search routine

The following query params set the values for specific search routine options
  - **prefixes:** (array) used to set custom prefixes
  - **find_db_prefixes:** (boolean) used to toggle the function to find common prefixes from the database terms
  - **prefix_length_min:** (integer) when finding database prefixes, set the minimum length of a prefix
  - **prefix_length_max:** (integer) when finding database prefixes, set the maximum length of a prefix
  - **threshold:** (integer) when finding database prefixes, set the min number of times a prefix occurs before it counts
  - **max_edit_distance:** (integer) set the max edit distance used by the edit distance comparison search routine

The `term` query param can be used one or more times to specify the search term(s).
 
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


### `GET` `/germplasm/:id?address=` - Get Germplasm Record

Get the cached record of the specified germplasm from the specified database.
The germplasm is specified by its `germplasmDbId` and the database is 
specified by its BrAPI address.

**NOTE:** The format of the record response will depend on the BrAPI version of the specified BrAPI server.

**Response:** `/germplasm/218808?address=https://wheat.triticeaetoolbox.org/brapi/v1`
```json
{
    "status": "success",
    "response": {
        "instituteName": "National Small Grains Collection",
        "breedingMethodDbId": null,
        "subtaxaAuthority": null,
        "germplasmPUI": "PI 367088,http://triticumbase.sgn.cornell.edu/stock/218808/view",
        "germplasmGenus": "Triticum",
        "typeOfGermplasmStorageCode": [],
        "germplasmName": "1755",
        "biologicalStatusOfAccessionCode": 0,
        "countryOfOriginCode": "",
        "defaultDisplayName": "1755",
        "instituteCode": "NSGC",
        "germplasmSeedSource": "",
        "seedSource": "",
        "genus": "Triticum",
        "acquisitionDate": "",
        "donors": [],
        "pedigree": "NA/NA",
        "speciesAuthority": null,
        "subtaxa": null,
        "species": "Triticum aestivum",
        "synonyms": [],
        "germplasmSpecies": "Triticum aestivum",
        "accessionNumber": "",
        "documentationURL": null,
        "germplasmDbId": 218808,
        "taxonIds": [],
        "commonCropName": "Canadian hard winter wheat,bread wheat,common wheat,wheat"
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
            "prefix": false,
            "edit_distance": false
        },
        "search_routine_options": {
            "prefix": {
                "prefixes": [],
                "find_db_prefixes": true,
                "prefix_length_min": 2,
                "prefix_length_max": 5,
                "threshold": 250
            }
            "edit_distance": {
                "max_edit_distance": 2
            }
        },
        "return_records": false
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
        "id": "a4de882a-f818-45bd-8f56-7bc14bf18355",
        "results": {
            "JERRY": {
                "search_term": "JERRY",
                "search_routines": [
                    "edit_distance",
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
                            "germplasmName": "JERRY",
                            "germplasmDbId": 102642
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "DERBY",
                            "type": "name",
                            "germplasmName": "DERBY",
                            "germplasmDbId": 87209
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "JURY",
                            "type": "name",
                            "germplasmName": "JURY",
                            "germplasmDbId": 100529
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "LARRY",
                            "type": "name",
                            "germplasmName": "LARRY",
                            "germplasmDbId": 92923
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "LEROY",
                            "type": "name",
                            "germplasmName": "LEROY",
                            "germplasmDbId": 91474
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "TERRA",
                            "type": "name",
                            "germplasmName": "TERRA",
                            "germplasmDbId": 91600
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "TERRY",
                            "type": "name",
                            "germplasmName": "TERRY",
                            "germplasmDbId": 96502
                        }
                    }
                ]
            },
            "bess": {
                "search_term": "bess",
                "search_routines": [
                    "edit_distance",
                    "substring"
                ],
                "matches": [
                    {
                        "search_routine": {
                            "key": "substring",
                            "name": "Substring Match",
                            "weight": 60
                        },
                        "db_term": {
                            "term": "BESSIN",
                            "type": "name",
                            "germplasmName": "BESSIN",
                            "germplasmDbId": 86489
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "BESSIN",
                            "type": "name",
                            "germplasmName": "BESSIN",
                            "germplasmDbId": 86489
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "BETA",
                            "type": "name",
                            "germplasmName": "BETA",
                            "germplasmDbId": 85221
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "BUSSY",
                            "type": "name",
                            "germplasmName": "BUSSY",
                            "germplasmDbId": 87899
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "MESA",
                            "type": "name",
                            "germplasmName": "MESA",
                            "germplasmDbId": 92662
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "NES",
                            "type": "name",
                            "germplasmName": "NES",
                            "germplasmDbId": 85095
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "WEST",
                            "type": "name",
                            "germplasmName": "WEST",
                            "germplasmDbId": 92406
                        }
                    }
                ]
            },
            "syn-a": {
                "search_term": "syn-a",
                "search_routines": [
                    "edit_distance"
                ],
                "matches": [
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "SANNA",
                            "type": "name",
                            "germplasmName": "SANNA",
                            "germplasmDbId": 97512
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "SONJA",
                            "type": "name",
                            "germplasmName": "SONJA",
                            "germplasmDbId": 94470
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "SYLVA",
                            "type": "name",
                            "germplasmName": "SYLVA",
                            "germplasmDbId": 90414
                        }
                    }
                ]
            },
            "ogle": {
                "search_term": "ogle",
                "search_routines": [
                    "edit_distance",
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
                            "germplasmName": "OGLE",
                            "germplasmDbId": 97779
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
                            "germplasmName": "OGLE-C-1",
                            "germplasmDbId": 98759
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "COLE",
                            "type": "name",
                            "germplasmName": "COLE",
                            "germplasmDbId": 91920
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "GLEN",
                            "type": "name",
                            "germplasmName": "GLEN",
                            "germplasmDbId": 96127
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "NILE",
                            "type": "name",
                            "germplasmName": "NILE",
                            "germplasmDbId": 91960
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "NOBLE",
                            "type": "name",
                            "germplasmName": "NOBLE",
                            "germplasmDbId": 92256
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "OBEE",
                            "type": "name",
                            "germplasmName": "OBEE",
                            "germplasmDbId": 92326
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "OTEE",
                            "type": "name",
                            "germplasmName": "OTEE",
                            "germplasmDbId": 96291
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "OTOE",
                            "type": "name",
                            "germplasmName": "OTOE",
                            "germplasmDbId": 92754
                        }
                    },
                    {
                        "search_routine": {
                            "key": "edit_distance",
                            "name": "Edit Distance Comparision",
                            "weight": 10
                        },
                        "db_term": {
                            "term": "YALE",
                            "type": "name",
                            "germplasmName": "YALE",
                            "germplasmDbId": 97530
                        }
                    }
                ]
            }
        }
    }
}
```

