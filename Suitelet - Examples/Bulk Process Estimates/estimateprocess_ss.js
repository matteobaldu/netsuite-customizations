/**
 * @NApiVersion 2.0
 * @NScriptType scheduledScript
 * @NModuleScope Public
 *
 * Version    Date          Author        Remarks
 * 1.00       [date]        [User]        Initial Commit
 *
 */

define([ 'N/runtime', 'N/record'], function (runtime, record) {


    /**
     *
     * Scheduled scripts are server-side scripts that are executed (processed) with SuiteCloud Processors.
     * You can deploy scheduled scripts so they are submitted for processing at a future time, or at future times on
     * a recurring basis. You can also submit scheduled scripts on demand from the deployment record or from another
     * script with the task.ScheduledScriptTask API.
     *
     * @param scriptContext = { type: string }
     */
    function execute(scriptContext) {
        let stLogTitle = 'execute';

        log.debug(stLogTitle, '----START----');

        try {

            //Get parameters from Suitelet (click on Search)
            let script = runtime.getCurrentScript();

            let estimatesId = script.getParameter('custscript861_acs_estimatesid');
            let objEstimatesId = JSON.parse(estimatesId);
            let objEstimatesId2 = JSON.parse(objEstimatesId);
            let objCount =  objEstimatesId2.length
            
            for (let index = 0; index < objCount; index++) {
                let internalId = parseInt(objEstimatesId2[index].internalId);

                let objRecord = record.transform({
                    fromType: record.Type.ESTIMATE,
                    fromId: internalId,
                    toType: record.Type.SALES_ORDER,
                    isDynamic: true,
                })
                

                let recId = objRecord.save();

                log.audit(stLogTitle, 'SO ' +  recId +  ' asociated to Estimate with internalId: ' + internalId + ' was created');
              
            }       

            log.debug(stLogTitle, '----END----');
            return true;

        } catch (e) {
            log.error(stLogTitle, e);


        }

        log.debug('execute', '----END----');
    }

    return {
        execute: execute
    }
});