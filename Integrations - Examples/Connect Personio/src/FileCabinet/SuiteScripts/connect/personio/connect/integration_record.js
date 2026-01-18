/**
 * @NApiVersion 2.1
 */
define(['N/error', 'N/record', 'N/search' ,'./status'],

    (Error, Record, Search, Status) => {
        const errorName = 'INTEGRATION_RECORD_ERROR'
        const TYPE = 'customrecord_demo_per_integration_record';
        const FIELDS = ['data', 'integration', 'external_id_field', 'call'];
        const FOLDER = -20;

        let result = {
            id: null,
            status: null,
            message: ''
        }
        let integration = null

        const init = (_integration) => {
            integration = _integration;
        }

        const getPending = (integration) => {
            let ids = [];
            let searchObj = Search.create({
                type: TYPE,
                filters: [
                    ['custrecord_demor_per_integration', 'anyof', integration.id],
                    'AND',
                    ['custrecord_demor_per_status', 'anyof', Status.PENDING]
                ],
                columns: [
                    "internalid"
                ]
            });
            searchObj.run().each(function(result){
                ids.push(result.getValue('internalid'))
                return ids.length < 1000;
            });
            return ids;
        }

        const create = (data, integration, options) => {
            if (!data) throw Error.create({name: errorName, message: 'Data is missing'});
            if (!integration) throw Error.create({name: errorName, message: 'Integration is missing'});
            if (!integration.abbreviation) throw Error.create({
                name: errorName,
                message: 'System abbreviation is missing'
            });
            let integrationRecord = Record.create({
                type: 'customrecord_demo_per_integration_record',
                isDynamic: true
            });

            let externalid = null;
            if (['Employee'].includes(integration.record_type_text)) {
                if(integration.direction_text === 'In') {
                    if (!data.attributes.hasOwnProperty(integration.external_id_field)) throw Error.create({
                        name: errorName,
                        message: 'Wrong External Id field'
                    });
                    externalid = integration.abbreviation + '_' + data.attributes.id.value;
                    externalid = externalid + '_' + new Date().getTime(); 
                }                
            } else throw Error.create({name: errorName, message: 'Integration record type not found: ' + integration.record_type_text});

            integrationRecord.setValue({
                fieldId: 'externalid',
                value: externalid
            });
            integrationRecord.setValue({fieldId: 'custrecord_demor_per_integration', value: integration.id});

            if(options && options.import_job)
                integrationRecord.setValue({fieldId: 'custrecord_demor_per_import_job', value: options.import_job});
            

            if(options && options.isFile === true) {
                data.name = 'demo_record_' + data.name;
                data.folder = FOLDER;
                let fileId = data.save();
                integrationRecord.setValue({
                    fieldId: 'custrecord_demor_per_file',
                    value: fileId
                });
            } else
                integrationRecord.setValue({
                    fieldId: 'custrecord_demor_per_data',
                    value: JSON.stringify(data.attributes, null, '\t')
                });


            integrationRecord.setValue({fieldId: 'custrecord_demor_per_status', value: Status.PENDING});
            integrationRecord.save();
            return integrationRecord;
        }

        const storeResult = (integrationRecord, result) => {
            const getEmployeeId = (id) => {
                let searchObj = Search.create({
                    type: Record.Type.EMPLOYEE,
                    filters: [
                        ['internalid', 'is', id],
                    ],
                    columns: [
                        'internalid', 'isinactive' , 'releasedate'
                    ]
                });
                let employeeObj = {}
                searchObj.run().each(function (result) {
                    employeeObj.id = result.id;
                    employeeObj.isinactive = result.getValue('isinactive');
                    employeeObj.releasedate = result.getValue('releasedate');
                    return false;
                });
                return employeeObj
            }

            let values = {
                custrecord_demor_per_status: result.status,
                custrecord_demor_per_message: result.message,
                custrecord_demor_per_call: result.call
            }
            if(result.id) {
                if(Array.isArray(result.id) && result.id.length > 0) result.id = result.id[0];
                if(integration.record_type_text === 'Employee'){
                    values.custrecord_demor_per_employee = result.id
                    let employeeSrch = getEmployeeId(result.id)
                    let isTerminated = employeeSrch.isinactive ? new Date(employeeSrch.isinactive) < new Date () : false
                    if (employeeSrch.id && (employeeSrch.isinactive || isTerminated)) values.custrecord_demor_per_message = 'Employee (id:' + result.id + ') has been set inactive / terminated'
                }

            }
            let processJob = integrationRecord.getValue({fieldId: 'custrecord_demor_per_process_job'});
            if(processJob) values.custrecord_demor_per_process_job = processJob;
            try{
                Record.submitFields({
                    type: integrationRecord.type,
                    id: integrationRecord.id,
                    values: values,
                    options: {
                        disableTriggers: true
                    }
                });
            }catch{
                values.custrecord_demor_per_employee = null // case employee set to inactive it will throw error

                Record.submitFields({
                    type: integrationRecord.type,
                    id: integrationRecord.id,
                    values: values,
                    options: {
                        disableTriggers: true
                    }
                });
            }
        }

        return {init, getPending, create, storeResult, result, TYPE}

    });
