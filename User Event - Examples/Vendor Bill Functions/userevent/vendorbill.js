/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NAmdConfig /SuiteScripts/example/config.json
 */
define(['N/record', 'ST/transaction', 'ST/vendorbill'],

    (Record, Transaction, VendorBill) => {
        
        
        /**
        * Defines the function definition that is executed before record is submitted.
        * @param {Object} scriptContext
        * @param {Record} scriptContext.newRecord - New record
        * @param {Record} scriptContext.oldRecord - Old record
        * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
        * @since 2015.2
        */
        const beforeSubmit = (scriptContext) => {
                        
            let newRecord = scriptContext.newRecord;
            let eventTypes = [
                scriptContext.UserEventType.CREATE,
                scriptContext.UserEventType.EDIT
            ];
            if (eventTypes.includes(scriptContext.type)) {
                let fieldIds = ['department', 'class', 'location'];
                Transaction.setValuesFromFirstLine(newRecord,'item',fieldIds)
                Transaction.setValuesFromFirstLine(newRecord,'expense',fieldIds)
                Transaction.setNetAmount(newRecord)
            }
            


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

            let eventTypes = [
                scriptContext.UserEventType.CREATE,
                scriptContext.UserEventType.EDIT
            ];
            let newRecord = scriptContext.newRecord;
            
            if (newRecord.type === Record.Type.VENDOR_BILL && eventTypes.includes(scriptContext.type)) {
                let status = newRecord.getValue({fieldId: 'status'});
                let autoPay = newRecord.getValue({fieldId: 'custbody_example_autopay'});
                if (autoPay === true && status === 'Open') {
                    Transaction.autoPay(newRecord);
                    Record.submitFields({type: newRecord.type, id: newRecord.id, values: {custbody_example_autopay: false}})
                }

                VendorBill.setRemainingPoAmount(newRecord)
            }
        }
        
        return {
            beforeSubmit,
            afterSubmit
        }
        
    });
    