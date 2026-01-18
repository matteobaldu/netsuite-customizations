/**
 * @NApiVersion 2.1
 */
define(['N/record', './status', './lib/custrecord'], (Record, Status, Custrecord) => {

    let integration = null;
    const TYPE = 'customrecord_demo_per_integration_job';
    const COLUMNS = {
        internalid: 'id',
        custrecord_demoj_per_status: 'status',
        custrecord_demoj_per_type: 'type',
        custrecord_demoj_per_start_date: 'start_date',
        custrecord_demoj_per_end_date: 'end_date',
        custrecord_demoj_per_integration: 'integration',
        custrecord_demoj_per_parameters: 'parameters',
        custrecord_demoj_per_min_date: 'min_date',
        custrecord_demoj_per_max_date: 'max_date',
    };
    const TYPES = {
        IMPORT: 1,
        PROCESS: 2,
        EXPORT: 3
    }

    const init = (_integration) => {
        integration = _integration
    }

    const start = (type, minDate, maxDate) => {
        let job = Record.create({type: TYPE});
        job.setValue({fieldId: 'custrecord_demoj_per_status', value: Status.PROCESSING});
        job.setValue({fieldId: 'custrecord_demoj_per_type', value: type});
        job.setValue({fieldId: 'custrecord_demoj_per_start_date', value: new Date()});
        job.setValue({fieldId: 'custrecord_demoj_per_integration', value: integration.id});
        //job.setValue({fieldId: 'custrecord_demoj_per_parameters', value: JSON.stringify(parameters)})
        job.setValue({fieldId: 'custrecord_demoj_per_min_date', value: minDate})
        job.setValue({fieldId: 'custrecord_demoj_per_max_date', value: maxDate})
        return job.save()
    }

    const end = (id, success, failed) => {
        let job = Record.load({type: TYPE, id: id});
        job.setValue({fieldId: 'custrecord_demoj_per_success_records', value: success});
        job.setValue({fieldId: 'custrecord_demoj_per_failed_records', value: failed});
        job.setValue({fieldId: 'custrecord_demoj_per_end_date', value: new Date()});
        job.setValue({fieldId: 'custrecord_demoj_per_status', value: Status.SUCCESS});
        job.save();

        Record.submitFields({
            type: 'customrecord_demo_per_integration',
            id: integration.id,
            values: {
                custrecord_demo_per_last_execution: job.getValue({fieldId: 'custrecord_demoj_per_start_date'}),
                custrecord_demo_per_last_job: id
            }
        })
    }

    const getById = (id) => {
        let obj = Custrecord.get({
            type: TYPE,
            columns: COLUMNS,
            filter: ['internalid', 'anyof', id]
        });
        if(obj.parameters) obj.parameters = JSON.parse(obj.parameters);
        return obj;
    }

    return {init, start, end, getById, TYPES}
});
