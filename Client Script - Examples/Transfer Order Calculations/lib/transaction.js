/**
 * @NApiVersion 2.1
 */
define(['N/search'], ( Search) => {

    const setUnitsPerBox = (itemReceipt) => {

        const sublistId = 'item';
        const itemInfoObj = {};
        let itemIds = [];
        let numLines = itemReceipt.getLineCount({ sublistId });

        for (let i = 0; i < numLines; i++) {
            let itemId = itemReceipt.getSublistValue({ sublistId: sublistId, fieldId: 'item', line: i });
            if (itemId) { itemIds.push(itemId); }
        }

        if (itemIds.length === 0) {
            return;
        }

        Search.create({
            type: Search.Type.ITEM,
            filters: [
                ['internalid', 'anyof', itemIds]
            ],
            columns: [
                "internalid",
                "custitem_demo_units_per_box"
            ]
        }).run().each(function (result) {
            let itemId = result.getValue({ name: 'internalid' });
            let unitsPerBox = result.getValue({ name: 'custitem_demo_units_per_box' }) || 0;
            itemInfoObj[itemId] = unitsPerBox;
            return true;
        });

        for (let j = 0; j < numLines; j++) {
            let lineItemId = itemReceipt.getSublistValue({ sublistId: sublistId, fieldId: 'item', line: j });
            let quantity = itemReceipt.getSublistValue({ sublistId: sublistId, fieldId: 'quantity', line: j });
            let existingUnitsPerBox = itemReceipt.getSublistValue({ sublistId: sublistId, fieldId: 'custcol_demo_unitsperbox', line: j });
            console.log(`Processing line ${j}: itemId=${lineItemId}, quantity=${quantity}, existingUnitsPerBox=${existingUnitsPerBox}`);
            if (existingUnitsPerBox && existingUnitsPerBox > 0) {
                continue;
            }
            let unitsPerBox = itemInfoObj[lineItemId] || 0;
            itemReceipt.selectLine({ sublistId, line: j });
            itemReceipt.setCurrentSublistValue({ sublistId, fieldId: 'custcol_demo_unitsperbox', value: Number(unitsPerBox) })
            if (unitsPerBox > 0 && quantity > 0) {
                let boxes = Math.ceil(quantity / unitsPerBox);
                itemReceipt.setCurrentSublistValue({ sublistId, fieldId: 'custcol_demo_boxes', value: boxes });
                console.log(`Set units per box to ${unitsPerBox} and calculated boxes to ${boxes} for line ${j}`);
            }
        }
    }

    function calculateBoxes(currentRecord) {
        let quantity = currentRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' });
        let unitsPerBox = currentRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_demo_unitsperbox' });

        let boxes = 0;
        if (unitsPerBox && unitsPerBox > 0) {
            boxes = Math.ceil(quantity / unitsPerBox);
        }
        console.log('Calculated boxes:', boxes);
        currentRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_demo_boxes', value: boxes });
    }

    return {
        setUnitsPerBox,
        calculateBoxes
    }

});
