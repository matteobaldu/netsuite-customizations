/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/format', 'N/url'],

function(CurrentRecord, Format, Url) {

    const sublistId = 'custpage_sublist';

    function pageInit(scriptContext) {
        window.onbeforeunload = null;
    }

    function fieldChanged(scriptContext) {
        let fields = ['custpage_inv_subsidiary', 'custpage_inv_account', 'custpage_inv_period', 'custpage_inv_date_from' , 'custpage_inv_date_to' , 'custpage_inv_duedate_from' ,'custpage_inv_duedate_to']
        let currentRecord = scriptContext.currentRecord;
        if(fields.includes(scriptContext.fieldId)) {
            let params = {
                subsidiary: currentRecord.getValue({fieldId: 'custpage_inv_subsidiary'}),
                account: currentRecord.getValue({fieldId: 'custpage_inv_account'}),
                period: currentRecord.getValue({fieldId: 'custpage_inv_period'}),
                trandateFrom: currentRecord.getValue({fieldId: 'custpage_inv_date_from'}) ? Format.format({value: currentRecord.getValue({fieldId: 'custpage_inv_date_from'}),type: Format.Type.DATE}) : null,
                trandateTo: currentRecord.getValue({fieldId: 'custpage_inv_date_to'}) ? Format.format({value: currentRecord.getValue({fieldId: 'custpage_inv_date_to'}),type: Format.Type.DATE}) : null,
                duedateFrom: currentRecord.getValue({fieldId: 'custpage_inv_duedate_from'}) ? Format.format({value: currentRecord.getValue({fieldId: 'custpage_inv_duedate_from'}),type: Format.Type.DATE}) : null,
                duedateTo: currentRecord.getValue({fieldId: 'custpage_inv_duedate_to'}) ? Format.format({value: currentRecord.getValue({fieldId: 'custpage_inv_duedate_to'}),type: Format.Type.DATE}) : null
            }       
                
            console.log(params)
            let url = Url.resolveScript({
                scriptId: 'customscript_demo_overdueinvoices_sl',
                deploymentId: 'customdeploy_demo_overdueinvoices_sl',
                params
            });
            window.location.href = url;
        }
    }

    function refresh() {
        location.reload();
    }

    function saveRecord(scriptContext) {

        let suitelet = CurrentRecord.get();
        let lineCount = suitelet.getLineCount({sublistId: 'custpage_sublist'});

        for(let line = 0; line < lineCount; line++) {
            let process = suitelet.getSublistValue({sublistId: 'custpage_sublist', fieldId: 'custpage_process', line})
            if(process === true)
                return true;
        }
        alert("No Invoices selected");
        return false;

    }

    return {
        pageInit: pageInit,
        refresh: refresh,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord
    };
    
});
