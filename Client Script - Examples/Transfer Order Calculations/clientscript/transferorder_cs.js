/**
* @NApiVersion 2.1
* @NScriptType ClientScript
* @NModuleScope SameAccount
*/
define(['N/currentRecord', '../lib/transaction'], function (CurrentRecord, Transaction) {

    function pageInit(scriptContext) {
        try {
            let currentRecord = CurrentRecord.get();
            Transaction.setUnitsPerBox(currentRecord);
        } catch (e) {
            console.log(e)
        }
    }

    function fieldChanged(scriptContext) {
        try {
            let currentRecord;
            if (scriptContext.sublistId === 'item' && scriptContext.fieldId === 'custcol_example_unitsperbox') {
                currentRecord = CurrentRecord.get();
                Transaction.calculateBoxes(currentRecord);
            }

        } catch (e) {
            console.log(e)
        }
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged
    };

});
