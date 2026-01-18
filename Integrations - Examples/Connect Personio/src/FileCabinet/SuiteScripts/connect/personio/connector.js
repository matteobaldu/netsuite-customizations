/**
 * @NApiVersion 2.1
 */
define(['N/https',
        './employeeImport',
        'N/error',
        './connect/integration_record'],

    (Https, EmployeeImport, Error, IntegrationRecord) => {

        const SERVICE = 'PERSONIO';
        const errorName = SERVICE + '_CONNECTOR_ERROR';

        let integration = null;

        const init = (_integration) => {
            integration = _integration;
        }

        const connect = (_integration) => {
            init(_integration)
            let connection = integration.connection;
            let response = Https.post({
                url: `${connection.host}/auth?client_id={custsecret_personio_client_id}&client_secret={custsecret_personio_client_secret}`,
                headers: {
                    'Accept': '*/*',
                    'Content-Type': 'application/json'
                },
            });
            if(response.code === 200) {
                let body = JSON.parse(response.body)
                if(body.success === true)
                    integration.connection.headers = {
                        'Authorization': 'Bearer ' + body.data.token,
                        'Accept': '*/*'
                    }
            } else
                throw Error.create({name: errorName, message: response.body})
        }

        const getInputData = (parameters) => {
            let inputData = null;
            if (integration.record_type_text === 'Employee') {
                if(integration.direction_text === 'In') {
                    EmployeeImport.init({}, integration, {});
                    inputData = EmployeeImport.getInputData(parameters);
                }
            }

            return inputData;
        }

        const processIntegrationRecord = (integrationRecord, mappings) => {
            let obj = JSON.parse(integrationRecord.getValue({fieldId: 'custrecord_demor_per_data'}));
            IntegrationRecord.init(integration);
            let id = null;
            if (integration.record_type_text === 'Employee') {
                if (integration.direction_text === 'In') {
                    EmployeeImport.init(obj, integration, mappings);
                    id = EmployeeImport.process();
                }
            } 
            return id;
        }

        const createIntegrationRecord = () => {
            throw Error.create({
                name: 'UNSUPPORTED_OPERATION',
                message: 'Project export is not implemented in this example.'
            });
        }

        const importItemMapping = () => {
            throw Error.create({
                name: 'UNSUPPORTED_OPERATION',
                message: 'Item mapping import is not implemented in this example.'
            });
        }

        return {
            init,
            connect,
            getInputData,
            createIntegrationRecord,
            processIntegrationRecord,
            importItemMapping,
            SERVICE
        }

    });
