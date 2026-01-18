/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/error', 'N/record', 'N/runtime', 'N/task'],

    (Error, Record, Runtime, Task) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */

        const execute = (scriptContext) => {
            let orchestratorId = Runtime.getCurrentScript().getParameter({name: 'custscript_demo_per_trigger_orchestrator'});
            if(!orchestratorId) throw Error.create({name: 'IMPORT_ERROR', message: 'Orchestrator parameter not set'});
            let orchestrator = Record.load({type: 'customrecord_demo_per_orchestrator', id: orchestratorId});
            let integrationId = orchestrator.getSublistValue({
                sublistId: 'recmachcustrecord_demool_per_orchestrator',
                fieldId: 'custrecord_demool_integration',
                line: 0
            })
            let task = Task.create({
                taskType: Task.TaskType.MAP_REDUCE,
                scriptId: 'customscript_demo_per_import_mr',
                deploymentId: 'customdeploy_demo_per_import_mr'
            });
            task.params = {
                custscript_demo_per_import_integration: integrationId,
                custscript_demo_per_import_orchestrator: orchestratorId
            }
            task.submit();
        }

        return {execute}

    });