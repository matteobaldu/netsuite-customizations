/**
* @NApiVersion 2.1
* @NScriptType UserEventScript
*/
define(['N/runtime', './lib/transaction'],

    (Runtime, Transaction) => {

        const beforeSubmit = (scriptContext) => {

            try {

                let eventTypes = [
                    scriptContext.UserEventType.CREATE,
                    scriptContext.UserEventType.EDIT
                ];

                if (eventTypes.includes(scriptContext.type)) {
                    let newRecord = scriptContext.newRecord
                    Transaction.setLineDepartment(newRecord)
                    Transaction.setNetAmount(newRecord)
                }

                eventTypes = [
                    scriptContext.UserEventType.CREATE]

                if (eventTypes.includes(scriptContext.type)) {
                    let newRecord = scriptContext.newRecord
                    let fieldIds = ['department', 'class'];
                    Transaction.setValuesFromFirstLine(newRecord, 'item', fieldIds)
                    Transaction.setNetAmount(newRecord)
                }


            } catch (error) {
                log.error('beforeSubmit', error)
            }

        }

        const afterSubmit = (scriptContext) => {

            const eventTypes = [
                scriptContext.UserEventType.XEDIT,
                scriptContext.UserEventType.APPROVE
            ];

            try {
                if (eventTypes.includes(scriptContext.type)) {
                    let newRecord = scriptContext.newRecord
                    let oldRecord = scriptContext.oldRecord
                    let currentScript = Runtime.getCurrentScript()

                    Transaction.sendApprovalNotification(newRecord, oldRecord, currentScript)

                }
            } catch (error) {
                log.error('afterSubmit', error)
            }

        }

        return {
            beforeSubmit,
            afterSubmit
        }

    });
