/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['./connect/import.js'], (mr) => {

        const onRequest = (scriptContext) => {
            let inputData = mr.getInputData()

            // let map = mr.map({"type":"mapreduce.MapContext","isRestarted":false,"executionNo":1,"key":"9","value":"{\"type\":\"Employee\",\"attributes\":{\"id\":{\"label\":\"ID\",\"value\":27516640,\"type\":\"integer\",\"universal_id\":\"id\"},\"first_name\":{\"label\":\"First name\",\"value\":\"María Victoria \",\"type\":\"standard\",\"universal_id\":\"first_name\"},\"last_name\":{\"label\":\"Last name\",\"value\":\"Pérez Vara\",\"type\":\"standard\",\"universal_id\":\"last_name\"},\"email\":{\"label\":\"Email\",\"value\":\"perezvaravictoria@gmail.com\",\"type\":\"standard\",\"universal_id\":\"email\"},\"status\":{\"label\":\"Status\",\"value\":\"onboarding\",\"type\":\"standard\",\"universal_id\":\"status\"},\"supervisor\":{\"label\":\"Supervisor\",\"value\":{\"type\":\"Employee\",\"attributes\":{\"id\":{\"label\":\"ID\",\"value\":19779859,\"type\":\"integer\",\"universal_id\":\"id\"},\"first_name\":{\"label\":\"First name\",\"value\":\"Eugenio Blas\",\"type\":\"standard\",\"universal_id\":\"first_name\"},\"last_name\":{\"label\":\"Last name\",\"value\":\"Mohedano Martínez\",\"type\":\"standard\",\"universal_id\":\"last_name\"},\"email\":{\"label\":\"Email\",\"value\":\"eugenio@gmail.com\",\"type\":\"standard\",\"universal_id\":\"email\"}}},\"type\":\"standard\",\"universal_id\":\"supervisor\"},\"employment_type\":{\"label\":\"Employment type\",\"value\":\"internal\",\"type\":\"standard\",\"universal_id\":\"employment_type\"},\"hire_date\":{\"label\":\"Hire date\",\"value\":\"2025-01-07T00:00:00+01:00\",\"type\":\"date\",\"universal_id\":\"hire_date\"},\"termination_date\":{\"label\":\"Termination date\",\"value\":null,\"type\":\"date\",\"universal_id\":\"termination_date\"},\"team\":{\"label\":\"Team\",\"value\":{\"type\":\"Team\",\"attributes\":{\"id\":2503675,\"name\":\"Sales - Europe\"}},\"type\":\"standard\",\"universal_id\":\"team\"},\"dynamic_9582536\":{\"label\":\"Employee ID\",\"value\":\"516640\",\"type\":\"standard\",\"universal_id\":null},\"dynamic_9827099\":{\"label\":\"Vertical\",\"value\":\"Managed\",\"type\":\"list\",\"universal_id\":null}}}"})
            // mr.summarize()
        }

        return {onRequest}
    })