/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/demo/config.json
 */
define(['./lib/custrecord'], (Custrecord) => {

    const COLUMNS = {
        internalid: 'id',
        name: 'name',
        custrecord_demos_per_abbreviation: 'abbreviation'
    };
    const TYPE = 'customrecord_demo_per_system';

    const getById = (id) => {
        let system = Custrecord.get({
            type: TYPE,
            columns: COLUMNS,
            filter: ['internalid','anyof', id]
        });
        return system;
    }
    return {getById}

    });
