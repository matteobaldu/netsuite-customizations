/**
 * @NApiVersion 2.1
 */
define(['N/error', 'N/search'], (Error, Search) => {

    const errorName = 'PERSONIO_CONNECTOR_ERROR';

    const getByIds = (ids) => {
        let resources = {};
        let filters = [];
        for (let id of ids) {
            filters.push(['custentity_demo_per_external_id', 'is', id]);
            filters.push('OR')
        }
        filters.pop();
        let searchObj = Search.create({
            type: 'employee',
            filters,
            columns: ['custentity_demo_per_external_id']
        });
        searchObj.run().each(function (result) {
            resources[result.getValue('custentity_demo_per_external_id')] = result.id;
            return true;
        });
        for (let id of ids)
            if (!resources.hasOwnProperty(id))
                throw Error.create({name: errorName, message: 'Resource not found: ' + id})
        return resources;
    }

    const getByInternalIds = (ids) => {
        let resources = {};
        let searchObj = Search.create({
            type: 'employee',
            filters: [['internalid', 'anyof', ids]],
            columns: ['custentity_demo_per_external_id']
        });
        searchObj.run().each(function (result) {
            resources[result.id] = result.getValue('custentity_demo_per_external_id');
            return true;
        });
        return resources;
    }

    const getById = (id) => {
        let resource = null;
        let searchObj = Search.create({
            type: 'employee',
            filters: ['custentity_demo_per_external_id', 'is', id],
            columns: ['custentity_demo_per_external_id']
        });
        searchObj.run().each(function (result) {
            resource = result.id;
            return true;
        });
        return resource;
    }

    return {getByIds, getByInternalIds, getById}

});
