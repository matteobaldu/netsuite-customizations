/**
* @NApiVersion 2.1
*/
define([], () => {


    const validateExpirationDate = (inventoryDetail) => {
        
        let sublistId = "inventoryassignment";
        let expirationDate = inventoryDetail.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'expirationdate' });
        let issueInventoryNumber = inventoryDetail.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'issueinventorynumber' });
        let receiptInventoryNumber = inventoryDetail.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'receiptinventorynumber' });

        //Also check if lot item -> otherwise there is no need on making this alert
        if (isEmpty(expirationDate) && (!isEmpty(receiptInventoryNumber) || !isEmpty(issueInventoryNumber))) {
            alert('Expiration Date field is mandatory');

            return false;
        }
        return true;
    };
    
    function isEmpty(stValue) {
        return (stValue === '' || stValue === null || stValue === undefined) || (stValue.constructor === Array && stValue.length === 0) ||
            (stValue.constructor === Object && (function (v) {
                for (let k in v) return false;
                return true;
            })(stValue));
    }

    return {validateExpirationDate}
    
});
