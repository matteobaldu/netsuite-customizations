/**
 * @NApiVersion 2.1
 */
define(['N/search'], (search) => {

    const getValueByName = (list, name) => {
        let id = null;
        let searchObj = search.create({
            type: list,
            filters: [
                ['name', 'is', name]
            ],
            columns: 'internalid'
        });
        searchObj.run().each(function (result) {
            id = result.getValue('internalid')
            return true;
        });
        return id;
    }

    const getObject = (list, map, options) => {
        map = map || 'name';
        let obj = {};
        let searchObj = search.create({
            type: list,
            filters: [],
            columns: [map, 'internalid']
        });
        searchObj.run().each(function (result) {
            let key = result.getValue(map);
            if(options && options.lowerCase)
                key = key.toLowerCase();
            obj[key] = result.getValue('internalid')
            return true;
        });
        return obj;
    }

    return {getValueByName, getObject}

});
