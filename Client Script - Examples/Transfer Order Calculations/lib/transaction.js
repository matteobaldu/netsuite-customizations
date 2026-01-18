/**
 * @NApiVersion 2.1
 */
define(['N/format', 'N/search', 'N/record'], (Format, Search, Record) => {

    const setClassNull = (transaction) => {

        transaction.setValue({
            fieldId: 'class',
            value: null
        });

    }


    const setClass = (transaction) => {

        const getVendorPrepaymentClass = (id) => {

            let classId = null
            let currentClass = null
            let sameClass = true

            let columns = [
                "class"
            ];
            let searchObj = Search.create({
                type: "vendorprepaymentapplication",
                filters: [
                    ['type', 'anyof', 'VPrepApp'],
                    'AND',
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['createdfrom', 'anyof', id],
                ],
                columns
            });
            searchObj.run().each(function (result) {
                currentClass = result.getValue(columns[0])

                if (classId === null) {
                    classId = currentClass;
                } else if (classId !== currentClass) {
                    sameClass = false;
                    return false
                }
                return true;
            });

            let results = { sameClass: sameClass, classId: classId }

            return results;
        }

        const getNoClassId = () => {
            let noClassId = null

            let filter = Search.createFilter({
                name: 'name',
                operator: Search.Operator.CONTAINS,
                values: 'NO CLASS'
            });

            let column = Search.createColumn({ name: 'internalid', sort: Search.Sort.ASC });

            let classificationSearch = Search.create({
                type: 'classification',
                filters: filter,
                columns: column,
            });

            classificationSearch.run().each(function (result) {
                noClassId = result.getValue('internalid');
                return true;
            });

            return noClassId;
        }


        let originalClass = transaction.getValue('class')
        let noClassId = getNoClassId()
        if (!originalClass || originalClass == noClassId) {

            const sublistIdType = {
                journalentry: ['line'],
                vendorbill: ['expense', 'item'],
                vendorcredit: ['expense', 'item'],
                transferorder: ['item'],
                purchaseorder: ['expense', 'item'],
                vendorprepayment: ['bill'],
                vendorprepaymentapplication: ['bill'],
                vendorpayment: ['apply']
            }

            const recordIdType = {
                Bill: 'vendorbill',
                VendBill: 'vendorbill'
            }

            const fieldId = {
                vendorprepayment: ['applied', 'targetid', 'type'],
                vendorprepaymentapplication: ['apply', 'internalid', 'trantype'],
                vendorpayment: ['apply', 'internalid', 'trantype']
            }

            let sublistIds = sublistIdType[transaction.type];

            let classId = null;
            let sameClass = true;

            if (transaction.type == 'vendorprepayment') {

                let results = getVendorPrepaymentClass(transaction.id)
                sameClass = results.sameClass
                classId = results.classId

                if (sameClass) {
                    transaction.setValue({
                        fieldId: 'class',
                        value: classId
                    });
                } else {
                    transaction.setValue({
                        fieldId: 'class',
                        value: noClassId
                    });
                }

                transaction.save()

            } else {

                for (let sublistId of sublistIds) {
                    let lineCount = transaction.getLineCount({ sublistId });

                    if (sameClass) {

                        for (let index = 0; index < lineCount; index++) {
                            if (transaction.type == 'vendorprepaymentapplication' || transaction.type == 'vendorpayment') {

                                let applied = transaction.getSublistValue({
                                    sublistId: sublistId,
                                    fieldId: fieldId[transaction.type][0],
                                    line: index
                                });

                                if (applied == true || applied > 0) {
                                    let appliedRecId = transaction.getSublistValue({
                                        sublistId: sublistId,
                                        fieldId: fieldId[transaction.type][1],
                                        line: index
                                    });

                                    let appliedRecType = transaction.getSublistValue({
                                        sublistId: sublistId,
                                        fieldId: fieldId[transaction.type][2],
                                        line: index
                                    });

                                    if (appliedRecId && recordIdType[appliedRecType]) {

                                        let appliedRecFields = Search.lookupFields({
                                            type: recordIdType[appliedRecType],
                                            id: appliedRecId,
                                            columns: ['class']
                                        })
                                        let currentClass = appliedRecFields.class[0] ? appliedRecFields.class[0].value : null;

                                        if (classId === null) {
                                            classId = currentClass;
                                        } else if (classId !== currentClass) {
                                            sameClass = false;
                                            break;
                                        }
                                    }
                                }

                            } else {

                                let currentClass = transaction.getSublistValue({
                                    sublistId: sublistId,
                                    fieldId: 'class',
                                    line: index
                                });

                                if (classId === null) {
                                    classId = currentClass;
                                } else if (classId !== currentClass) {
                                    sameClass = false;
                                    break;
                                }
                            }
                        }
                    }
                }

                if (sameClass) {
                    transaction.setValue({
                        fieldId: 'class',
                        value: classId
                    });
                } else {
                    transaction.setValue({
                        fieldId: 'class',
                        value: noClassId
                    });
                }
            }
        }
    }

    const setValues = (transaction) => {

        const getItems = (itemIds) => {
            let items = {};
            let columns = [
                'custitem_demo_hscode_us',
                'custitem_demo_hscode_eu',
                'custitem_demo_hs_code_ca',
                'custitem_demo_hs_code_uk',
                'custitem_demo_units_per_box',
                'custitem_demo_boxweight',
                'custitem_demo_boxvol',
                'custitem_demo_skuuk',
                'custitem_demo_fnskuuk',
                'custitem_demo_sku_eu',
                'custitem_demo_fnsku_eu',
                'custitem_demo_skuus',
                'custitem_demo_fnskuus',
                'custitem_demo_skuca',
                'custitem_demo_fnskuca'
            ]
            let searchObj = Search.create({
                type: 'item',
                filters: [
                    ['internalid', 'anyof', itemIds]
                ],
                columns
            });
            searchObj.run().each(function (result) {
                let sku = {
                    US: result.getValue('custitem_demo_skuus'),
                    EU: result.getValue('custitem_demo_sku_eu'),
                    UK: result.getValue('custitem_demo_skuuk'),
                    CA: result.getValue('custitem_demo_skuca')
                }
                let fnsku = {
                    US: result.getValue('custitem_demo_fnskuus'),
                    EU: result.getValue('custitem_demo_fnsku_eu'),
                    UK: result.getValue('custitem_demo_fnskuuk'),
                    CA: result.getValue('custitem_demo_fnskuca')
                }
                let hscode = {
                    US: result.getValue('custitem_demo_hscode_us'),
                    EU: result.getValue('custitem_demo_hscode_eu'),
                    UK: result.getValue('custitem_demo_hs_code_uk'),
                    CA: result.getValue('custitem_demo_hs_code_ca')
                }
                items[result.id] = {
                    sku,
                    fnsku,
                    hscode,
                    unitsPerBox: Number(result.getValue('custitem_demo_units_per_box')),
                    boxWeight: Number(result.getValue('custitem_demo_boxweight')),
                    boxVolume: Number(result.getValue('custitem_demo_boxvol'))
                }
                return true;
            });
            return items;

        }

        const getlocationsData = (location) => {

            let searchObj = Search.create({
                type: 'location',
                filters: [
                    ['internalid', 'anyof', location]
                ],
                columns: [
                    'country',
                    'cseg_demo_region',
                    'custrecord_yb_logistic_region',
                    'locationtype'
                ]
            });

            let locationsData = {};
            searchObj.run().each(function (result) {
                let region = result.getValue('cseg_demo_region').length === 1 ? result.getText('cseg_demo_region') : null;
                let regionId = result.getValue('cseg_demo_region').length === 1 ? result.getValue('cseg_demo_region') : null;
                let logisticRegion = result.getValue('custrecord_yb_logistic_region').length === 1 ? result.getText('custrecord_yb_logistic_region') : null;
                let logisticRegionId = result.getValue('custrecord_yb_logistic_region').length === 1 ? result.getValue('custrecord_yb_logistic_region') : null;
                let locationType = result.getValue('locationtype') ? result.getValue('locationtype') : null;
                locationsData[result.id] = { region, regionId, logisticRegion, logisticRegionId, locationType }
                return true;
            });

            return locationsData
        }

        let locationData = {};
        let locationsData = {};
        let region = null
        let regionId = null
        let logisticRegion = null
        let logisticRegionId = null
        let locationType = null
        let locationMap = {
            'purchaseorder': 'location',
            'transferorder': 'transferlocation',
        }
        let expectedReceiptDateMap = {
            'purchaseorder': 'duedate',
            'transferorder': 'shipdate',
        }

        let itemIds = [];
        let locationIds = [];
        let lineCount = transaction.getLineCount({ sublistId: 'item' });
        for (let line = 0; line < lineCount; line++) {
            let item = transaction.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line
            });
            if (!itemIds.includes(item)) itemIds.push(item)
            if (transaction.type == Record.Type.PURCHASE_ORDER) {
                let location = transaction.getSublistValue({
                    sublistId: 'item',
                    fieldId: locationMap[transaction.type],
                    line
                });
                if (location && !locationIds.includes(location)) locationIds.push(location);
            }
        }

        if (itemIds.length > 0) {

            let items = getItems(itemIds);

            let totalWeight = 0;
            let totalVolume = 0;
            let totalBoxes = 0;
            let totalCbf = 0;
            let totalQuantity = 0;
            let locationBody

            let fieldMap = {
                department: 'department',
                location: 'location',
            }

            if (transaction.type == Record.Type.TRANSFER_ORDER) {
                let location = transaction.getValue({ fieldId: locationMap[transaction.type] });
                if (location) {
                    locationsData = getlocationsData(location)
                    locationData = locationsData[location];
                    region = locationData.region
                    regionId = locationData.regionId
                    logisticRegion = locationData.logisticRegion
                    logisticRegionId = locationData.logisticRegionId
                    locationType = locationData.locationType
                }
            } else if (transaction.type == Record.Type.PURCHASE_ORDER) {
                locationBody = transaction.getValue({ fieldId: locationMap[transaction.type] });
                locationIds.push(locationBody)
                locationsData = locationIds.length > 0 ? getlocationsData(locationIds) : null;
            }

            let expectedreceiptdateHeader = transaction.getValue({ fieldId: expectedReceiptDateMap[transaction.type] }) || null

            const CBF = 35.3147;
            let uniqueSKU = []
            for (let line = 0; line < lineCount; line++) {
                let itemId = transaction.getSublistValue({ sublistId: 'item', fieldId: 'item', line });
                let quantity = transaction.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line });
                let demoBoxes = transaction.getSublistValue({ sublistId: 'item', fieldId: 'custcol_demo_boxes', line });
                let expectedreceiptdateLine = transaction.getSublistValue({ sublistId: 'item', fieldId: 'expectedreceiptdate', line });
                let item = items[itemId];

                let unitsPerBox = item.unitsPerBox || 1;
                let boxes = Math.ceil(quantity / unitsPerBox);
                let weight = boxes * item.boxWeight;
                let volume = boxes * item.boxVolume;
                let cbf = volume * CBF;

                let itemtype = transaction.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line });
                transaction.setSublistValue({ sublistId: 'item', fieldId: 'custcol_demo_weight', value: Math.round(Number(weight) * 100) / 100, line });
                transaction.setSublistValue({ sublistId: 'item', fieldId: 'custcol_demo_cubicmeters', value: Math.round(Number(volume) * 100) / 100, line });
                if (!demoBoxes || demoBoxes == 0)
                    transaction.setSublistValue({ sublistId: 'item', fieldId: 'custcol_demo_boxes', value: Math.round(Number(boxes) * 100) / 100, line });
                transaction.setSublistValue({ sublistId: 'item', fieldId: 'custcol_demo_cbf', value: Math.round(Number(cbf) * 100) / 100, line });

                if (itemtype == 'InvtPart' || itemtype == 'Assembly') {
                    totalWeight = totalWeight + weight;
                    totalVolume = totalVolume + volume;
                    totalBoxes = totalBoxes + boxes;
                    totalCbf = totalCbf + cbf;
                    totalQuantity = totalQuantity + quantity;

                    let itemName = transaction.getSublistValue({ sublistId: 'item', fieldId: 'item_display', line });

                    if (!uniqueSKU.includes(itemName)) {
                        uniqueSKU.push(itemName)
                    }
                }

                if (transaction.type == Record.Type.PURCHASE_ORDER) {
                    let location = transaction.getSublistValue({ sublistId: 'item', fieldId: 'location', line });
                    locationData = locationsData[location] ? locationsData[location] : locationsData[locationBody];
                    region = locationData.region ? locationData.region : null;
                    regionId = locationData.regionId ? locationData.regionId : null;
                    logisticRegion = locationData.logisticRegion ? locationData.logisticRegion : null;
                    logisticRegionId = locationData.logisticRegionId ? locationData.logisticRegionId : null;
                    locationType = locationData.locationType ? locationData.locationType : null;
                }



                if (region) {
                    transaction.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'cseg_demo_region',
                        value: regionId,
                        line
                    });

                    transaction.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_demo_hscode',
                        value: item.hscode[region],
                        line
                    });
                }

                if (logisticRegionId) {
                    transaction.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_demo_logistic_region',
                        value: logisticRegionId,
                        line
                    });

                    let sku = transaction.getSublistValue({ sublistId: 'item', fieldId: 'custcol_demo_sku', line });
                    if (!sku) {
                        transaction.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_demo_sku',
                            value: item.sku[logisticRegion],
                            line
                        });
                    }

                    let fnsku = transaction.getSublistValue({ sublistId: 'item', fieldId: 'custcol_demo_fnsku', line });
                    if (!fnsku) {
                        transaction.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_demo_fnsku',
                            value: item.fnsku[logisticRegion],
                            line
                        });
                    }
                }

                if (locationType) {
                    transaction.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_demo_location_type',
                        value: locationType,
                        line
                    });
                }

                for (let f in fieldMap) {
                    let lineValue = transaction.getSublistValue({ sublistId: 'item', fieldId: fieldMap[f], line });
                    if (!lineValue) {
                        let value = transaction.getValue({ fieldId: f });
                        transaction.setSublistValue({ sublistId: 'item', fieldId: fieldMap[f], value: value, line });
                    }
                }
                if (!expectedreceiptdateLine) {
                    transaction.setSublistValue({ sublistId: 'item', fieldId: 'expectedreceiptdate', value: Format.parse({ value: expectedreceiptdateHeader, type: Format.Type.DATE }), line });
                }
            }

            transaction.setValue({ fieldId: 'custbody_demo_totalweight', value: Math.round(Number(totalWeight) * 100) / 100 });
            transaction.setValue({ fieldId: 'custbody_demo_totalcbm', value: Math.round(Number(totalVolume) * 100) / 100 });
            transaction.setValue({ fieldId: 'custbody_demo_totalboxes', value: Math.round(Number(totalBoxes) * 100) / 100 });
            transaction.setValue({ fieldId: 'custbody_demo_totalcbf', value: Math.round(Number(totalCbf) * 100) / 100 });
            transaction.setValue({ fieldId: 'custbody_demo_totalquantity', value: Math.round(Number(totalQuantity) * 100) / 100 });
            transaction.setValue({ fieldId: 'custbody_yb_totalsku', value: uniqueSKU.length });
        }
    }

    const setLineValues = (transaction) => {

        const getAccountsData = (accounts) => {
            let accountsData = {};
            let searchObj = Search.create({
                type: 'account',
                filters: [
                    ['internalid', 'anyof', accounts]
                ],
                columns: [
                    'internalid',
                    'custrecord_demo_defaultdepartment'
                ]
            });
            searchObj.run().each(function (result) {
                accountsData[result.getValue('internalid')] = result.getValue('custrecord_demo_defaultdepartment');
                return true;
            });
            return accountsData;
        }

        const sublistIdType = {
            journalentry: 'line',
            vendorbill: 'expense',
            vendorcredit: 'expense'
        }

        let sublistId = sublistIdType[transaction.type];
        let lineCount = transaction.getLineCount({ sublistId });
        let accounts = [];
        for (let line = 0; line < lineCount; line++) {
            let account = transaction.getSublistValue({
                sublistId,
                fieldId: 'account',
                line
            });
            if (!accounts.includes(account)) accounts.push(account)
        }

        let defaultClass = null
        let defaultSalesChannel = null

        let vendorId = transaction.getValue({ fieldId: 'entity' });
        if (vendorId) {
            let vendorFields = Search.lookupFields({
                type: 'vendor',
                id: vendorId,
                columns: ['custentity_demo_defaultclass', 'custentity_demo_defaultsaleschannel']
            })

            defaultClass = vendorFields.custentity_demo_defaultclass[0] ?
                vendorFields.custentity_demo_defaultclass[0].value : null;

            defaultSalesChannel = vendorFields.custentity_demo_defaultsaleschannel[0] ?
                vendorFields.custentity_demo_defaultsaleschannel[0].value : null;
        }

        if (!defaultClass || !defaultSalesChannel) {

            let subsidiaryId = transaction.getValue({ fieldId: 'subsidiary' });
            let subsidiaryFields = Search.lookupFields({
                type: 'subsidiary',
                id: subsidiaryId,
                columns: ['custrecord_demo_defaultclass', 'custrecord_demo_defaultsaleschannel']
            })
            if (!defaultClass) defaultClass = subsidiaryFields.custrecord_demo_defaultclass[0] ? subsidiaryFields.custrecord_demo_defaultclass[0].value : null;

            if (!defaultSalesChannel) defaultSalesChannel = subsidiaryFields.custrecord_demo_defaultsaleschannel[0] ? subsidiaryFields.custrecord_demo_defaultsaleschannel[0].value : null;
        }

        if (accounts.length > 0) {
            let accountsData = getAccountsData(accounts);
            for (let line = 0; line < lineCount; line++) {
                let department = transaction.getSublistValue({ sublistId, fieldId: 'department', line });
                if (!department) {
                    let account = transaction.getSublistValue({ sublistId, fieldId: 'account', line });
                    transaction.setSublistValue({ sublistId, fieldId: 'department', value: accountsData[account], line });
                }
                let classification = transaction.getSublistValue({ sublistId, fieldId: 'class', line });
                if (!classification && defaultClass) {
                    transaction.setSublistValue({ sublistId, fieldId: 'class', value: defaultClass, line });
                }
                let salesChannel = transaction.getSublistValue({ sublistId, fieldId: 'cseg_demo_saleschanne', line });
                if (!salesChannel && defaultSalesChannel) {
                    transaction.setSublistValue({ sublistId, fieldId: 'cseg_demo_saleschanne', value: defaultSalesChannel, line });
                }
            }
        }

        if (transaction.type == Record.Type.VENDOR_BILL) {
            let sublistId = 'item'
            let lineCount = transaction.getLineCount({ sublistId });

            for (let line = 0; line < lineCount; line++) {
                let classification = transaction.getSublistValue({ sublistId, fieldId: 'class', line });
                if (!classification && defaultClass) {
                    transaction.setSublistValue({ sublistId, fieldId: 'class', value: defaultClass, line });
                }
                let salesChannel = transaction.getSublistValue({ sublistId, fieldId: 'cseg_demo_saleschanne', line });
                if (!salesChannel && defaultSalesChannel) {
                    transaction.setSublistValue({ sublistId, fieldId: 'cseg_demo_saleschanne', value: defaultSalesChannel, line });
                }
            }

        }
    }

    const setLineInventoryDetail = (transaction) => {

        function getItemLotNumbers(itemIds, locations) {
            let itemLotnumbers = {};
            let filters = [
                ['item', 'is', itemIds],
                'AND',
                ['quantityavailable', 'greaterthan', 0]
            ];

            if (locations.length > 0) {
                filters.push("AND");
                filters.push(["location", "anyof", locations])
            }

            let searchObj = Search.create({
                type: 'inventorynumber',
                filters,
                columns: [
                    Search.createColumn({ name: 'expirationdate', sort: Search.Sort.ASC }),
                    'internalid',
                    'item',
                    'location',
                    'inventorynumber',
                    'quantityavailable'
                ]
            });

            searchObj.run().each(function (result) {
                let item = result.getValue('item');
                let location = result.getValue('location');
                if (!itemLotnumbers.hasOwnProperty(item))
                    itemLotnumbers[item] = {};
                if (!itemLotnumbers[item].hasOwnProperty(location))
                    itemLotnumbers[item][location] = {};
                let inventorynumber = result.getValue('inventorynumber');
                if (!itemLotnumbers[item][location].hasOwnProperty(inventorynumber))
                    itemLotnumbers[item][location][inventorynumber] = 0;
                itemLotnumbers[item][location][inventorynumber] += Number(result.getValue('quantityavailable'))
                return true;
            });

            return itemLotnumbers;
        }

        try {
            let lineCount = transaction.getLineCount({ sublistId: 'item' })
            for (let index = 0; index < lineCount; index++) {
                let inventorydetailavail = transaction.getSublistValue({ sublistId: 'item', fieldId: 'inventorydetailavail', line: index }) === "F" ? false : true
                let inventorydetailset = transaction.getSublistValue({ sublistId: 'item', fieldId: 'inventorydetailset', line: index }) === "F" ? false : true
                if (inventorydetailavail && !inventorydetailset) {

                    let itemId = transaction.getSublistValue({ sublistId: 'item', fieldId: 'item', line: index })
                    let location = transaction.getValue({ sublistId: 'item', fieldId: 'location' })
                    let itemLotNumbers = getItemLotNumbers(itemId, location)
                    let quantity = Number(transaction.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: index }))

                    if (itemLotNumbers[itemId] && itemLotNumbers[itemId][location]) {
                        let lotNumbers = itemLotNumbers[itemId][location]
                        let serialNumbers = [];
                        let itemQuantity = quantity;
                        for (let l in lotNumbers) {
                            let lotNumberQty = lotNumbers[l] > itemQuantity ? itemQuantity : lotNumbers[l]
                            if (lotNumberQty > 0)
                                serialNumbers.push({ lotNumber: l, quantity: lotNumberQty })
                            lotNumbers[l] -= lotNumberQty;
                            itemQuantity -= lotNumberQty;
                            if (itemQuantity === 0)
                                break;
                        }
                        let subrec = transaction.getSublistSubrecord({
                            sublistId: 'item',
                            fieldId: 'inventorydetail',
                            line: index
                        });

                        let i = 0
                        for (let serialNumber of serialNumbers) {

                            subrec.setSublistValue({
                                sublistId: 'inventoryassignment',
                                fieldId: 'quantity',
                                value: serialNumber.quantity,
                                line: i
                            });

                            subrec.setSublistValue({
                                sublistId: 'inventoryassignment',
                                fieldId: 'receiptinventorynumber',
                                value: serialNumber.lotNumber,
                                line: i
                            });

                            i += 1
                        }
                    }
                }
            }

        } catch (error) {
            log.error('setLineInventoryDetail', error.message)
        }
    }

    const setDefaultItem = (transaction) => {

        let vendorId = transaction.getValue({ fieldId: 'entity' });
        if (vendorId) {
            let vendorFields = Search.lookupFields({
                type: 'vendor',
                id: vendorId,
                columns: ['custentity_demo_defaultitem']
            })

            let defaultItem = vendorFields.custentity_demo_defaultitem[0] ?
                vendorFields.custentity_demo_defaultitem[0].value : null;

            if (defaultItem) {
                transaction.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: defaultItem,
                    ignoreFieldChange: true
                })
            }
        }
    }

    const validateSubsidiaryClassCombo = (transaction) => {
        const subsidiaryId = transaction.getValue({ fieldId: 'subsidiary' });
        const classId = transaction.getValue({ fieldId: 'class' });

        console.log(
            '🕵️‍♂️ Validating MC – Clases por Subsidiaria combo:',
            'Subsidiary=', subsidiaryId,
            'Class=', classId
        );

        // Skip validation if classId is empty
        if (!classId) {
            console.log('✅ Class ID is empty – skipping validation and allowing save');
            return { isValid: true };
        }

        const comboSearch = Search.create({
            type: 'customrecord_demo_clases_por_subsidiaria',
            filters: [
                ['custrecord_demo_clases_subsidiaria', 'anyof', subsidiaryId],
                'AND',
                ['custrecord_demo_clases', 'anyof', classId]
            ],
            columns: ['internalid']
        });

        console.log('🔍 Running search with filters:', comboSearch.filters);

        const result = comboSearch.run().getRange({ start: 0, end: 1 });
        console.log('📊 Search returned', result.length, 'result(s)');

        if (!result || result.length === 0) {
            console.log('❌ No matching record found – blocking save');
            return {
                isValid: false,
                error: {
                    title: 'Error de Validación',
                    message: 'La combinación de subsidiaria y clase no es válida según la configuración en MC – Clases por Subsidiaria.',
                    type: 'ERROR',
                    duration: 20000
                }
            };
        }

        console.log('✅ Matching record found – allowing save');
        return { isValid: true };
    }

    const createReversalJeProcess = (transaction) => {

        let billLineCount = transaction.getLineCount({ sublistId: 'expense' });

        if (billLineCount === 0) {
            log.error('Reversal JE Creation', 'No lines found in the bill to create a reversal JE');
            return;
        }

        let trandate = transaction.getValue({ fieldId: 'trandate' });
        let tranid = transaction.getValue({ fieldId: 'tranid' });
        let internalId = transaction.getValue({ fieldId: 'id' });
        let previousMonthDate = getFirstDay(trandate, true);
        let postingPeriodInfo = getPostingPeriodInfo(previousMonthDate);
        if (postingPeriodInfo.endDate === null || postingPeriodInfo.periodId === null) {
            throw new Error('El proceso de provisión no se puede realizar porque no se encontró un período contable abierto para la fecha de transacción. Por favor, verifica la configuración de períodos contables e intenta nuevamente.');
        }

        let actualMonthFirstDay = getFirstDay(trandate, false);
        let endDate = postingPeriodInfo.endDate;
        let periodId = postingPeriodInfo.periodId;

        const mappingObj = {};
        for (let i = 0; i < billLineCount; i++) {
            mappingObj[i] = {
                account: transaction.getSublistValue({ sublistId: 'expense', fieldId: 'account', line: i }),
                amount: transaction.getSublistValue({ sublistId: 'expense', fieldId: 'amount', line: i }),
                grossamt: transaction.getSublistValue({ sublistId: 'expense', fieldId: 'grossamt', line: i }),
                memo: transaction.getSublistValue({ sublistId: 'expense', fieldId: 'memo', line: i }),
                class: transaction.getSublistValue({ sublistId: 'expense', fieldId: 'class', line: i }),
                saleschannel: transaction.getSublistValue({ sublistId: 'expense', fieldId: 'cseg_demo_saleschanne', line: i }),
                growthproject: transaction.getSublistValue({ sublistId: 'expense', fieldId: 'cseg_demo_growthprjct', line: i })
            };
        }

        try {
            const sublistId = 'line';
            const journal = Record.create({ type: Record.Type.JOURNAL_ENTRY, isDynamic: true });

            // Set header values
            journal.setValue({ fieldId: 'customform', value: 132 });
            journal.setValue({ fieldId: 'subsidiary', value: transaction.getValue({ fieldId: 'subsidiary' }) });
            journal.setValue({ fieldId: 'trandate', value: fixDateFormat(endDate) });
            journal.setValue({ fieldId: 'currency', value: transaction.getValue({ fieldId: 'currency' }) });
            journal.setValue({ fieldId: 'reversaldate', value: fixDateFormat(actualMonthFirstDay) });
            journal.setValue({ fieldId: 'postingperiod', value: periodId });
            journal.setValue({ fieldId: 'custbody_demo_created_from_provision', value: internalId });
            journal.setValue({ fieldId: 'memo', value: `Created from transaction: ${tranid}` });

            for (let key in mappingObj) {
                const line = mappingObj[key];

                // Línea de débito con la cuenta de la factura
                journal.selectNewLine({ sublistId });
                journal.setCurrentSublistValue({ sublistId, fieldId: 'account', value: line.account });
                journal.setCurrentSublistValue({ sublistId, fieldId: 'debit', value: line.amount });
                journal.setCurrentSublistValue({ sublistId, fieldId: 'entity', value: transaction.getValue({ fieldId: 'entity' }) });
                if (line.class) journal.setCurrentSublistValue({ sublistId, fieldId: 'class', value: line.class });
                if (line.memo) journal.setCurrentSublistValue({ sublistId, fieldId: 'memo', value: line.memo + ' - Created From: ' + tranid });
                if (line.saleschannel) journal.setCurrentSublistValue({ sublistId, fieldId: 'cseg_demo_saleschanne', value: line.saleschannel });
                if (line.grossamt) journal.setCurrentSublistValue({ sublistId, fieldId: 'custcol_demo_grossamt', value: line.grossamt });
                if (line.growthproject) journal.setCurrentSublistValue({ sublistId, fieldId: 'cseg_demo_growthprjct', value: line.growthproject });
                journal.commitLine({ sublistId });

                // Línea de crédito con la cuenta fija 1387
                journal.selectNewLine({ sublistId });
                journal.setCurrentSublistValue({ sublistId, fieldId: 'account', value: 1387 });
                journal.setCurrentSublistValue({ sublistId, fieldId: 'credit', value: line.amount });
                journal.setCurrentSublistValue({ sublistId, fieldId: 'entity', value: transaction.getValue({ fieldId: 'entity' }) });
                if (line.class) journal.setCurrentSublistValue({ sublistId, fieldId: 'class', value: line.class });
                if (line.memo) journal.setCurrentSublistValue({ sublistId, fieldId: 'memo', value: line.memo + ' - Created From: ' + tranid });
                if (line.saleschannel) journal.setCurrentSublistValue({ sublistId, fieldId: 'cseg_demo_saleschanne', value: line.saleschannel });
                if (line.grossamt) journal.setCurrentSublistValue({ sublistId, fieldId: 'custcol_demo_grossamt', value: line.grossamt });
                if (line.growthproject) journal.setCurrentSublistValue({ sublistId, fieldId: 'cseg_demo_growthprjct', value: line.growthproject });
                journal.commitLine({ sublistId });
            }

            // Guardar el journal
            const journalId = journal.save();
            log.audit('Reversal Journal Entry created', `Journal ID: ${journalId}`);

            if (journalId) transaction.setValue('custbody_demo_reversal_journal_entry_rec', journalId);

        } catch (error) {
            log.error('Error creating reversal JE', error);
        }

        function getFirstDay(dateStr, subtractOneMonth) {
            const date = new Date(dateStr);

            if (subtractOneMonth) {
                date.setMonth(date.getMonth() - 1);
            }

            const day = 1;
            const month = date.getMonth() + 1;
            const year = date.getFullYear();

            return `${day}/${month}/${year}`;
        }

        function getPostingPeriodInfo(startDate) {

            let periodInfo = {
                periodId: null,
                endDate: null
            };
            Search.create({
                type: "accountingperiod",
                filters:
                    [
                        ["startdate", "on", startDate],
                        "AND",
                        ["isinactive", "is", "F"],
                        "AND",
                        ["closed", "is", "F"],
                        "AND",
                        ["periodname", "doesnotstartwith", "FY"],
                        "AND",
                        ["periodname", "doesnotstartwith", "Q"]
                    ],
                columns:
                    [
                        Search.createColumn({ name: "enddate", label: "End Date" }),
                        Search.createColumn({ name: "internalid", label: "Internal ID" })
                    ]
            }).run().each(function (result) {
                periodInfo.periodId = result.getValue({ name: 'internalid' });
                periodInfo.endDate = result.getValue({ name: 'enddate' });
                return true;
            })

            return periodInfo;
        }

        function fixDateFormat(dateStr) {
            const parts = dateStr.split("/");
            if (parts.length !== 3) return null;

            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // mes 0-indexado
            const year = parseInt(parts[2], 10);

            return new Date(year, month, day);
        }
    }

    const removeExistingReversalJE = (transaction) => {

        try {
            let reversalJEId = transaction.getValue({ fieldId: 'custbody_demo_reversal_journal_entry_rec' });
            if (reversalJEId) {
                Record.delete({ type: Record.Type.JOURNAL_ENTRY, id: reversalJEId });
                log.audit('Reversal JE Deleted', `Reversal JE with ID ${reversalJEId} has been deleted.`);
            }
        } catch (error) {
            log.error('Error removing existing reversal JE', error);
        }
    }

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
        setClassNull,
        setClass,
        setValues,
        setLineValues,
        setLineInventoryDetail,
        setDefaultItem,
        validateSubsidiaryClassCombo,
        createReversalJeProcess,
        removeExistingReversalJE,
        setUnitsPerBox,
        calculateBoxes
    }

});
