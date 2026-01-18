/**
 * @NApiVersion 2.1
 */
define(['N/record', './util'], (record, Util) => {

    let obj = {items: {}};

    const get = (params) => {
        let sublistId = 'item';
        let transaction = record.load(params);
        let fields = transaction.getFields();
        fields.forEach(fieldId => {
            let value = transaction.getValue({fieldId});
            let text = transaction.getText({fieldId}) || transaction.getValue({fieldId});
            if (fieldId.startsWith('custbody_')) fieldId = fieldId.replace('custbody_', '_')
            obj[fieldId] = params.text ? text : value
            if (params.text) obj[fieldId + '_value'] = value;
            else obj[fieldId + '_text'] = text;

        })
        obj.type = params.type;
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

    const save = (transaction, obj, integrationData, options) => {
        integrationData._demo_per_hash = Util.hashObject(obj);
        setValues(transaction, obj);
        setValues(transaction, integrationData)
        let sublistId = 'item';
        if(obj.items)
            obj.items.forEach((item) => {
                setSublistValues(transaction, item, sublistId)
            })
        options = options || {};
        return transaction.save(options);
    }

    const setValues = (transaction, obj) => {
        Object.keys(obj).forEach(f => {
            let value = obj[f];
            if (f.startsWith('_')) f = f.replace('_', 'custbody_')
            transaction.setValue({fieldId: f, value: value})
        });
    }

    const setSublistValues = (transaction, obj, sublistId) => {
        transaction.selectNewLine({sublistId: sublistId});
        for(let f in obj) {
            let value = obj[f];
            if (f.startsWith('_')) f = f.replace('_', 'custcol_');
            transaction.setCurrentSublistValue({sublistId: sublistId, fieldId: f, value: value});
        }
        transaction.commitLine({sublistId: sublistId})
    }

    return {get, save, setValues, setSublistValues}

});
