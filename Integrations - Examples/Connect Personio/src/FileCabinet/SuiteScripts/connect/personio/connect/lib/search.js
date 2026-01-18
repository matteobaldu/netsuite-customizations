/**
 * @NApiVersion 2.1
 */
define(['N/file', 'N/record', 'N/search'], function (file, record, search) {


    const columns = {
        subsidiary : {internalid: 'id', country: 'country'},
        default: {internalid: 'id', type: 'type', externalid: 'externalid'}
    }

    const TYPES = {
        SalesOrd: 'salesorder'
    }

    const buildColumns = (params) => {
        let _columns = columns.hasOwnProperty(params.type) ? columns[params.type] : {};
        params.hasOwnProperty('columns') ?
            _columns = Object.assign({}, _columns, params.columns) :
            _columns = {internalid: 'id'};
        return _columns
    }

    const buildObject = (_columns, result) => {
        let obj = {}
        for(let c in _columns) obj[_columns[c]] = result.getValue(c);
        return obj;
    }

    function getById(params) {
        let obj = {};
        let _columns = buildColumns(params)
        let fields = search.lookupFields({type: params.type || 'transaction', id: params.id, columns: Object.keys(_columns)});
        for(let c in _columns)
            obj[_columns[c]] = Array.isArray(fields[c]) ? (fields[c].length > 0 ? fields[c][0].value : null) : fields[c];
        return Object.keys(obj).length > 0 ? obj : null;
    }

    function getListByIds(params) {
        let objs = {};
        let _columns = buildColumns(params)

        let searchObj = search.create({
            type: params.type,
            filters: [
                ['internalid', 'anyof', params.ids]
            ],
            columns: Object.keys(_columns)
        });
        searchObj.run().each(function(result){
            let obj = buildObject(_columns, result)
            obj[params.map || 'id'] = obj[params.map || 'id'];
            objs[obj.id] = obj;
            return true;
        });
        return Object.keys(objs).length > 0 ? objs : null;
    }

    function getByExternalId(params) {
        let obj = {};
        let _columns = buildColumns(params);
        let searchObj = search.create({
            type: params.type,
            filters: [
                ['externalid', 'anyof', params.externalId]
            ],
            columns: Object.keys(_columns)
        });
        searchObj.run().each(function(result){
            obj = buildObject(_columns, result)
            return false;
        });
        return Object.keys(obj).length > 0 ? obj : null;
    }

    function getByCreatedFrom(params) {
        let obj = {};
        let _columns = buildColumns(params);
        let searchObj = search.create({
            type: params.type,
            filters: [
                ['createdfrom', 'anyof', params.id]
            ],
            columns: Object.keys(_columns)
        });
        searchObj.run().each(function(result){
            obj = buildObject(_columns, result)
            return false;
        });
        return Object.keys(obj).length > 0 ? obj : null;
    }

    function getListByExternalIds(params) {
        let objs = {};
        let _columns = buildColumns(params)

        let searchObj = search.create({
            type: params.type,
            filters: [
                ['externalid', 'anyof', params.externalIds]
            ],
            columns: Object.keys(_columns)
        });
        searchObj.run().each(function(result){
            let obj = buildObject(_columns, result)
            objs[obj.externalid] = obj;
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
                    value = result.getText(searchObj.columns[c]) || result.getValue(searchObj.columns[c]);
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
        TYPES,
        getById,
        getListByIds,
        getByExternalId,
        getByCreatedFrom,
        getListByExternalIds,
        toCSV,
    }

});
