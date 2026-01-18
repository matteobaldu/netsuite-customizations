/**
 * @NApiVersion 2.1
 */
define(['N/error', 'N/format', './connect/lib/ext/moment.min'], (Error, Format, moment) => {

    let obj = null;
    let integration = null;
    let mappings = null;

    const init = (_obj, _integration, _mappings) => {
        obj = _obj;
        integration = _integration;
        mappings = _mappings;
    }

    const hoursToMinutes = (time) => {
        time = Number(time);
        let hours = Math.floor(time);
        let minutes = time - hours;
        return hours * 60 + minutes * 60;
    }

    const minutesToHours = (minutes) => {
        return Math.floor(minutes / 60) + (minutes % 60 / 60)
    }

    const formatDate = (date) => {
        return moment(date).format('YYYYMMDD');
    }
    return {init, hoursToMinutes, minutesToHours, formatDate}

});
