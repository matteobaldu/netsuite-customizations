/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/demo/config.json
 */
define(['N/record'], (Record) => {

    /**
     * Defines the Scheduled script trigger point.
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
     * @since 2015.2
     */
    const getNextIntegration = (orchestratorId, integrationId) => {
        let nextIntegration = null;
        let orchestrator = Record.load({type: 'customrecord_demo_per_orchestrator', id: orchestratorId});
        let line = integrationId ?
            orchestrator.findSublistLineWithValue({
                sublistId: 'recmachcustrecord_demo_per_orchestrator',
                fieldId: 'custrecord_mcol_integration',
                value: String(integrationId)
            }) + 1 : 0;
        if (line !== -1) {
            nextIntegration = orchestrator.getSublistValue({
                sublistId: 'recmachcustrecord_demo_per_orchestrator',
                fieldId: 'custrecord_mcol_integration',
                line: line
            });
        }
        return nextIntegration;
    }

    return {getNextIntegration}

});
