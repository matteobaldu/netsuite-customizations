/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 */
define(['N/search', 'N/url', '../../status', '../../lib/custrecord'],

    function (Search, Url, Status, Custrecord) {
        /**
         * Defines the Portlet script trigger point.
         * @param {Object} params - The params parameter is a JavaScript object. It is automatically passed to the script entry
         *     point by NetSuite. The values for params are read-only.
         * @param {Portlet} params.portlet - The portlet object used for rendering
         * @param {string} params.column - Column index forthe portlet on the dashboard; left column (1), center column (2) or
         *     right column (3)
         * @param {string} params.entity - (For custom portlets only) references the customer ID for the selected customer
         * @since 2015.2
         */
        const render = (params) => {
            params.portlet.title = 'MindCloud Connect - Personio';

            let getStatusSummary = () => {
                let statusSummary = {};
                let columns = [
                    Search.createColumn({name: 'custrecord_demor_per_integration', summary: 'GROUP'}),
                    Search.createColumn({name: 'custrecord_demor_per_status', summary: 'GROUP'}),
                    Search.createColumn({name: 'internalid', summary: 'COUNT'})
                ];
                let integrationRecordSearchObj = Search.create({
                    type: 'customrecord_demo_per_integration_record',
                    filters: [],
                    columns: columns
                });
                integrationRecordSearchObj.run().each(function(result){
                    let integrationId = result.getValue(columns[0])
                    if(!statusSummary.hasOwnProperty(integrationId))
                        statusSummary[integrationId] = {total: 0}
                    statusSummary[integrationId].total += Number(result.getValue(columns[2]))

                    let status = result.getValue(columns[1])
                    if(!statusSummary[integrationId].hasOwnProperty(status))
                        statusSummary[integrationId][status] = result.getValue(columns[2]);

                    return true;
                });
                return statusSummary;
            }
            let integrationHTML = (integration, summary) => {
                log.debug('integration', integration);
                log.debug('summary', summary);
                let url = Url.resolveRecord({recordType: 'customrecord_demo_per_integration', recordId: integration.id})
                let searchUrl = '/app/common/search/searchresults.nl?searchid=customsearch_demo_per_trans_ss&CUSTRECORD_demor_per_INTEGRATION=' + integration.id;
                let getCount = (status) => {
                    return (summary ? summary[status] || 0 : 0);
                }
                let failedCount = getCount(Status.FAILED);
                return (
                    '<div style="float: left; width: 50%; text-align: center; border-right: 1px solid #ccc;">' +
                        '<div style="border-top: 1px solid #ccc; padding: 1em;">' +
                            '<a href="' + url + '" target="_blank">' + integration.name + '</a>' +
                        '</div>' +
                        '<table style = "width:100%">' +
                            '<tr>' +
                                '<td style="padding: 1em; visibility: visible">' +
                                    '<h1 style="color: #333333; font-weight: 600; font-size: 17px;">Imported</h1>' +
                                    '<a style="font-size: 20px; font-weight: 600; color: #666666" href="' + searchUrl + '" target="_blank">' + (summary ? summary.total : 0) + '</a>' +
                                '</td>' +
                                '<td style="padding: 1em; visibility: visible">' +
                                    '<h1 style="color: #333333; font-weight: 600; font-size: 17px;">Failed</h1>' +
                                    '<a style="font-size: 20px; font-weight: 600; color: ' + (failedCount === 0 ? '#666666' :  '#c24242') + '" href="' + searchUrl + '&CUSTRECORD_MCIR_PER_STATUS=' + Status.FAILED +'" target="_blank">' + failedCount + '</a>' +
                                '</td>' +
                                '<td style="padding: 1em; visibility: visible">' +
                                    '<h1 style="color: #333333; font-weight: 600; font-size: 17px;">Processed</h1>' +
                                    '<a style="font-size: 20px; font-weight: 600; color: #048a06" href="' + searchUrl + '&CUSTRECORD_MCIR_PER_STATUS=' + Status.SUCCESS +'" target="_blank">' + getCount(Status.SUCCESS) + '</a>' +
                                '</td>' +
                                '<td style="padding: 1em; visibility: visible">' +
                                    '<h1 style="color: #333333; font-weight: 600; font-size: 17px;">Pending</h1>' +
                                    '<a style="font-size: 20px; font-weight: 600; color: #91bd4e" href="' + searchUrl + '&CUSTRECORD_MCIR_PER_STATUS=' + Status.PENDING +'" target="_blank">' + getCount(Status.PENDING) + '</a>' +
                                '</td>' +
                                '<td style="padding: 1em; visibility: visible">' +
                                '<h1 style="color: #333333; font-weight: 600; font-size: 17px;">Excluded</h1>' +
                                '<a style="font-size: 20px; font-weight: 600; color: #808080" href="' + searchUrl + '&CUSTRECORD_MCIR_PER_STATUS=' + Status.EXCLUDED +'" target="_blank">' + getCount(Status.EXCLUDED) + '</a>' +
                            '</td>' +
                            '</tr>' +
                        '</table>' +
                    '</div>');
            }

            let integrations = Custrecord.getMultiple({
                type:'customrecord_demo_per_integration',
                columns: {internalid: 'id', name: 'name'},
                filter: ['isinactive', 'is', 'F']
            });
            let statusSummary = getStatusSummary();

            let integrationsHTML = '';
            for(let i of integrations) integrationsHTML += integrationHTML(i, statusSummary[i.id] || null)

            let html = '<div id="integrationsPortletContainer">' + integrationsHTML + '</div>';

            params.portlet.html = html;


        }

        return {render}

    });
