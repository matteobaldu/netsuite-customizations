/**
 * @NApiVersion 2.1
 */
define(['N/error', 'N/format', './call', './status'],

    (Error, Format, Call, Status) => {

        const errorName = 'INTEGRATION_CALL_ERROR';
        let integration = null;

        const init = (_integration) => {
            integration = _integration
        }

        const execute = (params) => {
            let call = Call.execute({
                code: params.code || 200,
                integration: integration.id,
                url: params.url || integration.connection.host + '/' + params.query,
                method: params.method || 'GET',
                headers: params.headers || integration.connection.headers,
                protocol: params.protocol || 'https',
                payload: params.payload || '',
                save: params.save
            });

            if (Number(call.getValue('custrecord_democ_status')) !== Status.SUCCESS)
                throw Error.create({
                    name: errorName,
                    message: call.getValue({fieldId: 'custrecord_democ_response'})
                })
            let response = call.getValue({fieldId: 'custrecord_democ_response'});
            try {response = JSON.parse(response)} catch (e) {}
            return {
                id: call.id,
                headers: call.getValue({fieldId: 'custrecord_democ_headers'}),
                data: response
            };
        }

        return {init, execute}

    })
;
