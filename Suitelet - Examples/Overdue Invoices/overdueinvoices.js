/**
* @NApiVersion 2.1
*/
define(['N/format', 'N/record', 'N/runtime', 'N/search', 'N/task'],
(Format, Record, Runtime, Search, Task) => {
    
    const getTransactions = (params , job) => {
        const sanitizeName = (name) => {
            if (name.indexOf(':') === -1)
            return name
            let arr = name.split(':');
            return arr[arr.length - 1];
        }
        let transactions = []; 
        let searchObj = Search.load({
            id: 'customsearch_demo_overdueinvoicesportlet_s',
            type: Search.Type.INVOICE
        })

        if(!job){
            let filter = Search.createFilter({
                name: 'custbody_demo_bad_debt',
                operator: Search.Operator.IS,
                values: false
            });
    
            searchObj.filters.push(filter)
        }    


        if (params) {
            if (params.period) {
                let filter = Search.createFilter({
                    name: 'postingperiod',
                    operator: Search.Operator.ANYOF,
                    values: params.period
                });
    
                searchObj.filters.push(filter)
            }
            if (params.subsidiary) {
                let filter = Search.createFilter({
                    name: 'subsidiary',
                    operator: Search.Operator.ANYOF,
                    values: params.subsidiary
                });
    
                searchObj.filters.push(filter)
            }
            if (params.account) {
                let filter = Search.createFilter({
                    name: 'account',
                    operator: Search.Operator.ANYOF,
                    values: params.account
                });
    
                searchObj.filters.push(filter)
            }
            
            let trandateFrom = params.trandateFrom;
            let trandateTo = params.trandateTo;
            if (trandateFrom || trandateTo) {
                if (trandateFrom && !trandateTo) {
                    searchObj.filters.push(Search.createFilter({
                        name: 'trandate',
                        operator: "onorafter",
                        values: trandateFrom
                    }));
                } else if (!trandateFrom && trandateTo) {
                    searchObj.filters.push(Search.createFilter({
                        name: 'trandate',
                        operator: "onorbefore",
                        values: trandateTo
                    }));
                } else if (trandateFrom && trandateTo) {
                    searchObj.filters.push(Search.createFilter({
                        name: 'trandate',
                        operator: "within",
                        values: [trandateFrom, trandateTo]
                    }));
                }
            }

            let duedateFrom = params.duedateFrom;
            let duedateTo = params.duedateTo;
            if (duedateFrom || duedateTo) {
                if (duedateFrom && !duedateTo) {
                    searchObj.filters.push(Search.createFilter({
                        name: 'duedate',
                        operator: "onorafter",
                        values: duedateFrom
                    }));
                } else if (!duedateFrom && duedateTo) {
                    searchObj.filters.push(Search.createFilter({
                        name: 'duedate',
                        operator: "onorbefore",
                        values: duedateTo
                    }));
                } else if (duedateFrom && duedateTo) {
                    searchObj.filters.push(Search.createFilter({
                        name: 'duedate',
                        operator: "within",
                        values: [duedateFrom, duedateTo ]
                    }));
                }
            }

            if (params.id) {
                let filter = Search.createFilter({
                    name: 'internalid',
                    operator: Search.Operator.ANYOF,
                    values: params.id
                });
    
                searchObj.filters.push(filter)
            }           
        }

        searchObj.run().each(function (result) {
            let t = {
                id: result.id,
                tranid: result.getValue('tranid'),
                trandate: result.getValue('trandate'),
                postingperiod: result.getValue('postingperiod'),
                postingPeriodText: result.getText('postingperiod'),
                entity: result.getValue('entity'),
                entityText: sanitizeName(result.getText('entity')),
                account: result.getValue('account'),
                accountText: result.getText('account'),
                memo: result.getValue('memo'),
                amount: result.getValue('fxamount'),
                status: result.getValue('statusref'),
                statusText: result.getText('statusref'),
                currency: result.getValue('currency'),
                currencyText: result.getText('currency'),
                subsidiary: result.getValue('subsidiarynohierarchy'),
                subsidiaryText: result.getText('subsidiarynohierarchy'),
            }
            transactions.push(t);
            return transactions.length < 100;
        });
        return transactions;
    }
    
    const getAccounts = (params) => {
        let accounts = {}
        let filters = []
        if(params.subsidiary) {
            filters.push(['subsidiary', 'anyof', params.subsidiary])
        }
        let searchObj = Search.create({
            type: 'account',
            filters,
            columns: [
                Search.createColumn({
                    name: "name"
                }), 
                Search.createColumn({
                    name: "number",
                    sort: Search.Sort.DESC
                }),
                Search.createColumn({
                    name: "internalid"
                })]
            });
            searchObj.run().each(function (result) {
                accounts[result.id] = result.getValue('number') ? result.getValue('number') + ' - ' + result.getValue('name') : result.getValue('name') 
                return true;
            });
            return accounts;
        }
        
    const getPeriods = (isClosed) => {
        let periods = {};
        let searchObj = Search.create({
            type: 'accountingperiod',
            filters: [
                ['isquarter', 'is', 'F'],
                'AND',
                ['isyear', 'is', 'F'],
            ],
            columns: ['periodname']
        });

        if (isClosed) {
            let filter = Search.createFilter({
                name: 'closed',
                operator: Search.Operator.IS,
                values: 'F'
            });

            searchObj.filters.push(filter)
        }

        searchObj.run().each(function (result) {
            periods[result.id] = result.getValue('periodname')
            return true;
        });
        return periods;
    }

    
    
    const getJobTransactions = (id) => {
        let job = Record.load({type: 'customrecord_demo_job', id: id});
        let data = JSON.parse(job.getValue({fieldId: 'custrecord_demoj_data'}));
        let ids = data.transactions.map(d => d.id);
        return getTransactions({id: ids} , job);
    }
    
    const getJobById = (id) => {
        let job = null;
        let columns = [
            'custrecord_demoj_status',
            'custrecord_demoj_transaction',
            'custrecord_demoj_message'
        ];
        let searchObj = Search.create({
            type: 'customrecord_demo_job',
            filters: [
                ['internalid', 'anyof', id],
            ],
            columns: columns
        });
        searchObj.run().each(function (result) {
            job = {
                status: result.getValue(columns[0]),
                statusText: result.getText(columns[0]),
                transaction: result.getValue(columns[1]),
                transactionText: result.getText(columns[1]),
                message: result.getValue(columns[2])
            }
            return false;
        });
        return job;
    }
    
    const getTasksByJobId = (id) => {
        let tasks = {};
        let columns = [
            'custrecord_demo_task_transaction',
            'custrecord_demo_task_status',
            'custrecord_demo_task_message',
        ];
        let searchObj = Search.create({
            type: 'customrecord_demo_task',
            filters: [
                ['custrecord_demo_task_job', 'anyof', id],
            ],
            columns: columns
        });
        searchObj.run().each(function (result) {
            tasks[result.getValue(columns[0])] = {
                status: result.getValue(columns[1]),
                statusText: result.getText(columns[1]),
                message: result.getValue(columns[2]),
            }
            return true;
        });
        return tasks;
    }
    
    const process = (params, transactions) => {
        let job = Record.create({type: 'customrecord_demo_job', isDynamic: true});
        job.setValue({fieldId: 'custrecord_demoj_type', value: 'demo_overdueinvoices'});
        job.setValue({fieldId: 'custrecord_demoj_data', value: JSON.stringify({params, transactions})});
        job.save();
        
        Task.create({
            taskType: Task.TaskType.MAP_REDUCE,
            scriptId: 'customscript_demo_overdueinvoices_mr',
            // deploymentId: 'customdeploy_demo_overdueinvoices_mr',
            params: {custscript_demo_overdueinvoices_job: job.id}
        }).submit();
        
        return job.id;
    }
    
    const transform = (transaction, params) => {
        const createJournal = (transaction, firstJE) => {
            let trandate = params.date ? Format.parse({value: params.date, type: Format.Type.DATE}) : new Date();
            let period = params.period;
            let scriptObj = Runtime.getCurrentScript();
            let sublistId = 'line';
            let journal = Record.create({type: Record.Type.JOURNAL_ENTRY, isDynamic: true});
            journal.setValue({fieldId: 'subsidiary', value: transaction.getValue({fieldId: 'subsidiary'})});
            journal.setValue({fieldId: 'trandate', value: transaction.getValue({fieldId: 'duedate'})});
            journal.setValue({fieldId: 'currency', value: transaction.getValue({fieldId: 'currency'})});
            journal.setValue({fieldId: 'custbody_demo_overdueinvoice', value: transaction.id});
            journal.setValue({fieldId: 'trandate', value: trandate});
            journal.setValue({fieldId: 'postingperiod', value: period});
            journal.setValue({fieldId: 'memo', value: 'Journal Entry for overdue invoice ' + transaction.getValue({fieldId: 'tranid'})});

            let department = transaction.getSublistValue({sublistId: 'item', fieldId: 'department', line: 0});
            department = department ? department : scriptObj.getParameter({name: 'custscript_demo_bd_department_default'});
            let location = transaction.getSublistValue({sublistId: 'item', fieldId: 'location', line: 0});
            location = location ? location : getSubsidiaryLocation(transaction.getValue({fieldId: 'subsidiary'}));
            let _class = transaction.getSublistValue({sublistId: 'item', fieldId: 'class', line: 0});
            _class = _class ? _class : scriptObj.getParameter({name: 'custscript_demo_bd_class_default'});
            
            // First line
            let accountIdLine1 = firstJE ? transaction.getValue({fieldId: 'account'}) : scriptObj.getParameter({name: 'custscript_demo_bd_account_2'});
            journal.selectNewLine({sublistId});
            journal.setCurrentSublistValue({sublistId, fieldId: 'account', value: accountIdLine1 });
            journal.setCurrentSublistValue({sublistId, fieldId: transaction.type === Record.Type.VENDOR_BILL ? 'debit' : 'credit', value: transaction.getValue({fieldId: 'total'})  });                
            journal.setCurrentSublistValue({sublistId, fieldId: 'department',value: department});              
            journal.setCurrentSublistValue({sublistId, fieldId: 'entity', value: transaction.getValue({fieldId: 'entity'})});
            journal.setCurrentSublistValue({sublistId, fieldId: 'memo', value: 'Journal Entry for overdue invoice ' + transaction.getValue({fieldId: 'tranid'})});
            journal.setCurrentSublistValue({sublistId, fieldId: 'class', value: _class});
            journal.setCurrentSublistValue({sublistId, fieldId: 'location',value: location});
            journal.commitLine({sublistId})
            
            // Second line
            let accountIdLine2 = firstJE ? scriptObj.getParameter({name: 'custscript_demo_bd_account_1'}) : scriptObj.getParameter({name: 'custscript_demo_bd_account_3'});
            journal.selectNewLine({sublistId});
            journal.setCurrentSublistValue({sublistId, fieldId: 'account', value: accountIdLine2});
            journal.setCurrentSublistValue({sublistId,fieldId: transaction.type === Record.Type.VENDOR_BILL ? 'credit' : 'debit', value: transaction.getValue({fieldId: 'total'})  });
            journal.setCurrentSublistValue({sublistId, fieldId: 'department', value: department});
            journal.setCurrentSublistValue({sublistId, fieldId: 'entity', value: transaction.getValue({fieldId: 'entity'})});
            journal.setCurrentSublistValue({sublistId, fieldId: 'memo', value: 'Journal Entry for overdue invoice ' + transaction.getValue({fieldId: 'tranid'})});
            journal.setCurrentSublistValue({sublistId, fieldId: 'class', value: _class});
            journal.setCurrentSublistValue({sublistId, fieldId: 'location', value: location });
            journal.commitLine({sublistId})
            
            return journal.save();
            
        }

        const getSubsidiaryLocation = (subsidiaryId) => {
            let location = null
            let locationSearchObj = Search.lookupFields({
                type: Search.Type.SUBSIDIARY,
                id: subsidiaryId,
                columns: 'custrecord_demo_defaultlocation'
            })
            locationSearchObj = locationSearchObj.custrecord_demo_defaultlocation;
            if (locationSearchObj) {
                location = locationSearchObj[0].value;
            }
            return location;
        }
            
        let rec = Record.load({type: transaction.type, id: transaction.id});
        
        let journalId = null;
        let journalId2 = null;
        let accounts = [];

        try{
            journalId = createJournal(rec, true);
                
        } catch (e) {
            if(journalId)
            Record.delete({type: Record.Type.JOURNAL_ENTRY, id: journalId})
            throw e;
        }

        
        try{
            journalId2 = createJournal(rec, false);   

        } catch (e) {
            if(journalId2)
            Record.delete({type: Record.Type.JOURNAL_ENTRY, id: journalId2})
            throw e;
        }

        Record.submitFields({
            type: transaction.type,
            id: transaction.id,
            values: {
                custbody_demo_related_journal: journalId,
                custbody_demo_related_journal2: journalId2,
                custbody_demo_bad_debt: true
            },
            options: {
                enableSourcing: false,
                ignoreMandatoryFields : true,
                disableTriggers: true
            }
        })            

        return journalId;
    }
    
    
    return {
        getTransactions,
        getAccounts,
        getPeriods,
        getJobById,
        getTasksByJobId,
        getJobTransactions,
        transform,
        process,
    }
    
})
    