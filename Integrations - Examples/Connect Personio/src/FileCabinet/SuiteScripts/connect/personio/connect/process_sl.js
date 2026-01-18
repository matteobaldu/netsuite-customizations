/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', './cache', './integration', './status', './mapping'],
    (Record, Cache, Integration, Status, Mapping) => {

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
            let record = Record.load({type: parameters.type, id: parameters.id});
            let integrationId = parameters.integration
            let integration = Integration.init(Integration.getById(integrationId));
            Integration.set(integration);
            Mapping.init(integration.system);
            let integrationRecord = Integration.createIntegrationRecord(record, integration, {id: parameters.id});
            response = Integration.processIntegrationRecord(integrationRecord);
        }
        return response;
    }

    return {onRequest}

});
