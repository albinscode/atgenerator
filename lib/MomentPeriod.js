var moment = require('moment');

/**
 * TODO It could be interesting to public this tiny module to npmjs.org
 * @param the datestring to interpret.
 * @return
 * If the dateString is of the form [+/-][period], an object will be returned with two moment objects.
 * If the dateString is an date, same object with two same objects wille be returned.
 * If no valid dateString provided, undefined will be returned.
 */
moment.period = function (dateString) {
    var startDate = dateString;
    var endDate = dateString;

    if (typeof dateString == 'string' && dateString !== '' ) {

        var period = dateString;
        var modifierNumber = 0;

        // 1 for addition, -1 for substration
        var modifierOperation = 1;
        var split = dateString.split('+');
        if (split.length == 2) {
            modifierNumber = parseInt(split[1]);
            period = split[0];
        }
        // Substration case
        else {
            split = dateString.split('-');
            if (split.length == 2) {
                modifierOperation = -1;
                modifierNumber = parseInt(split[1]);
                period = split[0];
            }
        }

        if (period == 'week') {
            startDate = moment().add(modifierNumber * modifierOperation, 'weeks').isoWeekday(1);
            endDate = moment().add(modifierNumber * modifierOperation, 'weeks').isoWeekday(5);
        }
        else if (period == 'month') {
            startDate = moment().add(modifierNumber * modifierOperation, 'months').date(1);
            endDate = moment().add(modifierNumber * modifierOperation, 'months').add(1, 'months').date(0);
        }
        else if (period == 'year') {
            startDate = moment().add(modifierNumber * modifierOperation, 'years').month(0).day(1);
            endDate = moment().add(modifierNumber * modifierOperation, 'years').month(11).add(1, 'months').day(0);
        }

        return { startDate: startDate, endDate: endDate };
    } else {
        return undefined;
    }
};
