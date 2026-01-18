/**
* @NApiVersion 2.1
* @NAmdConfig /SuiteScripts/demo/config.json
*/
define(['N/record', 'N/search', 'N/config', 'N/url', 'N/render', 'N/email', 'ST/util', 'N/runtime'], (Record, Search, Config, Url, Render, Email, Util, Runtime) => {


    const autoPay = (transaction) => {
        let account = transaction.getValue({ fieldId: 'custbody_demo_autopay_account' });
        if (!account) throw 'AUTOPAY_ERROR: Please select an account';
        let date = transaction.getValue({ fieldId: 'custbody_demo_autopay_date' }) || transaction.getValue({ fieldId: 'trandate' });
        let payment = Record.transform({
            fromType: Record.Type.VENDOR_BILL,
            fromId: transaction.id,
            toType: Record.Type.VENDOR_PAYMENT
        });
        if (account) payment.setValue({ fieldId: 'account', value: account });
        if (date) payment.setValue({ fieldId: 'trandate', value: date });

        let sublistId = 'apply';
        let line = payment.findSublistLineWithValue({ sublistId, fieldId: 'internalid', value: String(transaction.id) });
        if (line !== -1) {
            payment.setSublistValue({ sublistId, fieldId: 'apply', value: true, line })
            payment.save();
        }
    }


    const setValuesFromFirstLine = (transaction, sublistId, fieldIds) => {
        if (transaction.getLineCount({ sublistId }) > 0) {
            result = {}
            for (let fieldId of fieldIds) {
                let value = transaction.getSublistValue({ sublistId, fieldId, line: 0 })
                let oldValue = transaction.getValue({ fieldId })
                if (oldValue != value) {
                    transaction.setValue({ fieldId, value })
                }
            }
        }
    }

    const setNetAmount = (transaction) => {

        try {

            let total = Util.getTaxData(transaction)

            if (!isEmpty(total)) {
                transaction.setValue({ fieldId: 'custbody_demo_netamount', value: total })
            }

        } catch (error) {
            log.error('setNetAmount', error.message);
        }

    }


    function isEmpty(stValue) {
        return (stValue === '' || stValue === null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) ||
            (stValue.constructor === Object && (function (v) {
                for (let k in v) return false;
                return true;
            })(stValue));
    }

    return { autoPay, setValuesFromFirstLine, setNetAmount }

})

