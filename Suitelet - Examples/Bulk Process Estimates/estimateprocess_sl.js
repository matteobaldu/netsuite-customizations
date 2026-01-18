/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * @NModuleScope Public
 *
 * Version    Date          Author        Remarks
 * 1.00       [date]        [User]        Initial Commit
 *
 */


define(['N/http', 'N/ui/serverWidget', 'N/record', 'N/runtime', 'N/log', 'N/search', 'N/format', 'N/task', 'N/redirect', 'N/url'], function (http, serverWidget, record, runtime, log, search, format, task, redirect, url) {

    function onRequest(context) {
        let stLogTitle = 'onRequest';

        log.debug(stLogTitle, '----START----');

        try {
            let request = context.request;
            let response = context.response;
            let parameters = request.parameters;

            //Get script parameters
            let objSuiteletScriptParams = getParameters();

            //Get parameters from Suitelet (click on Search)
            let objClientParams = parameters;

            if (request.method === http.Method.GET) {
                stLogTitle = 'Get Method';
                log.debug(stLogTitle, '***** GET METHOD STARTED *****');

                let params = {
                    clientScriptId: objSuiteletScriptParams.clientScriptId,
                    ssEstimatesWith: objSuiteletScriptParams.ssEstimatesWith,
                    suiteletTitle: objSuiteletScriptParams.suiteletTitle,
                    pageSize: objSuiteletScriptParams.pageSize,
                    pageId: forceFloat(objClientParams.custparam_page),
                    stLinesChecked: objClientParams.custparam_estimatesEdited,
                    ssFilters: objClientParams.custparam_savedSearchFilters || null
                }

                let form = displayForm(params);
                response.writePage(form);
                log.debug(stLogTitle, '***** GET METHOD FINISHED *****');

            } else if (request.method === http.Method.POST) {

                stLogTitle = 'Post Method';
                log.debug(stLogTitle, '***** POST METHOD STARTED *****');

                let scheduleScriptId = objSuiteletScriptParams.scheduleScriptId
                // Commented in order of having two deployments available 
                //let scheduleScriptDeploymentId = objSuiteletScriptParams.scheduleScriptDeploymentId
                let stLinesChecked = JSON.stringify(objClientParams.custpage_estimatesqueue);


                let scheduledScript = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT
                });
                scheduledScript.scriptId = scheduleScriptId;
                //scheduledScript.deploymentId = scheduleScriptDeploymentId;
                scheduledScript.params = { 'custscript861_acs_estimatesid': stLinesChecked };

                // Submit the task
                let asyncTaskId = scheduledScript.submit();

                let scheme = 'https://';
                let host = url.resolveDomain({
                    hostType: url.HostType.APPLICATION
                });
                let base = scheme + host + "/app/accounting/transactions/transactionlist.nl?Transaction_TYPE=SalesOrd";
                
                redirect.redirect({ url: base, parameters: {} });

                log.debug(stLogTitle, '***** POST METHOD FINISHED *****');

            }

            log.debug(stLogTitle, '----END----');
        } catch (e) {
            log.error(stLogTitle, e);
        }
    }

    //Displays the suitelet with all the fields needed
    function displayForm(params) {
        let stLogTitle = 'displayForm';
        try {

            let script = runtime.getCurrentScript();

            let form = serverWidget.createForm({
                title: params.suiteletTitle
            });

            //clientScript
            form.clientScriptFileId = params.clientScriptId;

            //Executes de SS 
            let retrieveSearch = runSearch(params.ssEstimatesWith, params.pageSize, params.ssFilters);

            if (retrieveSearch) {
                let pageCount = 1;

                if (retrieveSearch.count > 0) {
                    pageCount = forceFloat(retrieveSearch.count / params.pageSize);
                }

                if (!params.pageId || params.pageId == '' || params.pageId < 0) {
                    params.pageId = 0;
                } else if (params.pageId >= pageCount) {
                    params.pageId = pageCount - 1;
                }

                //Creates the headers (filters, buttons)
                form = createHeaderFields(form, params, pageCount);

                // Get subset of data to be shown on page
                let addResults = fetchSearchResult(retrieveSearch, params.pageId);

                //Call function to create records sublist
                let sublistAllRecords = createSublistAllRecords(form);

                //Call function to get columns in search
                let columnsSearch = runSearchColumns(params.ssEstimatesWith);

                //Call function to set sublist values
                completeSublistAllRecords(sublistAllRecords, addResults, columnsSearch, params);
            }

            return form;

        } catch (e) {
            log.error(stLogTitle, e);
        }
    }

    // create header fields on suitelet
    function createHeaderFields(form, params, pageCount) {
        let stLogTitle = 'createHeaderFields';
        try {
            log.debug(stLogTitle, '---- START ----');

            let filters = params.ssFilters

            //FILTERS

            //Name
            let name = form.addField({
                id: 'custpage_name',
                type: serverWidget.FieldType.TEXT,
                label: 'Name'
            });

            //Date From
            let estimateDateFrom = form.addField({
                id: 'custpage_datefrom',
                type: serverWidget.FieldType.DATE,
                label: 'Date From'
            });

            //Date To
            let estimateDateTo = form.addField({
                id: 'custpage_dateto',
                type: serverWidget.FieldType.DATE,
                label: 'Date To'
            });

            //Pagination field
            let objPageIdField = form.addField({
                id: 'custpage_pageid',
                label: 'Page Index',
                type: serverWidget.FieldType.SELECT
            });

            //Estimates in queue
            let selectAll = form.addField({
                id: 'custpage_selectall',
                type: serverWidget.FieldType.CHECKBOX,
                label: 'Select All'
            });

            //Estimates in queue
            let estimatesInQueueField = form.addField({
                id: 'custpage_estimatesqueue',
                type: serverWidget.FieldType.LONGTEXT,
                label: 'Estimates in queue'
            });

            estimatesInQueueField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            if (!isEmpty(filters)) {
                filters = JSON.parse(filters);

                if (!isEmpty(filters.name)) {
                    name.defaultValue = filters.name;
                }

                if (!isEmpty(filters.dateFrom)) {
                    estimateDateFrom.defaultValue = new Date(filters.dateFrom);
                }

                if (!isEmpty(filters.dateTo)) {
                    estimateDateTo.defaultValue = new Date(filters.dateTo);
                }
            }

            if (!isEmpty(params.stLinesChecked)) {
                estimatesInQueueField.defaultValue = params.stLinesChecked;
            }

            for (let i = 0; i < pageCount; i++) {
                if (i == params.pageId) {
                    objPageIdField.addSelectOption({
                        value: i,
                        text: ((i * params.pageSize) + 1) + ' - ' + ((i + 1) * params.pageSize),
                        isSelected: true
                    });
                } else {
                    objPageIdField.addSelectOption({
                        value: i,
                        text: ((i * params.pageSize) + 1) + ' - ' + ((i + 1) * params.pageSize)
                    });
                }
            }

            form.addButton({
                id: 'custpage_btn_search',
                label: 'Search',
                functionName: 'searchEstimates()'
            });

            form.addSubmitButton({
                label: 'Create SO'
            });

            return form;
        } catch (error) {
            log.error(stLogTitle, error)
        }
    }

    //Creates the sublist on the form
    function createSublistAllRecords(form) {
        let stLogTitle = 'createSublistAllRecords';
        try {
            log.debug(stLogTitle, '---- START ----');

            let sublist = form.addSublist({
                id: 'custpage_allrecords',
                type: serverWidget.SublistType.LIST,
                label: 'All Records'
            });
            sublist.addField({
                id: 'custpage_allrecords_select',
                label: 'Select',
                type: serverWidget.FieldType.CHECKBOX
            });
            sublist.addField({
                id: 'custpage_allrecords_internalid',
                label: 'Internal Id',
                type: serverWidget.FieldType.TEXT
            });
            
            //HIDE COLUMN : internalid
            let internalidfield = sublist.getField({id:'custpage_allrecords_internalid'}); 
            internalidfield.updateDisplayType({displayType : serverWidget.FieldDisplayType.HIDDEN});


            sublist.addField({
                id: 'custpage_allrecords_documentnumber',
                label: 'Document Number',
                type: serverWidget.FieldType.TEXT
            });

            sublist.addField({
                id: 'custpage_allrecords_name',
                label: 'Name',
                type: serverWidget.FieldType.TEXT
            });
            sublist.addField({
                id: 'custpage_allrecords_date',
                label: 'Date',
                type: serverWidget.FieldType.TEXT
            });
            sublist.addField({
                id: 'custpage_allrecords_status',
                label: 'Status',
                type: serverWidget.FieldType.TEXT
            });
            sublist.addField({
                id: 'custpage_allrecords_currency',
                label: 'Currency',
                type: serverWidget.FieldType.TEXT
            });
            sublist.addField({
                id: 'custpage_allrecords_amount',
                label: 'Amount',
                type: serverWidget.FieldType.TEXT
            });
            return sublist;
        } catch (error) {
            log.error(stLogTitle, error);
        }
    }

    //Sets all the values on the item sublist on the suitelet
    function completeSublistAllRecords(sublist, addResults, lstColumns, params) {
        let stLogTitle = 'completeSublistAllRecords';
        try {

            log.debug(stLogTitle, '---- START ----');

            if (!isEmpty(addResults)) {

                let arrLinesChecked = !isEmpty(params.stLinesChecked) ? JSON.parse(params.stLinesChecked) : [];
                let count = 0;

                for (let i = 0; i < addResults.length; i++) {

                    let recordInternalId = addResults[i].internalid;
                    let recordDocumentNumber = addResults[i].documentnumber;
                    let recordName = addResults[i].name;
                    let recordDate = addResults[i].date;
                    let recordStatus = addResults[i].status;
                    let recordCurrency = addResults[i].currency;
                    let recordAmount = addResults[i].amount;

                    for (let col = 0; col < lstColumns.length; col++) {

                        let key = lstColumns[col].name;
                        let eleValue = addResults[i][key];

                        if (key == 'internalid') {
                            if (!isEmpty(arrLinesChecked)) {
                                let indexOfEstimate = getEstimatefromArray(arrLinesChecked, eleValue);
                                //if estimate is checked
                                if (indexOfEstimate > -1) {
                                    sublist.setSublistValue({
                                        id: 'custpage_allrecords_select',
                                        line: count,
                                        value: 'T'
                                    });
                                } else {
                                    sublist.setSublistValue({
                                        id: 'custpage_allrecords_select',
                                        line: count,
                                        value: 'F'
                                    });
                                }
                            }
                        }

                        if (!isEmpty(recordInternalId)) {
                            sublist.setSublistValue({
                                id: 'custpage_allrecords_internalid',
                                line: count,
                                value: recordInternalId
                            });
                        }

                        if (!isEmpty(recordDocumentNumber)) {
                            let link = url.resolveRecord({
                                recordType: record.Type.ESTIMATE,
                                recordId: recordInternalId,
                                isEditMode: false
                            });
            
                            let estimateURL = '<a style="color: rgb(37,85,153)" href="' + link + '">' + recordDocumentNumber + '</a>';
                            sublist.setSublistValue({
                                id: 'custpage_allrecords_documentnumber',
                                line: count,
                                value: estimateURL
                            });
                        }

                        if (!isEmpty(recordName)) {
                            sublist.setSublistValue({
                                id: 'custpage_allrecords_name',
                                line: count,
                                value: recordName
                            });
                        }

                        if (!isEmpty(recordDate)) {
                            sublist.setSublistValue({
                                id: 'custpage_allrecords_date',
                                line: count,
                                value: recordDate
                            });
                        }

                        if (!isEmpty(recordStatus)) {
                            sublist.setSublistValue({
                                id: 'custpage_allrecords_status',
                                line: count,
                                value: recordStatus
                            });
                        }

                        if (!isEmpty(recordCurrency)) {
                            sublist.setSublistValue({
                                id: 'custpage_allrecords_currency',
                                line: count,
                                value: recordCurrency
                            });
                        }

                        if (!isEmpty(recordAmount)) {
                            sublist.setSublistValue({
                                id: 'custpage_allrecords_amount',
                                line: count,
                                value: recordAmount
                            });
                        }
                    }

                    count++;
                }
            }

        } catch (e) {
            log.error(stLogTitle, e);
        }
    }

    //Pagination aux functions - runs the search and applies the filters needed
    //function runSearch(searchId, searchPageSize, transactionType, date, lobBrand, dvAdvertiser, dvPo, docNumber, mainLine, sfInvoiceId, mediaType) {
    function runSearch(searchId, searchPageSize, filters) {
        let stLogTitle = 'runSearch';
        try {

            let searchObj = search.load({
                id: searchId
            });

            if (filters) {
                filters = JSON.parse(filters);
                log.debug(stLogTitle, JSON.stringify(filters));

                let name = filters.name || null;
                let dateFrom = searchFormatDate(filters.dateFrom) || null;
                let dateTo = searchFormatDate(filters.dateTo) || null;

                // Log the filters in the current search
                log.debug(stLogTitle, "Filter name: " + name);
                log.debug(stLogTitle, "Filter dateFrom: " + dateFrom);
                log.debug(stLogTitle, "Filter dateTo: " + dateTo);

                if (!isEmpty(name)) {
                    searchObj.filters.push(search.createFilter({
                        name: 'name',
                        operator: search.Operator.ANYOF,
                        values: name
                    }));
                }

                if (!isEmpty(dateFrom) && isEmpty(dateTo)) {
                    searchObj.filters.push(search.createFilter({
                        name: 'trandate',
                        operator: "onorafter",
                        values: dateFrom
                    }));
                } else if (isEmpty(dateFrom) && !isEmpty(dateTo)) {
                    searchObj.filters.push(search.createFilter({
                        name: 'trandate',
                        operator: "onorbefore",
                        values: dateTo
                    }));
                } else if (!isEmpty(dateFrom) && !isEmpty(dateTo)) {
                    searchObj.filters.push(search.createFilter({
                        name: 'trandate',
                        operator: "within",
                        values: [dateFrom, dateTo]
                    }));
                }
            }
            return searchObj.runPaged({
                pageSize: searchPageSize
            });
        } catch (error) {
            log.error(stLogTitle, error);
        }
    }

    //Gets the search, runs it and returns the results
    function fetchSearchResult(pagedData, pageIndex) {
        let stLogTitle = 'fetchSearchResult';
        try {
            let results = null;

            if (!isEmpty(pagedData)) {
                let searchPage = pagedData.fetch({
                    index: pageIndex
                });

                results = new Array();
                searchPage.data.forEach(function (result) {
                    let internalid = result.getValue('internalid');
                    let documentnumber = result.getValue('tranid');
                    let name = result.getText('entity');
                    let date = result.getValue('trandate');
                    let status = result.getValue('statusref');
                    let currency = result.getText('currency');
                    let amount = result.getValue('amount');

                    results.push({
                        "internalid": internalid,
                        "documentnumber": documentnumber,
                        "name": name,
                        "date": date,
                        "status": status,
                        "currency": currency,
                        "amount": amount
                    });
                });
            }

            return results;
        } catch (error) {
            log.error(stLogTitle, error);
        }
    }
    //End Pagination aux functions

    function getParameters() {
        let stLog = 'getParameters';
        try {
            let script = runtime.getCurrentScript();
            let objParams = {
                clientScriptId: script.getParameter('custscript832_acs_clientscriptid'),
                scheduleScriptId: script.getParameter('custscript832_acs_schedulescriptid'),
                scheduleScriptDeploymentId: script.getParameter('custscript832_acs_schedulescriptdeployid'),
                ssEstimatesWith: script.getParameter('custscript832_acs_ssestimateswith'),
                suiteletTitle: script.getParameter('custscript832_acs_suitelettitle'),
                pageSize: script.getParameter('custscript832_acs_pagesize'),
            }

            return objParams;
        } catch (error) {
            log.error(stLog, error.message);
        }
    }

    //Validates if it is empty
    function isEmpty(value) {
        let stLogTitle = 'isEmpty';
        try {
            if (value == null || value == '' || (!value) || value == 'undefined') {
                return true;
            }
            return false;
        } catch (error) {
            log.error(stLogTitle, error);
        }
    }

    function forceFloat(stValue) {
        let flValue = parseFloat(stValue);

        if (isNaN(flValue) || (stValue == Infinity)) {
            return 0.00;
        }

        return flValue;
    }

    function searchFormatDate(date) {
        let stLogTitle = 'searchFormatDate';
        try {
            if (!isEmpty(date)) {
                let stringDate = format.format({
                    value: date,
                    type: format.Type.DATE
                });
                return stringDate;
            }
            return null;
        } catch (error) {
            log.error(stLogTitle, 'Error: ' + error);
        }
    }

    //Columns of the Search
    function runSearchColumns(searchId) {
        let logTitle = 'runSearchColumns';
        try {
            let searchObj = search.load({
                id: searchId
            });
            return searchObj.columns;
        } catch (error) {
            log.error(logTitle, error);
        }
    }

    function getEstimatefromArray(arrayEditedEstimates, internalId) {
        let logTitle = 'getEstimatefromArray';
        try {
            for (let i = 0; i < arrayEditedEstimates.length; i++) {
                let estimates = arrayEditedEstimates[i];
                if (estimates.internalId == internalId)
                    return i;
            }
        } catch (error) {
            console.log(logTitle, error.message);
        }
        return -1;
    }

    return {
        onRequest: onRequest
    }
});
