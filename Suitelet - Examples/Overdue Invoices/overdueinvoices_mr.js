/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime', './overdueinvoices', './lib/status'],

    (Record, Runtime, OverdueInvoices, Status) => {

        const getInputData = (inputContext) => {
            let scriptObj = Runtime.getCurrentScript();
            let jobId = scriptObj.getParameter({name: 'custscript_demo_overdueinvoices_job'});
            let job = Record.load({type: 'customrecord_demo_job', id: jobId});
            Record.submitFields({
                type: 'customrecord_demo_job',
                id: jobId,
                values: {custrecord_demoj_status: Status.PROCESSING}
            })
            let data = JSON.parse(job.getValue({fieldId: 'custrecord_demoj_data'}));
            let params = data.params;
            params.job = jobId;
            let transactions = data.transactions;
            let inputData = [];
            for (let transaction of transactions) {
                inputData.push({params, transaction})
            }
            return inputData;
        }

        const map = (mapContext) => {
            try {
                let result = {
                    status: Status.SUCCESS,
                    message: null
                }
                let value = JSON.parse(mapContext.value);
                let params = value.params;
                let transaction = value.transaction;

                const type = 'customrecord_demo_task';
                let task = Record.create({type, isDynamic: true});
                task.setValue({fieldId: 'custrecord_demo_task_transaction', value: transaction.id});
                task.setValue({fieldId: 'custrecord_demo_task_job', value: params.job});
                task.setValue({fieldId: 'custrecord_demo_task_status', value: Status.PROCESSING});
                let id = task.save();

                let recordId = null;
                try {
                    recordId = OverdueInvoices.transform(transaction, params);
                } catch (e) {
                    result.status = Status.FAILED
                    result.message = e.message
                }
                Record.submitFields({
                    type,
                    id,
                    values: {
                        custrecord_demo_task_status: result.status,
                        custrecord_demo_task_message: result.message ? result.message.substring(0,300) : null,

                    },
                    options: {disableTriggers: true}
                })
                mapContext.write(params, {transaction, result})
            } catch (e) {
                log.error('mapContext error', e.message)
            }
        }

        const summarize = (summaryContext) => {
            let result = {
                id: null,
                status: Status.SUCCESS,
                message: null
            }
            let values = [];
            let params = null;
            summaryContext.output.iterator().each(function (key, value) {
                if (values.length === 0) params = JSON.parse(key)
                values.push(JSON.parse(value));
                return true;
            });

            let transactions = [];
            try {
                for(let v in values) {
                    if(values[v].result.status !== Status.SUCCESS) {
                        result.status = Status.FAILED
                        break;
                    }
                }
                result.id = null;
            } catch (e) {
                result.status = Status.FAILED;
                result.message = e.message
            }
            Record.submitFields({
                type: 'customrecord_demo_job',
                id: params.job,
                values: {
                    custrecord_demoj_status: result.status,
                    custrecord_demoj_message: result.message,
                    custrecord_demoj_transaction: result.id}
            })
        }

        return {getInputData, map, summarize}

    });
