/**
* @NApiVersion 2.1
* @NAmdConfig /SuiteScripts/demo/seedtag/config.json
*/
define(['N/record', 'N/search', 'N/config', 'N/url', 'N/render', 'N/email', 'ST/util', 'N/runtime'], (Record, Search, Config, Url, Render, Email, Util, Runtime) => {

    const setLocation = (transaction) => {
        let subsidiaryFields = Search.lookupFields({
            type: 'subsidiary',
            id: transaction.getValue({ fieldId: 'subsidiary' }),
            columns: ['custrecord_demo_defaultlocation']
        })
        let defaultLocation = subsidiaryFields.custrecord_demo_defaultlocation[0] ?
            subsidiaryFields.custrecord_demo_defaultlocation[0].value : null;

        if (defaultLocation) {
            let sublistId = 'item';
            let lineCount = transaction.getLineCount({ sublistId });
            for (let line = 0; line < lineCount; line++) {
                let location = transaction.getSublistValue({ sublistId, fieldId: 'location', line });
                if (!location && defaultLocation) {
                    transaction.setSublistValue({ sublistId, fieldId: 'location', value: defaultLocation, line });
                }
            }
        }
    }

    const setLineEntity = (transaction, account, entity) => {
        let sublistId = 'line';
        let lineCount = transaction.getLineCount({ sublistId });
        for (let line = 0; line < lineCount; line++) {
            let lineAccount = transaction.getSublistValue({ sublistId, fieldId: 'account', line });
            let lineEntity = transaction.getSublistValue({ sublistId, fieldId: 'entity', line });
            if (!lineEntity && lineAccount === account) {
                transaction.setSublistValue({ sublistId, fieldId: 'entity', value: entity, line });
            }
        }
    }

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

    const setWithholdingTax = (transaction) => {
        const getTaxCodes = (ids) => {
            let taxCodes = {}
            let columns = [
                "custrecord_4601_wtc_rate"
            ];
            let searchObj = Search.create({
                type: "customrecord_4601_witaxcode",
                filters: [
                    ["internalid", "anyof", ids]
                ],
                columns
            });
            searchObj.run().each(function (result) {
                taxCodes[result.id] = { percent: parseFloat(result.getValue(columns[0])) }
                return true;
            });
            return taxCodes;
        }

        const taxCodeMap = {
            2: 1, //IRPF ES:IRPF_15"
            1: 2, //IRPF ES:IRPF_7"
        };

        const setWhLines = (sublistId) => {

            let lineCount = transaction.getLineCount({ sublistId });
            let taxCodeIds = [];
            for (let line = 0; line < lineCount; line++) {
                let whPercent = transaction.getSublistValue({ sublistId, line, fieldId: 'custcolwht_ab' });
                if (taxCodeMap[whPercent]) {
                    taxCodeIds.push(taxCodeMap[whPercent])
                }
            }
            if (taxCodeIds.length > 0) {
                let taxCodes = getTaxCodes(taxCodeIds);

                let taxCodeField = sublistId === 'item' ? 'custcol_4601_witaxcode' : 'custcol_4601_witaxcode_exp'
                let taxRateField = sublistId === 'item' ? 'custcol_4601_witaxrate' : 'custcol_4601_witaxrate_exp'
                let baseAmountField = sublistId === 'item' ? 'custcol_4601_witaxbaseamount' : 'custcol_4601_witaxbamt_exp'
                let taxAmountField = sublistId === 'item' ? 'custcol_4601_witaxamount' : 'custcol_4601_witaxamt_exp'
                for (let line = 0; line < lineCount; line++) {
                    let whPercent = transaction.getSublistValue({ sublistId, line, fieldId: 'custcolwht_ab' });
                    let taxCodeId = taxCodeMap[whPercent];
                    if (taxCodeId) {
                        let taxCode = taxCodes[taxCodeId];
                        let amount = transaction.getSublistValue({ sublistId, line, fieldId: 'amount' });
                        let taxAmount = (amount * taxCode.percent) / 100;
                        transaction.setSublistValue({ sublistId, line, fieldId: 'custcol_4601_witaxapplies', value: true });
                        transaction.setSublistValue({ sublistId, line, fieldId: taxCodeField, value: taxCodeId });
                        transaction.setSublistValue({ sublistId, line, fieldId: taxRateField, value: taxCode.percent });
                        transaction.setSublistValue({ sublistId, line, fieldId: baseAmountField, value: amount });
                        transaction.setSublistValue({ sublistId, line, fieldId: taxAmountField, value: taxAmount * (-1) });
                    }

                }
            }
        }

        setWhLines('expense')
        setWhLines('item')
    }

    const overrideTaxDetails = (newRecord) => {

        const override = () => {
            let id = null;
            let searchObj = Search.load({ id: 'customsearch_demo_taxdetails_override' })
            let filter = Search.createFilter({
                name: 'internalid',
                operator: Search.Operator.ANYOF,
                values: newRecord.id
            });
            searchObj.filters.push(filter)
            searchObj.run().each(function (result) {
                id = result.id;
                return false;
            });
            return Number(id) === Number(newRecord.id);
        }

        let transaction = Record.load({ type: newRecord.type, id: newRecord.id, isDynamic: true })

        let total = transaction.getValue({ fieldId: 'total' });
        transaction.setValue({ fieldId: 'custbody_demo_original_total', value: total });

        let sublistId = 'item'
        let lineCount = transaction.getLineCount({ sublistId });
        if (lineCount === 0) sublistId = 'expense'

        let whLine = false;
        lineCount = transaction.getLineCount({ sublistId });
        for (let line = 0; line < lineCount; line++) {
            transaction.selectLine({ sublistId, line })
            let grossamt = transaction.getSublistValue({ sublistId, line, fieldId: 'grossamt' })
            let wht = transaction.getSublistValue({ sublistId, line, fieldId: 'custcolwht_ab' })
            if (!whLine && Number(wht) === 4) whLine = true
            transaction.setCurrentSublistValue({ sublistId, fieldId: 'custcol_demo_original_grossamt', value: grossamt })
            transaction.commitLine({ sublistId })
        }
        let hold = false;
        if (override(transaction)) {
            transaction.setValue({ fieldId: 'taxdetailsoverride', value: false })
            transaction.setValue({ fieldId: 'custbody_demo_taxoverride_process', value: true })
            transaction.setValue({ fieldId: 'taxregoverride', value: true })
            transaction.save()


            transaction = Record.load({ type: newRecord.type, id: newRecord.id, isDynamic: true })
            transaction.setValue({ fieldId: 'taxregoverride', value: false })
            transaction.save()

            let transactionData = Search.lookupFields({
                type: newRecord.type,
                id: newRecord.id,
                columns: ['custbody_demo_original_total', 'fxamount']
            })

            if (transactionData['custbody_demo_original_total']) {
                let fxamount = Math.abs(Number(transactionData['fxamount']))
                let originalAmount = Number(transactionData['custbody_demo_original_total'])
                if (fxamount !== originalAmount) {
                    hold = true
                }
            }
        }
        let entityData = Search.lookupFields({
            type: 'entity',
            id: newRecord.getValue({ fieldId: 'entity' }),
            columns: ['custentity_demo_whapplicable']
        })
        if (entityData['custentity_demo_whapplicable'] !== whLine) {
            hold = true
        }

        if (hold)
            Record.submitFields({
                type: newRecord.type,
                id: newRecord.id,
                values: { paymenthold: true },
                options: { disableTriggers: true }
            })
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

    const setLineDepartment = (transaction) => {
        let lineCount = transaction.getLineCount({ sublistId: 'item' })
        let item
        for (let index = 0; index < lineCount; index++) {
            item = transaction.getSublistValue({ sublistId: 'item', fieldId: 'item', line: index });
            department = Search.lookupFields({ type: Search.Type.ITEM, id: item, columns: 'department' })['department'];
            if (department[0]) orderLine = transaction.setSublistValue({ sublistId: 'item', fieldId: 'department', value: department[0].value, line: index });
        }
    }

    const sendApprovalNotification = (newRecord, oldRecord, currentScript) => {
        try {

            let newApproveCheck = newRecord.getValue({ fieldId: 'custbody_ffa_approve_check' })
            let oldApproveCheck = oldRecord.getValue({ fieldId: 'custbody_ffa_approve_check' })
            let remainingApprovalSteps = oldRecord.getValue({ fieldId: 'custbody_ffa_remaining_logs' }) ? Number(oldRecord.getValue({ fieldId: 'custbody_ffa_remaining_logs' })) : 0

            // NewApprovalStatus = Approved - OldApproveStatus = Pending Approval
            if (newApproveCheck && !oldApproveCheck && remainingApprovalSteps <= 1) {
                let vendorId = oldRecord.getValue({ fieldId: 'entity' });
                if (vendorId) {
                    let vendorFields = Search.lookupFields({
                        type: 'vendor',
                        id: vendorId,
                        columns: ['category']
                    })

                    let category = vendorFields.category[0] ? vendorFields.category[0].value : null;
                    let categoryExcluded = currentScript.getParameter({ name: 'custscript_demo_vendorcategoryexcluded' })

                    if (category != categoryExcluded) {
                        let emailRecepient = oldRecord.getValue({ fieldId: 'employee' })
                        if (emailRecepient) {
                            sendEmail(oldRecord, currentScript)
                        }
                    }
                }
            }
        } catch (error) {
            log.error('sendApprovalNotification', error.message);
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

    const sendEmail = (transaction, currentScript) => {
        try {

            // Email author & recepient
            let emailRecepient = transaction.getValue({ fieldId: 'employee' })
            let emailSender = emailRecepient // defined by seedtag

            // Email Template Load
            let emailTemplateId = currentScript.getParameter({ name: 'custscript_demo_emailtemplateid' })
            let mergeemail = Render.mergeEmail({
                templateId: emailTemplateId,
                transactionId: transaction.id
            });

            let poURL = getUrl(transaction)
            let poEmailAddress = getPoEmailAddress(transaction)

            let emailBody = mergeemail.body.replace("{pourl}", poURL).replace("{poEmailAddress}", poEmailAddress)

            // PDF attachment
            let templateId = currentScript.getParameter({ name: 'custscript_demo_pdftemplateid' })
            let objRender = Render.create()
            objRender.setTemplateById(templateId)
            objRender.addRecord('record', transaction)
            let customPdf = objRender.renderAsPdf();
            let tranId = transaction.getValue({ fieldId: 'tranid' })
            customPdf.name = 'PO' + tranId + '.pdf'

            Email.send({
                author: emailSender,
                recipients: emailRecepient,
                subject: mergeemail.subject,
                body: emailBody,
                attachments: [customPdf],
                relatedRecords: {
                    transactionId: transaction.id
                },
            });

            log.debug('sendApprovalNotification', "Email sent to : " + JSON.stringify(emailRecepient));

        } catch (error) {
            log.error('sendApprovalNotification', error.message);
        }
    }

    const getUrl = (transaction) => {

        let companyRecord = Config.load({ type: Config.Type.COMPANY_INFORMATION, });
        let accId = companyRecord.getValue({ fieldId: "companyid", });
        let domain = Url.resolveDomain({ hostType: Url.HostType.APPLICATION, accountId: accId, });
        let url = "https://" + domain

        url += Url.resolveRecord({
            recordType: Record.Type.PURCHASE_ORDER,
            recordId: transaction.id,
            isEditMode: false
        });

        let tranId = transaction.getValue({ fieldId: 'tranid' })
        let poURL = '<a style="color: rgb(37,85,153)" href="' + url + '">' + tranId + '</a>'

        return poURL
    }

    const getPoEmailAddress = (transaction) => {

        let subsidiary = transaction.getValue({ fieldId: 'subsidiary' })
        let result = Search.lookupFields({
            type: Record.Type.SUBSIDIARY,
            id: subsidiary,
            columns: 'custrecord_demo_purchaseemailaddress'
        })

        return result.custrecord_demo_purchaseemailaddress ? result.custrecord_demo_purchaseemailaddress : ' - '
    }

    const validateFields = (transaction) => {

        const sublistMap = {
            'journal': 'line',
            'custinvc': 'item',
            'custcred': 'item',
        }

        let transactionType = transaction.getValue('type');
        let sublistId = sublistMap[transactionType] || 'item';

        let i;
        let accountId;
        let lineAccountIds = [];
        let errors = [];
        let lineCount = transaction.getLineCount({ sublistId });

        for (i = 0; i < lineCount; i++) {
            accountId = transaction.getSublistValue({ sublistId: sublistId, fieldId: 'account', line: i });

            if (accountId && !lineAccountIds.includes(accountId)) {
                lineAccountIds.push(accountId);
            }
        }        

        if(lineAccountIds.length === 0) return;

        let filters = [
            ['custrecord_demo_lv_account', 'anyof', lineAccountIds]
        ]
        let searchObj = Search.create({
            type: 'customrecord_demo_line_validation',
            filters: filters,
            columns: [
                'custrecord_demo_lv_account',
                'custrecord_demo_lv_department',
                'custrecord_demo_lv_class'
            ]
        });
        //Obteneer las combinaciones de cuenta, departamento y clase
        let lineValidations = {}
        searchObj.run().each((result) => {
            lineValidations[result.getValue('custrecord_demo_lv_account')] = {classes: result.getValue('custrecord_demo_lv_class'), departments: result.getValue('custrecord_demo_lv_department')}
            return true
        })

        for (i = 0; i < lineCount; i++) {
            accountId = transaction.getSublistValue({ sublistId: sublistId, fieldId: 'account', line: i });

            if (isEmpty(accountId) || !lineValidations.hasOwnProperty(accountId)) {
                continue;
            }

            let departmentId = transaction.getSublistValue({ sublistId, fieldId: 'department', line: i });
            let classId = transaction.getSublistValue({ sublistId, fieldId: 'class', line: i });

            let lineValidation = lineValidations[accountId]
            if(!departmentId || !classId || !lineValidation.classes.includes(classId) || !lineValidation.departments.includes(departmentId))
                errors.push({i, accountId, classId, departmentId})       
            }

        if(errors.length > 0) 
            throw errors.map(e => `Line ${e.i + 1}: Account ${e.accountId} - Class ${e.classId} - Department ${e.departmentId} is not valid`).join(' | ')
    }

    function isEmpty(stValue) {
        return (stValue === '' || stValue === null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) ||
            (stValue.constructor === Object && (function (v) {
                for (let k in v) return false;
                return true;
            })(stValue));
    }

    return { autoPay, setWithholdingTax, setLocation, setLineEntity, overrideTaxDetails, setValuesFromFirstLine, setLineDepartment, sendApprovalNotification, setNetAmount, validateFields }

})

