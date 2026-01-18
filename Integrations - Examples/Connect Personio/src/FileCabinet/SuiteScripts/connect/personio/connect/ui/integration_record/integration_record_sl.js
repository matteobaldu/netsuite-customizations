/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', '../../cache', '../../integration', '../../status', '../../mapping'],
    (Record, Cache, Integration, Status, Mapping) => {

    const TYPE = 'customrecord_demo_per_integration_record';

    /**
     * Defines the Suitelet script trigger point.
     * @param {Object} scriptContext
     * @param {ServerRequest} scriptContext.request - Incoming request
     * @param {ServerResponse} scriptContext.response - Suitelet response
     * @since 2015.2
     */
    const onRequest = (scriptContext) => {
        let response = null
        if (scriptContext.request.method === 'POST') {
            response = doPost(scriptContext.request.parameters);
        }
        scriptContext.response.write(JSON.stringify(response));
    }
    const doPost = (parameters) => {
        let response = null;
        if(parameters.action === 'process') {
            let integrationRecord = Record.load({type: TYPE, id: parameters.id});
            let integrationId = integrationRecord.getValue({fieldId: 'custrecord_demor_per_integration'});
            let integration = Integration.init(Integration.getById(integrationId));
            Integration.set(integration);
            Mapping.init(integration.system);
            response = Integration.processIntegrationRecord(integrationRecord, Mapping.getMappings());
        }
        return response;
    }

    return {onRequest}

});
