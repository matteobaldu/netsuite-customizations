/**
* @NApiVersion 2.1
* @NAmdConfig /SuiteScripts/demo/config.json
*/
define(['N/record', 'N/search', 'N/config', 'N/url', 'N/render', 'N/email', 'ST/util', 'N/runtime'], (Record, Search, Config, Url, Render, Email, Util, Runtime) => {


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
            let emailSender = emailRecepient // defined by client

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

    function isEmpty(stValue) {
        return (stValue === '' || stValue === null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) ||
            (stValue.constructor === Object && (function (v) {
                for (let k in v) return false;
                return true;
            })(stValue));
    }

    return { setValuesFromFirstLine, setLineDepartment, sendApprovalNotification, setNetAmount }

})

