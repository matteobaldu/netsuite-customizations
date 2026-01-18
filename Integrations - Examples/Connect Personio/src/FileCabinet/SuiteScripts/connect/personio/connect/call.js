/**
 * @NApiVersion 2.1
 */
define(['N/file', 'N/http', 'N/https', 'N/record', './status'],

    (file, http, https, record, status) => {

        const outFolder = -14;
        const execute = (params) => {
            let callId = null;
            let callParams = {
                url: params.url,
                headers: params.headers,
                body: params.payload
            }
            let response = params.protocol && params.protocol.toLowerCase() === 'http' ?
                http[params.method.toLowerCase()](callParams) :
                https[params.method.toLowerCase()](callParams);

            let call = record.create({type:'customrecord_demo_per_integration_call', isDynamic: true});
            call.setValue({fieldId: 'custrecord_democ_integration', value: params.integration});
            call.setValue({fieldId: 'custrecord_democ_transaction', value: params.transaction || null});
            call.setValue({fieldId: 'custrecord_democ_url', value: params.url.length > 300 ? '' : params.url});
            call.setValue({fieldId: 'custrecord_democ_response', value: response.body});
            call.setValue({fieldId: 'custrecord_democ_headers', value: response.headers});
            call.setValue({
                fieldId: 'custrecord_democ_status',
                value: Number(response.code) === Number(params.code) ? status.SUCCESS : status.FAILED
            });
            if(params.payload === undefined) params.payload = '';
            if(params.payload.length < 100000) call.setValue({fieldId: 'custrecord_democ_payload', value: params.payload});
            if(!params.save === false) callId = call.save();
            if(params.save && (!!params.file || params.payload.length >= 100000)) {
                let fileObj = null;
                if(!!params.file) {
                    fileObj = params.file;
                    fileObj.name = callId + '.' + fileObj.fileType.toLowerCase();
                }
                else
                    fileObj = file.create({
                        name: callId + '.txt',
                        fileType: file.Type.PLAINTEXT,
                        contents: params.payload
                    });
                fileObj.name = 'demo_call_' + fileObj.name;
                fileObj.folder = outFolder;
                let fileId = fileObj.save();
                record.attach({record: {type: 'file', id: fileId}, to: {type: 'customrecord_demo_per_integration_call', id: callId}});
            }
            return call;
        }

        return {execute}

    });
