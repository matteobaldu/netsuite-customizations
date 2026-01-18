/**
 * @NApiVersion 2.0
 * @NScriptType clientScript
 * @NModuleScope Public
 *
 * Version    Date          Author                 Remarks
 * 1.00       MAY 19        matteo balduccio       Initial Commit
 *
 */

define(['N/url', 'N/ui/message', 'N/format', 'N/runtime'],

  function (url, message, format, runtime) {
    let suitelet = null;

    function pageInit(context) {
      let logTitle = 'pageInit';

      try {
        suitelet = context.currentRecord;

      } catch (error) {
        console.log(logTitle, error.message);
      }
    }


    //Pagination - fieldchange function to update the list of Suitelet
    function fieldChanged(context) {
      let logTitle = 'fieldChanged';
      try {

        if (context.fieldId == 'custpage_pageid') {

          let pageId = parseInt(suitelet.getValue({
            fieldId: 'custpage_pageid'
          }));

          let estimatedEdited = suitelet.getValue({
            fieldId: 'custpage_estimatesqueue'
          });

          let parameters = {
            custparam_page: pageId,
            custparam_estimatesEdited: estimatedEdited
          };

          let output = url.resolveScript({
            scriptId: 'customscript_acs_sl_estimate_without_so',
            deploymentId: 'customdeploy1',
            returnExternalUrl: false,
            params: parameters
          });

          window.onbeforeunload = null;
          window.open(output, '_self');

        }

        if ((context.fieldId == 'custpage_allrecords_select')) {

          let currIndex = suitelet.getCurrentSublistIndex({
            sublistId: 'custpage_allrecords'
          });

          let checked = suitelet.getSublistValue({
            sublistId: 'custpage_allrecords',
            fieldId: 'custpage_allrecords_select',
            line: currIndex
          });

          let internalId = suitelet.getSublistValue({
            sublistId: 'custpage_allrecords',
            fieldId: 'custpage_allrecords_internalid',
            line: currIndex
          });

          let arrCheckedEstimates = [];
          let editedEstimates = suitelet.getValue({
            fieldId: 'custpage_estimatesqueue'
          });

          if (!isEmpty(editedEstimates)) {
            arrCheckedEstimates = JSON.parse(editedEstimates);
          }

          let estimate = { "internalId": internalId };
          let estimateUpdatedIndex = getEstimatesfromArray(arrCheckedEstimates, internalId);

          //Different logic if check or uncheck
          if (checked) {
            if (estimateUpdatedIndex < 0) {
              arrCheckedEstimates.push(estimate);
            }
          } else {
            if (estimateUpdatedIndex >= 0) {
              arrCheckedEstimates.splice(estimateUpdatedIndex, 1);
            }
          }

          suitelet.setValue({
            fieldId: 'custpage_estimatesqueue',
            value: JSON.stringify(arrCheckedEstimates)
          });
        }


        if ((context.fieldId == 'custpage_selectall')) {

          let selectAllValue = suitelet.getValue({
            fieldId: 'custpage_selectall'
          });

          if (selectAllValue) {
            selectAllButton();
          } else {
            unSelectAllButton();
          }
        }

      } catch (error) {
        console.log(logTitle, error.toString());
      }
    }

    function getEstimatesfromArray(arrCheckedEstimates, internalId) {
      let logTitle = 'getEstimatesfromArray';
      try {
        for (let i = 0; i < arrCheckedEstimates.length; i++) {
          let estimate = arrCheckedEstimates[i];
          if (estimate.internalId == internalId)
            return i;
        }
      } catch (error) {
        console.log(logTitle, error.message);
      }
      return -1;
    }

    //searchEstimates - 
    function searchEstimates() {
      let logTitle = 'searchEstimates';
      try {

        let name = suitelet.getValue({
          fieldId: 'custpage_name'
        });

        let dateFrom = suitelet.getValue({
          fieldId: 'custpage_datefrom'
        });

        dateFrom = (dateFrom ? format.format({ type: format.Type.DATE, value: new Date(dateFrom) }) : null);

        let dateTo = suitelet.getValue({
          fieldId: 'custpage_dateto'
        });

        dateTo = (dateTo ? format.format({ type: format.Type.DATE, value: new Date(dateTo) }) : null);

        let estimatedEdited = suitelet.getValue({
          fieldId: 'custpage_estimatesqueue'
        });

        let savedSearchFilters = { "name": name, "dateFrom": dateFrom, "dateTo": dateTo };

        let parameters = {
          custparam_savedSearchFilters: JSON.stringify(savedSearchFilters),
          custparam_estimatesEdited: estimatedEdited
        };

        let stSuiteletUrl = url.resolveScript({
          scriptId: 'customscript832',
          deploymentId: 'customdeploy1',
          returnExternalUrl: false,
        });

        let suiteletUrl = url.format(stSuiteletUrl, parameters);
        window.ischanged = false;
        window.open(suiteletUrl, '_self');

      } catch (error) {
        console.log(logTitle, error.message);
      }
    }

    //Submit M/R call - Create PO of Estimates
    function createSOs(context) {
      let logTitle = 'createSOs';
      try {
        let estimatesQueue = suitelet.getValue({
          fieldId: 'custpage_estimatesqueue'
        });

        if (isEmpty(estimatesQueue)) {
          alert("No Estimates have been checked yet");
          return false;
        } else {
          //alert(JSON.stringify(estimatesQueue));

          
          arrEditedWorkOrders = JSON.parse(estimatesQueue);

          let estimatesCount = arrEditedWorkOrders.length;
          let myMsg = message.create({
            title: "Confirmation",
            message: estimatesCount +" Estimates are being processed. The page will be redirected to Sales Order list after a few seconds.",
            type: message.Type.CONFIRMATION
          });
        
          myMsg.show({
            duration: 10000
          });
          
          setTimeout(10000);
          

          return true;
        }


      } catch (error) {
        console.log(logTitle, error.message);
      }
    }

    /*** Function that will unmark all the checkbox in the suitelet sublist ***/
    function unSelectAllButton(context) {
      let stLogTitle = 'unSelectAllButton';
      try {
        //get and store the current page suitelet length of the suitelet sublist lines
        let sublistLength = suitelet.getLineCount({
          sublistId: 'custpage_allrecords'
        });
        //traverse each suitelet sublist lines on the current page
        for (let intLnCtr = 0; intLnCtr < sublistLength; intLnCtr++) {
          //select the current suitelet sublist line
          suitelet.selectLine({
            sublistId: 'custpage_allrecords',
            line: intLnCtr
          });
          //set the suitelet sublist checkbox column to uncheck
          suitelet.setCurrentSublistValue({
            sublistId: 'custpage_allrecords',
            fieldId: 'custpage_allrecords_select',
            value: false
          });
          //commit the changes
          suitelet.commitLine({
            sublistId: 'custpage_allrecords'
          });

          let internalId = suitelet.getSublistValue({
            sublistId: 'custpage_allrecords',
            fieldId: 'custpage_allrecords_internalid',
            line: intLnCtr
          });

          let arrCheckedEstimates = [];
          let editedEstimates = suitelet.getValue({
            fieldId: 'custpage_estimatesqueue'
          });

          if (!isEmpty(editedEstimates)) {
            arrCheckedEstimates = JSON.parse(editedEstimates);
          }

          let estimateUpdatedIndex = getEstimatesfromArray(arrCheckedEstimates, internalId);

          //Different logic if check or uncheck
          if (estimateUpdatedIndex >= 0) {
            arrCheckedEstimates.splice(estimateUpdatedIndex, 1);
          }
        }
        suitelet.setValue({
          fieldId: 'custpage_estimatesqueue',
          value: JSON.stringify(arrCheckedEstimates)
        });
      } catch (error) {
        console.log(stLogTitle, 'Error: ' + error);
      }
    }
    /*** Function that will mark all the checkbox in the suitelet sublist ***/
    function selectAllButton(context) {
      let stLogTitle = 'selectAllButton';
      try {
        //get and store the current page suitelet length of the suitelet sublist lines
        let sublistLength = suitelet.getLineCount({
          sublistId: 'custpage_allrecords'
        });
        //traverse each suitelet sublist lines on the current page
        for (let intLnCtr = 0; intLnCtr < sublistLength; intLnCtr++) {
          //select the current suitelet sublist line
          suitelet.selectLine({
            sublistId: 'custpage_allrecords',
            line: intLnCtr
          });
          //set the suitelet sublist checkbox column to uncheck
          let stChecked = suitelet.getCurrentSublistValue({
            sublistId: 'custpage_allrecords',
            fieldId: 'custpage_allrecords_select'
          });
          if (stChecked) {
            continue;
          }
          //set the suitelet sublist checkbox column to check
          suitelet.setCurrentSublistValue({
            sublistId: 'custpage_allrecords',
            fieldId: 'custpage_allrecords_select',
            value: true
          });
          //commit the changes
          suitelet.commitLine({
            sublistId: 'custpage_allrecords'
          });

          //Get internalId to push in estimates queue
          let internalId = suitelet.getSublistValue({
            sublistId: 'custpage_allrecords',
            fieldId: 'custpage_allrecords_internalid',
            line: intLnCtr
          });
          let arrCheckedEstimates = [];
          let editedEstimates = suitelet.getValue({
            fieldId: 'custpage_estimatesqueue'
          });
          if (!isEmpty(editedEstimates)) {
            arrCheckedEstimates = JSON.parse(editedEstimates);
          }
          let estimate = { "internalId": internalId };
          let estimateUpdatedIndex = getEstimatesfromArray(arrCheckedEstimates, internalId);
          if (estimateUpdatedIndex < 0) {
            arrCheckedEstimates.push(estimate);
          }
        }
        // Set aux variable with all the estimates checked
        suitelet.setValue({
          fieldId: 'custpage_estimatesqueue',
          value: JSON.stringify(arrCheckedEstimates)
        });
      } catch (error) {
        console.log(stLogTitle, 'Error: ' + error);
      }
    }

    //checks if the value is empty
    function isEmpty(value) {
      let logTitle = 'isEmpty';
      try {
        if (value == null || value == '' || (!value) || value == 'undefined') {
          return true;
        }
        return false;
      } catch (error) {
        console.log(logTitle, error);
      }
    }

    return {
      pageInit: pageInit,
      saveRecord: createSOs,
      fieldChanged: fieldChanged,
      searchEstimates: searchEstimates
    };

  });