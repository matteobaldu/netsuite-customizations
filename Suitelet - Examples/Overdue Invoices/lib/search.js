/**
 * @NApiVersion 2.x
 */
define(['N/file', 'N/search'], function (file, search) {


    const columns = {
        subsidiary : {internalid: 'id', country: 'country'},
        customer: {internalid: 'id', altname: 'name'},
        default: {internalid: 'id', type: 'type'}
    }

    function getById(params) {
        let obj = {};
        let _columns = columns.hasOwnProperty(params.type) ? columns[params.type] : columns.default;
        if(params.hasOwnProperty('columns')) _columns = Object.assign(_columns, params.columns);
        let fields = search.lookupFields({type: params.type, id: params.id, columns: Object.keys(_columns)});
        for(let c in _columns) {
            let value = Array.isArray(fields[c]) ? (fields[c].length > 0 ? fields[c][0].value : null) : fields[c];
            let text = Array.isArray(fields[c]) ? (fields[c].length > 0 ? fields[c][0].text : null) : fields[c];
            obj[_columns[c]] = value;
            obj[_columns[c] + '_text'] = text || value;
        }
        return Object.keys(obj).length > 0 ? obj : null;
    }

    function getByIds(params) {
        let objs = {};
        let _columns = columns.hasOwnProperty(params.type) ? columns[params.type] : [];
        if(params.hasOwnProperty('columns')) _columns = _columns.concat(params.columns);
        _columns.push('internalid');

        let searchObj = search.create({
            type: params.type,
            filters: [
                ['internalid', 'anyof', params.ids]
            ],
            columns: _columns
        });
        searchObj.run().each(function(result){
            let obj = {}
            for(let c in _columns) obj[_columns[c].name] = result.getValue(_columns[c]);
            obj.id = obj.internalid;
            objs[obj.id] = obj;
            return true;
        });
        return Object.keys(objs).length > 0 ? objs : null;
    }

    function toCSV(searchId){
        let searchObj = search.load({
            id: searchId
        });
        let values = [];
        let value = null;
        for(let c in searchObj.columns){
            value = searchObj.columns[c].label;
            values.push(value.indexOf(',') !== -1 ? '"' + value + '"' : value);
        }
        let csvFile = file.create({
            name: searchId+'.csv',
            fileType: 'CSV',
        });
        csvFile.appendLine({value: values.join(',')});

        let pagedData = searchObj.runPaged();
        pagedData.pageRanges.forEach(function(pageRange) {
            let page = pagedData.fetch({index: pageRange.index});
            page.data.forEach(function (result) {
                values = [];
                for(let c in searchObj.columns){
                    value = result.getValue(searchObj.columns[c]);
                    values.push(String(value).indexOf(',') !== -1 ? '"' + value + '"' : value);
                }
                csvFile.appendLine({
                    value: values.join(',')
                });
            });
        });
        return csvFile;
    }

    return {
        getById: getById,
        getByIds: getByIds,
        toCSV: toCSV,
    }

});
