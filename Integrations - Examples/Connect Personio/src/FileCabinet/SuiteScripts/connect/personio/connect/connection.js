/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/demo/config.json
 */
define(['N/error', 'N/search', './integration', './job', './lib/custrecord', './lib/list'], (error, search, Integration, Job, custrecord, list) => {

    const TYPE = 'customrecord_demo_per_connection';
    const COLUMNS = {
        internalid: 'id',
        name: 'name',
        custrecord_democ_per_host: 'host',
        custrecord_democ_per_key: 'key',
        custrecord_democ_per_secret: 'secret',
        custrecord_democ_per_config: 'config',
        custrecord_democ_per_system: 'system',
        custrecord_democ_per_timezone: 'timezone',
        custrecord_democ_per_timezone_offset: 'timezone_offset' 
    };
    const errorName = 'DEMO_CONNECTION_ERROR';
    let connection = null;  

    let check = () => {
        if(Object.keys(connection).length === 0) throw error.create({name: errorName, message: 'Connection not found'});
    }

    const get = (filter) => {
        connection = custrecord.get({
            type: TYPE,
            columns: COLUMNS,
            filter: filter
        });
        check()
        if(connection.config) connection.config = JSON.parse(connection.config);
        return connection;
    }

    const getBySystem = (type) => {
        return get(['custrecord_demo_per_system','anyof', list.getValueByName('customrecord_demo_per_system', type)])
    }

    const getById = (id) => {
        return get(['internalid','anyof', id])
    }

    return {getBySystem, getById}
});
