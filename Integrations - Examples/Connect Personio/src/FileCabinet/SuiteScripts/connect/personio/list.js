/**
 * @NApiVersion 2.1
 */
define(['N/error', 'N/format', 'N/https'],

    (Error, Format, Https) => {

        const responseCode = 200;

        const get = (integration, url, type) => {

            let initialUrl = url;
            let inputData = [];
            let hasMorePages = false;
            let offset = 0
            do {
                let response = Https.get({
                    url: url + '&offset=' + offset,
                    headers: integration.connection.headers,
                    body: ''
                });

                if(response.code !== responseCode) throw Error.create('LIST_ERROR', response.body)
                let data = JSON.parse(response.body).data;
                inputData = inputData.concat(data);

                let metadata = JSON.parse(response.body).metadata;
                let page = Number(metadata.current_page);
                let pages = Number(metadata.total_pages);
                hasMorePages = page < pages;
                if(hasMorePages) offset += 100;
            } while (hasMorePages === true)
            return inputData;
        }

        return {get}

    });
