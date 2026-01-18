/**
 *
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 *
 * Version    Date          Author                          Remarks
 * 1.00       8/4/2022      Matteo Balduccio                Initial Version
 */

define(['N/record', 'N/runtime', 'N/search', 'N/email'],
    function (record, runtime, search, email) {

        function getInputData() {
            let stMethodName = 'getInputData',
                stSavedSearchId = runtime.getCurrentScript().getParameter('custscript_input_data_ss'),
                objSearch,
                index,
                item,
                itemKDP,
                quantity,
                arrResults = new Array()

            try {

                log.debug(stMethodName, '* * * S t a r t * * *');

                objSearch = search.load({ id: stSavedSearchId });

                // //Run each result and get values to push into array
                objSearch.run().each(function (result) {
                    item = result.getValue({ name: 'internalid', join: "item", summary: 'GROUP' });
                    itemKDP = result.getValue({ name: 'custitem1', join: "item", summary: 'GROUP' });
                    quantity = result.getValue({ name: 'formulacurrency', summary: 'SUM', formula: '{quantity}' });

                    arrResults.push({ 'item': item, 'itemKDP': itemKDP, 'quantity': quantity });

                    return true

                });

                return arrResults;

            } catch (error) {
                log.error(stMethodName, error);
            }
        }

        function map(context) {
            let stMethodName = 'Map',
                customerSO = runtime.getCurrentScript().getParameter('custscript_customer_so'),
                taxCodeSO = runtime.getCurrentScript().getParameter('custscript_taxcode_so'),
                searchResult,
                item,
                itemKDP,
                quantity,
                soRecord,
                soRecordId

            try {
                if (context.value) {

                    searchResult = JSON.parse(context.value);

                    item = searchResult.item;
                    itemKDP = searchResult.itemKDP;
                    quantity = searchResult.quantity;

                    //Create a SO for each item diplayed in the ss
                    soRecord = record.create({
                        type: record.Type.SALES_ORDER,
                        isDynamic: true,
                        defaultValues: {
                            entity: customerSO //Set customer as default from parameter 
                        }
                    });

                    soRecord.insertLine({
                        sublistId: 'item',
                        line: 0,
                    });

                    if (item) {
                        soRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: item
                        });

                        if (itemKDP) {
                            soRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_vend_item',
                                value: itemKDP
                            });
                        }

                        if (quantity) {
                            soRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: quantity
                            });
                        }

                        if (taxCodeSO) {
                            soRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'taxcode',
                                value: taxCodeSO //Set tax code as default from parameter 
                            });
                        }

                        soRecord.commitLine({
                            sublistId: 'item'
                        });

                        soRecordId = soRecord.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });

                    }

                    log.audit(stMethodName, 'Sales Order : ' + soRecordId + ' has been created in reference to item: ' + item);


                }
            } catch (error) {
                log.error(stMethodName, error);
            }
        }


        /**
 *
 * Executes when the summarize entry point is triggered.
 * When you add custom logic to this entry point function, that logic is applied to the result set.
 *
 * @param summarizeContext = { isRestarted: read-only boolean, concurrency: number, dateCreated: Date, seconds: number, usage: number,
 *                           yields: number, inputSummary: object, mapSummary: object, reduceSummary: object, output: iterator }
 */
        function summarize(summarizeContext) {
            let title = 'summarize'

            try {

                    let emailRecipient = runtime.getCurrentScript().getParameter('custscript_email_recepient'),
                    emailSender = runtime.getCurrentScript().getParameter('custscript_email_sender')


                if (emailRecipient) {

                    sendEmail(emailRecipient, emailSender);

                }


            } catch (e) {
                log.error({ title: title, details: JSON.stringify(e) });
            }

        }


        function sendEmail(emailRecepient, emailSender) {
            let stLogTitle = 'sendEmail';
            try {

                let emailSubject = "Sales Orders created from Assembly Items",
                    emailBody = "Dear user,\n\n Kindly refer to recently created Sales Order in NS for more information. \n\n",
                    emailRecepientArray = new Array()

                emailRecepientArray = emailRecepient.split(';')

                email.send({
                    author: emailSender,
                    recipients: emailRecepientArray,
                    subject: emailSubject,
                    body: emailBody
                });

                log.audit(stLogTitle, "Email sent to : " + JSON.stringify(emailRecepient));
            } catch (error) {
                log.error(stLogTitle, 'error: ' + error.message);
            }


        }

        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        }
    });