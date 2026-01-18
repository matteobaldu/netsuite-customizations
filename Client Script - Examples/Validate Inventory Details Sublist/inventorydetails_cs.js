/**
* @NApiVersion 2.1
* @NScriptType ClientScript
* @NModuleScope SameAccount
*/
define(['N/currentRecord', '../lib/inventorydetails'], function (CurrentRecord, InventoryDetails) {

    function validateLine(scriptContext) {
        try {
            if (scriptContext.sublistId === 'inventoryassignment') {
                let currentRecord = CurrentRecord.get();
                let isValid = InventoryDetails.validateExpirationDate(currentRecord);
                return isValid;
            }
        } catch (e) {
            console.error(e);
        }

        return true;
    }

    return {
        validateLine: validateLine
    };

});
