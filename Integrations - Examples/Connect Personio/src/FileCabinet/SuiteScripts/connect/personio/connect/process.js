/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/error', 'N/record', 'N/runtime', 'N/task', './cache', './integration', './integration_record', './job', './orchestrator', './status'],

    (Error, Record, Runtime, Task, Cache, Integration, IntegrationRecord, Job, Orchestrator, Status) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            try {

                let orchestratorId = Runtime.getCurrentScript().getParameter({name: 'custscript_demo_per_process_orchestrator'});
                let integrationId = Runtime.getCurrentScript().getParameter({name: 'custscript_demo_per_process_integration'});
                if (!integrationId && !orchestratorId) throw Error.create({
                    name: 'IMPORT_ERROR',
                    message: 'Orchestrator parameter not set'
                });

                integrationId = integrationId || Orchestrator.getNextIntegration(orchestratorId, null);

                let integration = Integration.init(Integration.getById(integrationId));

                log.debug('Process Integration', integration.name)

                Job.init(integration);
                Cache.setJob(Job.start(Job.TYPES.PROCESS));

                Cache.setIntegration(integration);
                Cache.getMappings(integration);

                return IntegrationRecord.getPending(integration);
            } catch (e) {
                log.error('getInputData', e.message)
            }
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {
            try {
                //log.debug('mapContext', mapContext);
                let contextIntegration = Cache.getIntegration();
                Integration.set(contextIntegration);
                let integrationRecord = Record.load({type: 'customrecord_demo_per_integration_record', id: mapContext.value})
                integrationRecord.setValue({fieldId: 'custrecord_demo_per_process_job', value: Cache.getJob()})
                let result = Integration.processIntegrationRecord(integrationRecord, Cache.getMappings(contextIntegration));
                mapContext.write(integrationRecord.id, result.status)
            } catch (e) {
                log.error('mapContext', e.message)
            }
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {
            try {
                reduceContext.write(reduceContext.key, reduceContext.key)
            } catch (e) {
                log.error('reduceContext', e.message)
            }
        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {
            //log.debug('summarize', summaryContext)
            try {
                let script = Runtime.getCurrentScript()
                let orchestratorId = script.getParameter({name: 'custscript_demo_per_process_orchestrator'});
                let integration = Cache.getIntegration();
                let integrationId = integration.id;

                let summary = {success: 0, failed: 0};
                summaryContext.output.iterator().each(function (key, value) {
                    if (Number(value) === Status.SUCCESS)
                        summary.success = summary.success + 1;
                    else if (Number(value) === Status.FAILED)
                        summary.failed = summary.failed + 1;
                    return true;
                });

                Job.init(integration);
                Job.end(Cache.getJob(), summary.success, summary.failed);

                Cache.removeIntegration();
                Cache.removeJob();

                if (orchestratorId) {
                    let nextIntegration = Orchestrator.getNextIntegration(orchestratorId, integrationId)
                    if (nextIntegration) {
                        let task = Task.create({
                            taskType: Task.TaskType.MAP_REDUCE,
                            scriptId: 'customscript_demo_per_import_mr',
                            deploymentId: 'customdeploy_demo_per_import_mr'
                        });
                        task.params = {
                            custscript_demo_per_import_integration: nextIntegration,
                            custscript_demo_per_import_orchestrator: orchestratorId
                        }
                        task.submit();
                    }
                }
            } catch (e) {
                log.error('summarize', e)
            }
        }

        return {getInputData, map, summarize}

    });
