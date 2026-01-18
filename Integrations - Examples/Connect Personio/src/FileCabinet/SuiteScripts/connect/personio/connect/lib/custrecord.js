/**
 * @NApiVersion 2.1
 */
define(['N/search'],

    (search) => {

        const get = (params) => {
            let obj = {};
            let searchObj = search.create({
                type: params.type,
                filters: !!params.filter ? [params.filter] : params.filters,
                columns: Object.keys(params.columns)
            });
            searchObj.run().each(function (result) {
                for (let c in params.columns) {
                    obj[params.columns[c]] = result.getValue(c);
                    obj[params.columns[c] + '_text'] = result.getText(c) || result.getValue(c);
                }
                return false;
            });
            return obj;
        }

        const getMultiple = (params) => {
            let objs = params.map ? {} : [];
            let searchObj = search.create({
                type: params.type,
                filters: !!params.filter ? [params.filter] : params.filters,
                columns: Object.keys(params.columns)
            });
            searchObj.run().each(function (result) {
                let obj = {};
                for (let c in params.columns) {
                    obj[params.columns[c]] = result.getValue(c);
                    obj[params.columns[c] + '_text'] = result.getText(c) || result.getValue(c);
                }
                params.map ? objs[obj[params.map]] = obj : objs.push(obj);
                return true;
            });
            return objs;
        }

        return {get, getMultiple}

    });
