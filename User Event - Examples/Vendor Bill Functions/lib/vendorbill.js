/**
* @NApiVersion 2.1
*/
define(['N/format', 'N/record', 'N/search'], (Format, Record, Search) => {

    const EUR = 1;
        
    const setRemainingPoAmount = (vendorbill) => {

        // Get all lines that were billed
        let lineCount = vendorbill.getLineCount({sublistId: 'item'})
        let linesBilled = {}
        let orderLine , amountBill = 0 , amountLine = 0, billWithPO = false
        for (let index = 0; index < lineCount; index++) {
            
            poId = vendorbill.getSublistValue({sublistId: 'item', fieldId: 'orderdoc', line: index})
            if (poId){                
                billWithPO = true           
                quantity = vendorbill.getSublistValue({sublistId: 'item',fieldId: 'quantity',line: index})
                if (quantity > 0){
                    orderLine = vendorbill.getSublistValue({sublistId: 'item',fieldId: 'orderline',line: index}) 
                    amountLine = vendorbill.getSublistValue({sublistId: 'item',fieldId: 'amount',line: index})  
                    // Added to calculation
                    amountBill += amountLine
                    // Add the orderLine as for getting the amount on the asociated PO later 
                    if (linesBilled[poId]){
                        linesBilled[poId].push(orderLine);
                    }else{
                        linesBilled[poId] = [orderLine];
                    }                            
                }             
            }else{
                // If it's a line without po it still needs to be added in 'Remaining PO Amount' field
                amountLine = vendorbill.getSublistValue({sublistId: 'item',fieldId: 'amount',line: index})  
                amountBill += amountLine
            }            
        }

        // Get amount on PO
        let amountPO = null

        if (!isEmpty(linesBilled)){
            for (let poId in linesBilled) {
                if (linesBilled.hasOwnProperty(poId)) {
                    let orderLines = linesBilled[poId];
    
                    filters = [
                        ['type', 'anyof', 'PurchOrd'],
                        'AND',
                        ['mainline', 'is', 'F'],
                        'AND',
                        ['taxline', 'is', 'F'],
                        'AND',
                        ['shipping', 'is', 'F'],
                        'AND',
                        ['internalid', 'anyof' , poId],
                        'AND',
                    ]
    
                    let lineFilter = []
                    for(let line of orderLines) {
                        lineFilter.push(['line', 'equalto', line], 'OR');
                    }
                    lineFilter.pop();
                    filters.push(lineFilter)
    
                    let columns = [Search.createColumn({ name: 'fxamount', summary: Search.Summary.SUM })]
                    let searchObj = Search.create({
                        type: 'purchaseorder',
                        filters: filters,
                        columns: columns
                    });          
    
                    searchObj.run().each(function (result) {
                        amountPO += parseFloat(result.getValue({name: 'fxamount', summary: Search.Summary.SUM}));
                    });
                }
            }
        
            if (amountPO) {
                let amount = amountPO - amountBill;
                let fxamount = amount;
                let currency = Number(vendorbill.getValue({fieldId: 'currency'}));
                if(currency !== EUR) {
                    let exchangeRate = getEURExchangeRate(vendorbill.getValue({fieldId: 'trandate'}), currency)
                    amount = amount * exchangeRate
                }

                let categoryId = getCategoryId(amount)
                Record.submitFields({
                    type: vendorbill.type, 
                    id: vendorbill.id, 
                    values: {
                        custbody_demo_billwithoutpo: true, // billwithpo*
                        custbody_demo_remainingpoamount: amount, 
                        custbody_demo_remainingpofxamount: fxamount, 
                        custbody_demo_remainingpoamountcat: categoryId
                    }
                })  
            }else{
                if (billWithPO){
                    Record.submitFields({
                        type: vendorbill.type,
                        id: vendorbill.id,
                        values: {
                            custbody_demo_billwithoutpo: true, // billwithpo*
                        }
                    })
                }
            }         
        }else{
            if (billWithPO){
                Record.submitFields({
                    type: vendorbill.type,
                    id: vendorbill.id,
                    values: {
                        custbody_demo_billwithoutpo: true, // billwithpo*
                    }
                })
            }
        }        
    }

    const getEURExchangeRate = (date, transactionCurrency) => {
        let exchangeRate = null;
        
        const filters = [
            ['effectivedate', 'on', Format.format({value: date, type: Format.Type.DATE})],
            'AND',
            ['basecurrency', 'anyof', '1'],
            'AND',
            ['transactioncurrency', 'anyof', transactionCurrency],
        ];
        
        const searchObj = Search.create({
            type: 'currencyrate',
            filters,
            columns: [
                'exchangerate',
            ],
        });
        
        searchObj.run().each((result) => {
            exchangeRate = result.getValue('exchangerate')
            return false;
        });
        
        return Number(exchangeRate);
    }

    const getCategoryId = (amount) => {
        let columns = [Search.createColumn({ name: 'internalid'})]
        let searchObj = Search.create({
            type: 'customrecord_demo_remainingpodiffcat',
            filters: [
                [
                    ['custrecord_demo_remainingpodiffcat_lowlim', 'lessthanorequalto', amount],
                    'OR',
                    ['custrecord_demo_remainingpodiffcat_lowlim', 'isempty', ''],
                ],
                'AND',
                [
                    ['custrecord_demo_remainingpodiffcat_upplim', 'greaterthan', amount],
                    'OR',
                    ['custrecord_demo_remainingpodiffcat_upplim', 'isempty', ''],
                ],
                'AND',
                ['isinactive', 'is', 'F'],
                
            ],
            columns: columns
        });                   

        let categoryId = null
        searchObj.run().each(function (result) {
            categoryId = result.getValue({name: "internalid"});
        });

        return categoryId                
    }

    function isEmpty(stValue) {
        return (stValue === '' || stValue == null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) ||
            (stValue.constructor === Object && (function (v) { for (let k in v) return false; return true; })(stValue));
    }

    return {setRemainingPoAmount}
    
})

