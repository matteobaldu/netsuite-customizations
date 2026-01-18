/**
* @NApiVersion 2.1
* @NScriptType Suitelet
*/
define(['N/redirect', 'N/record', 'N/search','N/ui/serverWidget', 'N/url', './overdueinvoices'],

(Redirect, Record, serverWidget, Url, OverdueInvoices) => {

    const onRequest = (scriptContext) => {
        if (scriptContext.request.method === 'POST') {
            doPost(scriptContext);
        }else if(scriptContext.request.method === 'GET') {
            doGet(scriptContext);
        }
    }
    const doPost = (scriptContext) => {
        let parameters = scriptContext.request.parameters;
        let request = scriptContext.request;
        let transactions = [];
        let lineCount = request.getLineCount({group: 'custpage_sublist'});
        for(let line = 0; line < lineCount; line++) {
            let process = request.getSublistValue({group: 'custpage_sublist', name: 'custpage_process', line})
            if(process === 'T')
            transactions.push({
                id: request.getSublistValue({group: 'custpage_sublist', name: 'custpage_transaction', line}),
                type: Record.Type.INVOICE
            });
        }
        if(transactions.length > 0) {
            let params = {
                period: parameters.custpage_period,
                date: parameters.custpage_date,
            };
            let jobId = OverdueInvoices.process(params, transactions);
            Redirect.toSuitelet({
                scriptId: 'customscript_demo_overdueinvoices_sl',
                deploymentId: 'customdeploy_demo_overdueinvoices_sl',
                parameters: {
                    job: jobId,
                }
            });
        }
    }
    
    
    
    const doGet = (scriptContext) => {
        const generateList = (transactions, tasks) => {
            let list = form.addSublist({
                id: 'custpage_sublist',
                type: serverWidget.SublistType.LIST,
                label: 'Invoices'
            });
            if(!tasks) {
                list.addField({id: 'custpage_process', type: serverWidget.FieldType.CHECKBOX, label: 'Select'});
            }
            list.addField({id: 'custpage_transaction',type: serverWidget.FieldType.TEXT, label: 'Transaction Id'})
            .updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            list.addField({id: 'custpage_transaction_link',type: serverWidget.FieldType.TEXT, label: 'Transaction Number'});
            list.addField({id: 'custpage_trandate',type: serverWidget.FieldType.TEXT, label: 'Date'});
            list.addField({id: 'custpage_memo',type: serverWidget.FieldType.TEXT, label: 'Memo'});
            list.addField({id: 'custpage_period',type: serverWidget.FieldType.TEXT, label: 'Period'});
            list.addField({id: 'custpage_entity',type: serverWidget.FieldType.TEXT, label: 'Entity Id'})
            .updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            list.addField({id: 'custpage_entity_link',type: serverWidget.FieldType.TEXT, label: 'Entity'});
            list.addField({id: 'custpage_account',type: serverWidget.FieldType.TEXT, label: 'Account'});
            list.addField({id: 'custpage_amount',type: serverWidget.FieldType.TEXT, label: 'Amount'})
            .updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            list.addField({id: 'custpage_amount_text',type: serverWidget.FieldType.TEXT, label: 'Amount'});
            list.addField({id: 'custpage_status',type: serverWidget.FieldType.TEXT, label: 'Transaction Status'});
            list.addField({id: 'custpage_currency',type: serverWidget.FieldType.TEXT, label: 'Transaction Currency'})
            .updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            if(tasks) {
                list.addField({id: 'custpage_task_status',type: serverWidget.FieldType.TEXT, label: 'Status Id'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
                list.addField({id: 'custpage_task_status_text',type: serverWidget.FieldType.TEXT, label: 'Status'});
                list.addField({id: 'custpage_task_message',type: serverWidget.FieldType.TEXT, label: 'Message'});
            }
            if(!tasks)
            list.addMarkAllButtons();
            
            let line = 0;
            for(let transaction of transactions) {
                if(!tasks)
                // list.setSublistValue({id: 'custpage_process', line, value: 'T'});
                list.setSublistValue({id: 'custpage_transaction', line, value: transaction.id});
                list.setSublistValue({id: 'custpage_transaction_link', line, value: '<a href="' + getLink(Record.Type.INVOICE, transaction.id) + '" target="_blank">' + (transaction.tranid) + '</a>'});
 
                list.setSublistValue({id: 'custpage_trandate', line, value: transaction.trandate});
                list.setSublistValue({id: 'custpage_memo', line, value: transaction.memo || null});

                
                list.setSublistValue({id: 'custpage_period', line, value: transaction.postingPeriodText});

                list.setSublistValue({id: 'custpage_entity', line, value: transaction.entity});
                list.setSublistValue({id: 'custpage_entity_link', line, value: '<a href="' + getLink('vendor', transaction.entity) + '" target="_blank">' + transaction.entityText + '</a>'});
  
                list.setSublistValue({id: 'custpage_account', line, value: transaction.accountText});
                list.setSublistValue({id: 'custpage_amount', line, value: transaction.amount});
                list.setSublistValue({id: 'custpage_amount_text', line, value: transaction.amount + ' ' + transaction.currencyText});                
                list.setSublistValue({id: 'custpage_currency', line, value: transaction.currency});

                list.setSublistValue({id: 'custpage_subsidiary_text', line, value: transaction.subsidiaryText});
                list.setSublistValue({id: 'custpage_status', line, value: (transaction.statusText || null)});

                if(tasks) {
                    let task = tasks[transaction.id];
                    list.setSublistValue({id: 'custpage_task_status', line, value: !!task ? task.status : null});
                    list.setSublistValue({id: 'custpage_task_status_text', line, value: !!task ? task.statusText : 'PENDING'});
                    list.setSublistValue({id: 'custpage_task_message', line, value: !!task ? (task.message || null) : null});
                }
                line++;
            }
            return list;
        }
        
        const generateForm = () => {            
            form.addFieldGroup({id: 'filters', label: 'Filters'});
            
            let invSubsidiaryField = form.addField({
                id:'custpage_inv_subsidiary',
                label: 'Subsidiary',
                type: serverWidget.FieldType.SELECT,
                source: 'subsidiary',
                container: 'filters'
            });
            if(subsidiary)
            invSubsidiaryField.defaultValue = subsidiary;

            let accountFilters = {};
            if(subsidiary)
            accountFilters.subsidiary = subsidiary;
            
            let accounts = OverdueInvoices.getAccounts(accountFilters);
            let invAccountField = form.addField({
                id: 'custpage_inv_account',
                label: 'Account',
                type: serverWidget.FieldType.SELECT,
                container: 'filters'
            });
            invAccountField.addSelectOption({value: '', text: ''})
            for(let r in accounts) invAccountField.addSelectOption({value: r, text: accounts[r]});

            if(account)
                invAccountField.defaultValue = account;

            let periods = OverdueInvoices.getPeriods(false);
            let invPeriodField = form.addField({
                id:'custpage_inv_period',
                label: 'Period',
                type: serverWidget.FieldType.SELECT,
                container: 'filters'
            });
            invPeriodField.addSelectOption({value: '', text: ''})
            for(let p in periods) invPeriodField.addSelectOption({value: p, text: periods[p]})
            if(period)
                invPeriodField.defaultValue = period;
            
            let invTrandateFromField = form.addField({
                id: 'custpage_inv_date_from',
                label: 'Date From',
                type: serverWidget.FieldType.DATE,
                container: 'filters'
            });
            if(trandateFrom)
                invTrandateFromField.defaultValue = trandateFrom;

            let invTrandateToField = form.addField({
                id: 'custpage_inv_date_to',
                label: 'Date To',
                type: serverWidget.FieldType.DATE,
                container: 'filters'
            });
            if(trandateTo)
                invTrandateToField.defaultValue = trandateTo;

            let invDueDateFromField = form.addField({
                id: 'custpage_inv_duedate_from',    
                label: 'Due Date From',
                type: serverWidget.FieldType.DATE,
                container: 'filters'
            });
            if(duedateFrom)
                invDueDateFromField.defaultValue = duedateFrom;

            let invDueDateToField = form.addField({
                id: 'custpage_inv_duedate_to',    
                label: 'Due Date To',
                type: serverWidget.FieldType.DATE,
                container: 'filters'
            });
            if(duedateTo)
                invDueDateToField.defaultValue = duedateTo;

            form.addFieldGroup({id: 'config', label: 'Settings'});
            
            let periodField = form.addField({
                id:'custpage_period',
                label: 'Period',
                type: serverWidget.FieldType.SELECT,
                container: 'config'
            });
            periodField.addSelectOption({value: '', text: ''})
            periods = OverdueInvoices.getPeriods(true)
            for(let p in periods) periodField.addSelectOption({value: p, text: periods[p]})

            let dateField = form.addField({
                id: 'custpage_date',
                label: 'Date',
                type: serverWidget.FieldType.DATE,
                container: 'config'
            });
            dateField.defaultValue = new Date();       

            transactions = OverdueInvoices.getTransactions({subsidiary, account,  period,  trandateFrom, trandateTo, duedateFrom, duedateTo});
            generateList(transactions)
            
            if(transactions.length > 0)
            form.addSubmitButton({label: 'Submit'});
            scriptContext.response.writePage(form);
            
        }
        
        const generateJobForm = () => {
            let jobField = form.addField({id:'custpage_job_status', label: 'Status', type: serverWidget.FieldType.INLINEHTML});
            
            let tasks = OverdueInvoices.getTasksByJobId(jobId);
            let job = OverdueInvoices.getJobById(jobId);
            
            let transactions = OverdueInvoices.getJobTransactions(jobId);
            generateList(transactions, tasks)
            
            jobField.defaultValue = '<span style="font-size: 20px">' + (job ? job.statusText : 'PENDING') + '</span>';
            
            form.addButton({label: 'Refresh', id: 'refresh', functionName: 'refresh'});
            scriptContext.response.writePage(form);
            
        }
        
        let getLink = (recordType, recordId) => {
            return Url.resolveRecord({recordType, recordId})
        }
        
        let parameters = scriptContext.request.parameters;
        let subsidiary = parameters.subsidiary;
        let account = parameters.account;
        let period = parameters.period;
        let trandateFrom = parameters.trandateFrom;
        let trandateTo = parameters.trandateTo;
        let duedateFrom = parameters.duedateFrom;
        let duedateTo = parameters.duedateTo;
        let jobId = parameters.job;
        let transactions = [];
        let form = serverWidget.createForm({title: 'Bad Debt Reclass'});
        form.clientScriptModulePath = './overdueinvoices_cs';
        if(jobId)
        generateJobForm()
        else
        generateForm()
        
    }
    
    return {onRequest}
    
});
