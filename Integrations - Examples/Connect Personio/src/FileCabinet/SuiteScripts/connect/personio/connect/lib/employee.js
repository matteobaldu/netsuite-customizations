/**
 * @NApiVersion 2.1
 */
define(['N/error', 'N/record', 'N/search', './search', './util'], (Error, Record, Search, MCISearch, Util) => {

    let obj = {items: {}};
    let sublistId = null;
    const errorName = 'EMPLOYEE_ERROR'

    const get = (params) => {
        sublistId = sublistId || 'item';
        let transaction = Record.load(params);
        let fields = transaction.getFields();
        fields.forEach(fieldId => {
            let value = transaction.getValue({fieldId});
            let text = transaction.getText({fieldId}) || transaction.getValue({fieldId});
            if (fieldId.startsWith('custbody_')) fieldId = fieldId.replace('custbody_', '_')
            obj[fieldId] = params.text ? text : value
            if (params.text) obj[fieldId + '_value'] = value;
            else obj[fieldId + '_text'] = text;

        })
        fields = transaction.getSublistFields({sublistId: sublistId});
        let lineCount = transaction.getLineCount({sublistId: sublistId});
        for (let line = 0; line < lineCount; line++) {
            let key = transaction.getSublistValue({sublistId: sublistId, fieldId: params.key || 'line', line: line});
            let lineObj = {};
            fields.forEach(fieldId => {
                let value = transaction.getSublistValue({sublistId, fieldId, line});
                let text = transaction.getSublistText({sublistId, fieldId, line}) || transaction.getSublistValue({sublistId, fieldId, line});
                if (fieldId.startsWith('custcol_')) fieldId = fieldId.replace('custcol_', '_');
                lineObj[fieldId] = params.text ? text : value;
                if(params.text) lineObj[fieldId + '_value'] = value
                else lineObj[fieldId + '_text'] = text
            })
            obj.items[key] = lineObj;
        }
        return obj;
    }

    const save = (values, addresses, integrationData) => {

        let employeeData = {}

        employeeData = getEmployeeData(values);

        employeeData = Object.keys(employeeData).length > 0 ? employeeData : null;

        let hash = Util.hashObject(values);
        integrationData._demo_per_hash = hash;

        if(employeeData) {
            values.id = employeeData.id;
            if(employeeData.hash === hash) return employeeData.id
        }

        let employee = employeeData ?
            Record.load({type: Record.Type.EMPLOYEE, id: employeeData.id, isDynamic: true}) :
            Record.create({type: Record.Type.EMPLOYEE, isDynamic: true});

        setValues(employee, values, ['currency'])
        setValues(employee, integrationData)
        return employee.save();
    }

    const getEmployeeData = (values) => {
        let employeeData = {}
        
        let searchObj = Search.create({
            type: Record.Type.EMPLOYEE,
            filters: [
                ['externalid', 'is', values.externalid],
                'AND',
                ['subsidiary', 'anyof', values.subsidiary]
                
            ],
            columns: [
                'internalid',
                'custentity_demo_per_hash'
            ]
        });

        searchObj.run().each(function (result) {
            employeeData = {
                id: result.getValue('internalid'),
                hash: result.getValue('custentity_demo_per_hash')
            }
            return false;
        });

        if (Object.keys(employeeData).length == 0){ // Si no se encuentra el empleado por el {ID de Personio} y {Subsidiaria} se busca si existe por el {ID de Personio} 

            let searchObj = Search.create({
                type: Record.Type.EMPLOYEE,
                filters: [
                    ['externalid', 'is', values.externalid]
                ],
                columns: [
                    Search.createColumn({ name: 'internalid' }),
                    Search.createColumn({ name: 'custentity_demo_per_hash' }),
                    Search.createColumn({ name: 'datecreated', sort: Search.Sort.DESC })
                ]
            });

            searchObj.run().each(function (result) {
                employeeData = {
                    id: result.getValue('internalid'),
                    hash: result.getValue('custentity_demo_per_hash')
                }
                return false;
            });

            if (employeeData.id ){
                //En caso que hayan registros relacionados, se marca el empleado como inactivo y se crea un nuevo registro de empleado
                //De lo contrario se prosigue a realizar un update normal de la subsidiaria del empleado
                if (hasRelatedRecords(employeeData.id)) { 
                    Record.submitFields({
                        type: Record.Type.EMPLOYEE,
                        id: employeeData.id,
                        values: {
                            externalid: values.externalid + '_' + values.subsidiary + '_inactive',
                            entityid: values.externalid + '_' + values.subsidiary + '_inactive',
                            isinactive: true
                        },                    
                    })

                    employeeData = {};
                }
            }
        }

        return employeeData;
    }

    const hasRelatedRecords = (employeeId) => {
        return (
            checkTransactions(employeeId)
        );
    }

    const checkTransactions = (employeeId) => {
        let transactionSearch = Search.create({
            type: Search.Type.TRANSACTION,
            filters: [
                ['name', 'anyof', employeeId]
            ],
            columns: ['internalid']
        });
        return hasResults(transactionSearch);
    }

    const hasResults = (searchObj) => {
        return searchObj.runPaged({ pageSize: 1 }).count > 0;
    }

    const setValues = (employee, values, keepFields) => {
        if(!keepFields) keepFields = [];
        Object.keys(values).forEach(f => {
            let value = values[f];
            if (f.startsWith('_')) f = f.replace('_', 'custentity_')
            if (!employee.id || keepFields.indexOf(f) === -1)
                employee.setValue({fieldId: f, value: value})
        });
    }

    const transform = (params) => {
        let transaction = Record.transform({
            fromId: params.fromId,
            fromType: params.fromType,
            toType: params.toType,
            isDynamic: true
        });
        let obj = params.object;
        Object.keys(obj).forEach(f => {
            let value = obj[f];
            if (f.startsWith('_')) f = f.replace('_', 'custbody_')
            transaction.setValue({fieldId: f, value: value})
        });
        return transaction.save();
    }

    return {get, save, transform}

});
