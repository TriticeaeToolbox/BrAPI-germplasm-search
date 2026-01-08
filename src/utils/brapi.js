'use strict';

const chunk_array = require('./chunk_array.js');

class BrAPI {
    constructor(address, version, auth_token, call_limit = 10) {
        this.address = address;
        this.version = {
            major: parseInt(version.replace('v', '').split('.')[0] || 1), 
            minor: parseInt(version.replace('v', '').split('.')[1] || 0),
            patch: parseInt(version.replace('v', '').split('.')[2] || 0)
        }
        this.auth_token = auth_token;
        this.call_limit = parseInt(call_limit);
    }

    get(path, { params = {}, page = 1, pageSize = 100 } = {}, progress = () => {}) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log(`[BRAPI] GET ${this.address}/${path} [${JSON.stringify({ ...params, pageSize, page })}]`);

                // Set URL, headers, and query params
                const url = `${this.address}/${path}`;
                const headers = {};
                if ( this.auth_token ) headers.Authorization = `Bearer ${this.auth_token}`;
                const query = { ...params, page, pageSize };

                // Make Request
                const response = await fetch(`${url}?` + new URLSearchParams(query), {
                    method: "GET",
                    headers,
                });

                // Request not successful
                if ( response.status === 401 ) {
                    return reject("The Synonym Search Tool is unauthorized to fetch data from this database.  Make sure the Auth Token is correct.")
                }
                else if ( response.status === 404 ) {
                    return reject("This BrAPI server does not support the /germplasm and /crosses endpoints.  Make sure the BrAPI URL is correct.");
                }
                else if ( !response.ok ) {
                    return reject(`BrAPI Server did not return valid response: HTTP Status Code ${response.status}`);
                }

                // Get Response Body
                const body = await response.json();
                const data = body?.result?.data || [];

                // Get page info
                const currentPage = body?.metadata?.pagination?.currentPage || 1;
                const totalPages = body?.metadata?.pagination?.totalPages || 1;
                const totalCount = body?.metadata?.pagination?.totalCount || data.length;
                progress(data.length, totalCount);

                // Get additional pages
                if ( currentPage === 1 && totalPages > 1 ) {
                    const additionalPages = Array.from({length: totalPages - currentPage}, (_, i) => currentPage + 1 + i);

                    // Requeset additional pages in chunks
                    const batches = chunk_array(additionalPages, this.call_limit);
                    for ( let i = 0; i < batches.length; i++ ) {
                        const tasks = [];
                        batches[i].forEach((p) => {
                            tasks.push(this.get(path, { ...params, page: p, pageSize }))
                        });                        
                        const batchResults = await Promise.all(tasks);
                        data.push(...batchResults.flat());
                        progress(data.length, totalCount);
                    }
                }

                return resolve(data);
            }
            catch (err) {
                console.log(`ERROR: Could not complete BrAPI GET request [${err}]`)
                return reject(err);
            }
        });
    }
}

module.exports = BrAPI;