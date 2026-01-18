/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record','N/runtime', './status', './integration'],

    (Record, Runtime, Status, Integration) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            let newRecord = scriptContext.newRecord;
            let script = Runtime.getCurrentScript();
            let integrationId = script.getParameter({name: 'custscript_demo_per_ue_integration'});
            let integration = Integration.init(Integration.getById(integrationId));
            let syncFieldId = 'custbody_demo_per_connect_' + integration.abbreviation.toLowerCase() + '_status';
            if(scriptContext.type === scriptContext.UserEventType.APPROVE || Number(newRecord.getValue({fieldId: syncFieldId})) === Status.PENDING) {
                let integrationRecord = Integration.createIntegrationRecord(newRecord)
                Integration.processIntegrationRecord(integrationRecord)
            }
        }

        return {afterSubmit}

    });
