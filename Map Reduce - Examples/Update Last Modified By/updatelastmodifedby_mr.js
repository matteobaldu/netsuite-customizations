/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search'],

    function (Record, Search) {

        function getInputData() {
            let stLogTitle = 'getInputData'
            try {

                let tranSearch = Search.load({
                    id: 'customsearch_demo_last_modified_by',
                    type: Search.Type.TRANSACTION
                })

                return tranSearch;

            } catch (error) {
                log.error(stLogTitle, error);
            }
        }

        function map(context) {
            let stLogTitle = 'map'
            try {

                let result = JSON.parse(context.value);

                let internalId = result.values["internalid"].value;
                let type = result.values["recordtype"];

                let recordData = {
                    internalId: internalId,
                    type: type,
                };

                context.write({
                    key: internalId,
                    value: recordData
                });

            } catch (error) {
                log.error(stLogTitle, error);
            }
        }

        function reduce(context) {
            let stLogTitle = 'reduce'

            try {

                let values = context.values.map(JSON.parse);

                let internalId = values[0].internalId;
                let type = values[0].type;

                let user = getLastUser(internalId);

                if (!isEmpty(user)) {

                    Record.submitFields({
                        type: type,
                        id: internalId,
                        values: { custbody_demo_last_modified_by: user },
                        options: { enableSourcing: false, ignoreMandatoryFields: true , disableTriggers: true}
                    })
                }

            } catch (error) {
                log.error(stLogTitle, error);
            }

        }

        const getLastUser = (recordId) => {
            let user = null;

            const filters = [
                [
                    ["recordid", "equalto", recordId], 
                    "AND", 
                    ["name","noneof","-4"]
                ]
            ];

            const searchObj = Search.create({
                type: 'systemnote',
                filters,
                columns: [
                    Search.createColumn({ name: "name", label: "Set by" }),
                    Search.createColumn({ name: "date", label: "Date", sort: Search.Sort.DESC }),
                ],
            });

            searchObj.run().each((result) => {
                user = result.getText('name')
                return false;
            });

            return user;
        }


        function isEmpty(stValue) {
            return (stValue === '' || stValue === null || stValue === undefined) || (stValue.constructor === Array && stValue.length === 0) ||
                (stValue.constructor === Object && (function (v) { for (let k in v) return false; return true; })(stValue));
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce
        };
    });
