/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/demo/config.json
 */
define(['N/error', './lib/custrecord', './lib/list', './lib/search'],
    (Error, Custrecord, List, Search) => {

        const TYPE = 'customrecord_demo_per_mapping';
        const mappingTypes = {
            CLASS: -101,
            DEPARTMENT: -102, 
            LOCATION: -103,
            SUBSIDIARY: -117
        }
        const COLUMNS = {
            internalid: 'id',
            custrecord_mcei_per_type: 'type',
            custrecord_mcei_per_system: 'system',
            custrecord_mcei_per_id: 'remote_id',
            custrecord_mcei_per_class: 'class',
            custrecord_mcei_per_department: 'department',
            custrecord_mcei_per_location: 'location',
            custrecord_mcei_per_subsidiary: 'subsidiary'
        };

        const errorName = 'DEMO_MAPPING_ERROR';

        let system = null;

        const init = (_system) => {
            system = _system;
        }

        const getByRemoteId = (type, remoteId) => {
            return get(
                [['custrecord_mcei_system', 'anyof', system.id],
                    'AND',
                    ['custrecord_mcei_type', 'anyof', type],
                    'AND',
                    ['custrecord_mcei_id', 'is', remoteId]]
            );
        }

        const getMultipleByField = (type, objects, field) => {
            let remoteIdsFilter = [];
            for (let o in objects) {
                remoteIdsFilter.push(['custrecord_mcei_id', 'is', String(objects[o][field])])
                remoteIdsFilter.push('OR')
            }
            remoteIdsFilter.pop();
            let filters = [
                ['custrecord_mcei_system', 'anyof', system.id],
                'AND',
                ['custrecord_mcei_type', 'anyof', type],
                'AND',
                remoteIdsFilter
            ];
            return Custrecord.getMultiple({
                type: TYPE,
                columns: COLUMNS,
                filters: filters,
                map: 'remote_id'
            });
        }

        const getMappings = () => {

            let classes = getClasses()
            let departments = getDepartments()
            let locations = getLocations()
            let subsidiaries = getSubsidiaries()

            return {classes, departments , locations, subsidiaries}
        }

        const getClasses = () => {
            let classes = {};
            let result = Custrecord.getMultiple({
                map: 'remote_id',
                type: TYPE,
                columns: COLUMNS,
                filters: [
                    ['custrecord_mcei_per_system', 'anyof', system.id], 'AND',
                    ['custrecord_mcei_per_type', 'anyof', mappingTypes.CLASS]
                ]
            })
            for (let r in result) classes[r] = result[r].class;
            return classes;
        }

        const getDepartments = () => {
            let departments = {};
            let result = Custrecord.getMultiple({
                map: 'remote_id',
                type: TYPE,
                columns: COLUMNS,
                filters: [
                    ['custrecord_mcei_per_system', 'anyof', system.id], 'AND',
                    ['custrecord_mcei_per_type', 'anyof', mappingTypes.DEPARTMENT]
                ]
            })
            for (let r in result) departments[r] = result[r].department;
            return departments;
        }

        const getLocations = () => {
            let locations = {};
            let result = Custrecord.getMultiple({
                map: 'remote_id',
                type: TYPE,
                columns: COLUMNS,
                filters: [
                    ['custrecord_mcei_per_system', 'anyof', system.id], 'AND',
                    ['custrecord_mcei_per_type', 'anyof', mappingTypes.LOCATION]
                ]
            })
            for (let r in result) locations[r] = result[r].location;
            return locations;
        }

        const getSubsidiaries = () => {
            let subsidiaries = {};
            let result = Custrecord.getMultiple({
                map: 'remote_id',
                type: TYPE,
                columns: COLUMNS,
                filters: [
                    ['custrecord_mcei_per_system', 'anyof', system.id], 'AND',
                    ['custrecord_mcei_per_type', 'anyof', mappingTypes.SUBSIDIARY]
                ]
            })
            for (let r in result) subsidiaries[r] = result[r].subsidiary;
            return subsidiaries;
        }

        const get = (_filters, _columns) => {
            let check = () => {
            }
            let mapping = Custrecord.get({
                type: TYPE,
                columns: _columns || COLUMNS,
                filters: _filters
            });
            check()
            return mapping;
        }

        return {init, getByRemoteId, getMultipleByField, getMappings}

    });
