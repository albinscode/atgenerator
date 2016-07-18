var EventEmitter = require('events').EventEmitter;
var util = require('util');
var log = require('./LogBridge.js');
var moment = require('moment');

/**
 * @param float initialActivityTotal the initial amount of days to start with.
 * @param ifManageWeekEnds if true we track down the week ends
 */
function ActivityProcessorEmitter(initialActivityTotal, ifManageWeekEnds) {

    if (initialActivityTotal === undefined) initialActivityTotal = 0;
    this.activityTotal = initialActivityTotal;

    if (ifManageWeekEnds === undefined) ifManageWeekEnds = false;
    this.ifManageWeekEnds = ifManageWeekEnds;
}

util.inherits(ActivityProcessorEmitter, EventEmitter);

ActivityProcessorEmitter.EVENT_NO_DATA = 'nodata';
ActivityProcessorEmitter.EVENT_FIRST_DAY_OF_WEEK = 'firstdayofweek';
ActivityProcessorEmitter.EVENT_LAST_DAY_OF_WEEK = 'lastdayofweek';
ActivityProcessorEmitter.EVENT_LAST_DAY_OF_WEEK_NO_ACTIVITY = 'lastdayofweeknoactivity';

ActivityProcessorEmitter.EVENT_MORNING_DAY = 'morning';
ActivityProcessorEmitter.EVENT_AFTERNOON_DAY = 'afternoon';

ActivityProcessorEmitter.EVENT_FULL_DAY = 'fullday';
ActivityProcessorEmitter.EVENT_HALF_DAY = 'halfday';
ActivityProcessorEmitter.EVENT_ZERO_DAY = 'zeroday';

ActivityProcessorEmitter.EVENT_ONE_DAY = 'oneday';

ActivityProcessorEmitter.EVENT_SATURDAY = 'saturday';
ActivityProcessorEmitter.EVENT_SUNDAY = 'sunday';

/**
 * @param date1 moment the starting date for processing.
 * @param date2 moment the ending date for processing.
 * @param object months an object that contains all days with morning and afternoon value.
 */
ActivityProcessorEmitter.prototype.process = function(months, date1, date2) {
    try {
        log.verbose('processor', "Processing activities %j %j", date1, date2);
        var days = {};
        var firstDateOfWeek = null;
        var weekTotal = 0;
        while (date1.isBefore(date2)) {
            var storedValue = months[date1.format('DDMMYYYY')];
            log.verbose('processor', 'Processing ' + date1.format('DDMMYYYY'));
            if (storedValue === undefined) {
                log.verbose('processor', 'Nothing to perform on this date');
                storedValue = {};
                storedValue.am = false;
                storedValue.pm = false;
                this.emit(ActivityProcessorEmitter.EVENT_NO_DATA);
            }
            var numberOfDay = date1.day();
            // We start a new week
            if (numberOfDay == 1) {
                firstDateOfWeek = moment(date1);
                days = {};
                weekTotal = parseFloat(this.activityTotal);
                this.emit(ActivityProcessorEmitter.EVENT_FIRST_DAY_OF_WEEK, date1);
            }
            // Number of days consumed
            if (storedValue.am) {
                this.activityTotal = parseFloat(this.activityTotal) + 0.5;
            }
            if (storedValue.pm) {
                this.activityTotal = parseFloat(this.activityTotal) + 0.5;
            }
            log.verbose('processor', this.activityTotal);

            // Processing morning and afternoon
            this.emit(ActivityProcessorEmitter.EVENT_MORNING_DAY, storedValue.am, date1, numberOfDay);
            this.emit(ActivityProcessorEmitter.EVENT_AFTERNOON_DAY, storedValue.pm, date1, numberOfDay);

            // Processing one day
            this.emit(ActivityProcessorEmitter.EVENT_ONE_DAY, date1);

            // Convenient events thrown when an amount of work is done (full, half or none).
            if (storedValue.am) {
                if (storedValue.pm) {
                    this.emit(ActivityProcessorEmitter.EVENT_FULL_DAY, date1, numberOfDay);
                } else {
                    this.emit(ActivityProcessorEmitter.EVENT_HALF_DAY, date1, numberOfDay);
                }
            } else {
                if (storedValue.pm) {
                    this.emit(ActivityProcessorEmitter.EVENT_HALF_DAY, date1, numberOfDay);
                } else {
                    this.emit(ActivityProcessorEmitter.EVENT_ZERO_DAY, date1, numberOfDay);
                }
            }

            // End of a working week
            if (date1.day() == 5) {
                // See if we have to generate the doc
                if ((parseFloat(this.activityTotal) - weekTotal) > 0) {
                    log.verbose('processor', 'End of week there is some activity.');
                    this.emit(ActivityProcessorEmitter.EVENT_LAST_DAY_OF_WEEK, this.activityTotal - weekTotal, date1);
                } else {
                    log.verbose('processor', 'No activity this week');
                    this.emit(ActivityProcessorEmitter.EVENT_LAST_DAY_OF_WEEK_NO_ACTIVITY, this.activityTotal - weekTotal, date1);
                }

                // Saturday event
                date1.add(1, 'days');
                this.emit(ActivityProcessorEmitter.EVENT_SATURDAY, date1);
                this.emit(ActivityProcessorEmitter.EVENT_ONE_DAY, date1);

                // Sunday event
                date1.add(1, 'days');
                this.emit(ActivityProcessorEmitter.EVENT_SUNDAY, date1);
                this.emit(ActivityProcessorEmitter.EVENT_ONE_DAY, date1);
            }
            date1.add(1, 'days');
        }
    }
    catch (e) {
        log.error(e);
    }
}


module.exports = ActivityProcessorEmitter;
