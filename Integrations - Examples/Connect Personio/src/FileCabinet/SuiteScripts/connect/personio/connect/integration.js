/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/demo/config.json
 */

define(['N/error', 'N/format', 'N/record', 'N/runtime', './lib/custrecord', './connection', './integration_record', './job', './status', './system', '../connector'],
    (Error, Format, Record, Runtime, Custrecord, Connection, IntegrationRecord, Job, Status, System, Connector) => {

        const TYPE = 'customrecord_demo_per_integration';
        const TYPES = {
            SAVED_SEARCH: 1,
            TRANSACTION: 2,
            ITEM: -10,
            CUSTOMER: -2
        }
        const COLUMNS = {
            internalid: 'id',
            name: 'name',
            custrecord_demo_per_direction: 'direction',
            custrecord_demo_per_record_type: 'record_type',
            custrecord_demo_per_transaction_type: 'transaction_type',
            custrecord_demo_per_action_type: 'action_type',
            custrecord_demo_per_trigger_type: 'trigger_type',
            custrecord_demo_per_saved_search: 'saved_search',
            custrecord_demo_per_scheduled_script: 'scheduled_script',
            custrecord_demo_per_system: 'system',
            custrecord_demo_per_connection: 'connection',
            custrecord_demo_per_last_job: 'last_job',
            custrecord_demo_per_last_execution: 'last_execution',
            custrecord_demo_per_last_id: 'last_id',
            custrecord_demo_per_config: 'config',
            custrecord_demo_per_external_id_field: 'external_id_field',
            custrecord_demo_per_abbreviation: 'abbreviation',
            custrecord_demo_per_file_format: 'file_format',
        };
        const errorName = 'DEMO_INTEGRATION_ERROR';
        let integration = null;

        const getById = (id) => {
            return Custrecord.get({
                type: TYPE,
                columns: COLUMNS,
                filter: ['internalid', 'anyof', id]
            });
        }

        const init = (_integration) => {
            integration = _integration;
            if (!!integration.transaction_type) integration.transaction_type = getTransactionTypeFromId(integration.transaction_type);
            if (!!integration.config) integration.config = JSON.parse(integration.config);
            integration.connection = Connection.getById(integration.connection);

            integration.system = System.getById(integration.system);
            integration.last_job = integration.last_job ? Job.getById(integration.last_job) : null
            integration.TYPES = TYPES;
            Connector.connect(integration);
            integration.setLastExecution = (params) => {
                let values = {}
                if(params.last_execution)
                    values['custrecord_demo_per_last_execution'] = params.last_execution;
                if(params.last_job)
                    values['custrecord_demo_per_last_job'] = params.last_job;
                Record.submitFields({
                    type: TYPE,
                    id: integration.id,
                    values
                })
            };
            integration.setLastId = (id) => {
                Record.submitFields({
                    type: TYPE,
                    id: integration.id,
                    values: {
                        custrecord_demo_per_last_id: String(id)
                    }
                })
            };
            integration.getMapByIds = (ids) => {
                let map = {};
                let integrations = Custrecord.getMultiple({
                    type: TYPE,
                    columns: COLUMNS,
                    filter: ['internalid', 'anyof', ids]
                });
                for(let i of integrations) {
                    if (i.transaction_type) i.transaction_type = getTransactionTypeFromId(i.transaction_type);
                    map[i.id] = i
                }
                return map;
            }

            return integration;
        }

        const set = (_integration) => {
            integration = _integration;
            Connector.connect(integration);
        }

        const getInputData = (parameters) => {
            if(!parameters.minDate || !parameters.maxDate)
                throw Error.create({name: errorName, message: 'Date range not set'});
            return Connector.getInputData(parameters);
        }

        const createIntegrationRecord = (record, _integration, options) => {
            if(_integration) Connector.init(_integration);
            return Connector.createIntegrationRecord(record, options)
        }

        const processIntegrationRecord = (integrationRecord, mappings) => {
            const retryError = (message) => {
                return Connector.RETRY_ERRORS && Connector.RETRY_ERRORS.includes(message);
            }
            let result = {
                id: null,
                status: Status.SUCCESS,
                message: ''
            }
            try {
                result.id = Connector.processIntegrationRecord(integrationRecord, mappings);
            } catch(e) {
                let error = e
                result.message = error.message;
                if (error.name == 'INACTIVE_EMPLOYEE'){
                    result.status = Status.SUCCESS;
                }else{
                    result.status = retryError(e.message) ? Status.PENDING : Status.FAILED;
                }
            }
            IntegrationRecord.init(integration);
            IntegrationRecord.storeResult(integrationRecord, result);
            return result;
        }

        const importItemMapping = (item, integration) => {
            let result = {
                data: null,
                status: Status.SUCCESS,
                message: ''
            }
            try {
                result.data = Connector.importItemMapping(item, integration);
            } catch(e) {
                result.message = e.message;
                result.status = Status.FAILED;
            }
            return result;
        }

        const getTransactionTypeFromId = (id) => {
            const transactionTypeMap = {
                1: Record.Type.JOURNAL_ENTRY,
                3: Record.Type.CHECK,
                4: Record.Type.DEPOSIT,
                5: Record.Type.CASH_SALE,
                6: Record.Type.ESTIMATE,
                7: Record.Type.INVOICE,
                9: Record.Type.CUSTOMER_PAYMENT,
                10: Record.Type.CREDIT_MEMO,
                11: Record.Type.INVENTORY_ADJUSTMENT,
                12: Record.Type.INVENTORY_TRANSFER,
                15: Record.Type.PURCHASE_ORDER,
                16: Record.Type.ITEM_RECEIPT,
                17: Record.Type.VENDOR_BILL,
                18: Record.Type.VENDOR_PAYMENT,
                28: Record.Type.EXPENSE_REPORT,
                29: Record.Type.CASH_REFUND,
                30: Record.Type.CUSTOMER_REFUND,
                31: Record.Type.SALES_ORDER,
                32: Record.Type.ITEM_FULFILLMENT,
                33: Record.Type.RETURN_AUTHORIZATION,
                37: Record.Type.OPPORTUNITY,
                40: Record.Type.CUSTOMER_DEPOSIT,
                41: Record.Type.DEPOSIT_APPLICATION,
                43: Record.Type.VENDOR_RETURN_AUTHORIZATION,
                44: Record.Type.WORK_ORDER,
                45: Record.Type.BIN_TRANSFER,
                46: Record.Type.REVENUE_COMMITMENT,
                47: Record.Type.REVENUE_COMMITMENT_REVERSAL,
                48: Record.Type.TRANSFER_ORDER,
                51: Record.Type.INVENTORY_COST_REVALUATION,
            }
            return transactionTypeMap[id]
        }

        return {getById, init, set, getInputData, createIntegrationRecord, processIntegrationRecord, importItemMapping, TYPES}

    });
