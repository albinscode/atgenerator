var EventEmitter = require('events').EventEmitter;
var util = require('util');
var log = require('./LogBridge.js');
var moment = require('moment');

/**
 * @param float initialActivityTotal the initial amount of days to start with.
 * @param ifManageWeekEnds if true we track down the week ends
 * @param projectCode the project code to use to filter data is provided.
 */
function ActivityProcessorEmitter(initialActivityTotal, ifManageWeekEnds, projectCode) {

    if (initialActivityTotal === undefined) initialActivityTotal = 0;
    this.activityTotal = initialActivityTotal;

    if (ifManageWeekEnds === undefined) ifManageWeekEnds = false;
    this.ifManageWeekEnds = ifManageWeekEnds;

    if (projectCode !== undefined) {
        this.projectCode = projectCode;
    } else {
        this.projectCode = null;
    }

    this.isFilterOk = function(value) {
        var result = true;

        if (this.projectCode !== null) {
            if (typeof value !== 'string') {
                result = false;
            } else {
                result = value.indexOf(this.projectCode) !== -1;
            }
        }
        return result;
    };
}

util.inherits(ActivityProcessorEmitter, EventEmitter);

ActivityProcessorEmitter.EVENT_NO_DATA = 'nodata';

ActivityProcessorEmitter.EVENT_FIRST_DAY_OF_MONTH = 'firstdayofmonth';
ActivityProcessorEmitter.EVENT_LAST_DAY_OF_MONTH = 'lastdayofmonth';

ActivityProcessorEmitter.EVENT_FIRST_DAY_OF_WEEK = 'firstdayofweek';
ActivityProcessorEmitter.EVENT_LAST_DAY_OF_WEEK = 'lastdayofweek';
ActivityProcessorEmitter.EVENT_LAST_DAY_OF_WEEK_NO_ACTIVITY = 'lastdayofweeknoactivity';

ActivityProcessorEmitter.EVENT_MORNING_DAY = 'morning';
ActivityProcessorEmitter.EVENT_AFTERNOON_DAY = 'afternoon';
ActivityProcessorEmitter.EVENT_MORNING_DAY_STRICT = 'morningstrict';
ActivityProcessorEmitter.EVENT_AFTERNOON_DAY_STRICT = 'afternoonstrict';

ActivityProcessorEmitter.EVENT_FULL_DAY = 'fullday';
ActivityProcessorEmitter.EVENT_HALF_DAY = 'halfday';
ActivityProcessorEmitter.EVENT_ZERO_DAY = 'zeroday';

ActivityProcessorEmitter.EVENT_ONE_DAY = 'oneday';
ActivityProcessorEmitter.EVENT_ONE_DAY_STRICT = 'onedaystrict';

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
        var cumulatedWeekTotal = 0;
        var previousMonthTotal = 0;

        // Due to the loop condition (date + 1, to avoid having date1 > date2)
        date2.hours(23).minutes(59).seconds(59);
        while (date1.isBefore(date2)) {
            // Managing start and end of month
            if (date1.date() == 1) {
                monthTotal = 0;
                previousMontotal = this.activityTotal;
                this.emit(ActivityProcessorEmitter.EVENT_FIRST_DAY_OF_MONTH, date1);
            }
            // Managing week end case
            if (date1.day() == 6 || date1.day() === 0) {

                // Saturday event
                if (date1.day() == 6) {
                    this.emit(ActivityProcessorEmitter.EVENT_SATURDAY, date1);
                    this.emit(ActivityProcessorEmitter.EVENT_ONE_DAY_STRICT, null, date1, null);
                }

                // Sunday event
                if (date1.day() === 0) {
                    this.emit(ActivityProcessorEmitter.EVENT_SUNDAY, date1);
                    this.emit(ActivityProcessorEmitter.EVENT_ONE_DAY_STRICT, null, date1, null);
                }
            }
            // Managing working days
            else {
                var storedValue = months[date1.format('DDMMYYYY')];
                log.verbose('processor', 'Processing current %j before %j', date1.format('DDMMYYYY'), date2.format('DDMMYYYY'));

                if (storedValue === undefined) {
                    log.verbose('processor', 'Nothing to perform on this date');
                    storedValue = {};
                    storedValue.am = false;
                    storedValue.pm = false;
                    this.emit(ActivityProcessorEmitter.EVENT_NO_DATA);
                }
                var numberOfDay = date1.day();
                var dayOfTheMonth = date1.date();
                // We start a new week
                if (numberOfDay == 1) {
                    firstDateOfWeek = moment(date1);
                    days = {};
                    cumulatedWeekTotal = parseFloat(this.activityTotal);
                    this.emit(ActivityProcessorEmitter.EVENT_FIRST_DAY_OF_WEEK, moment(date1));
                }
                // Number of days consumed
                if (storedValue.am && this.isFilterOk(storedValue.am)) {
                    this.activityTotal = parseFloat(this.activityTotal) + 0.5;
                }
                if (storedValue.pm && this.isFilterOk(storedValue.pm)) {
                    this.activityTotal = parseFloat(this.activityTotal) + 0.5;
                }
                log.verbose('processor', 'Activity total %j', this.activityTotal);

                // The morning and afternoon event is always sent
                this.emit(ActivityProcessorEmitter.EVENT_MORNING_DAY_STRICT, storedValue.am, moment(date1), numberOfDay, dayOfTheMonth);
                this.emit(ActivityProcessorEmitter.EVENT_AFTERNOON_DAY_STRICT, storedValue.pm, moment(date1), numberOfDay, dayOfTheMonth);

                // Processing morning and afternoon only if different
                if (storedValue.am != storedValue.pm) {
                    this.emit(ActivityProcessorEmitter.EVENT_MORNING_DAY, storedValue.am, moment(date1), numberOfDay, dayOfTheMonth);
                    this.emit(ActivityProcessorEmitter.EVENT_AFTERNOON_DAY, storedValue.pm, moment(date1), numberOfDay, dayOfTheMonth);
                }
                // Otherwise we send a full day
                else {
                    this.emit(ActivityProcessorEmitter.EVENT_ONE_DAY, storedValue.am, date1, numberOfDay, dayOfTheMonth);
                }
                // Day is always processed
                this.emit(ActivityProcessorEmitter.EVENT_ONE_DAY_STRICT, storedValue.am, date1, numberOfDay, dayOfTheMonth);

                // Convenient events thrown when an amount of work is done (full, half or none).
                // This is without knowing the morning or afternoon event.
                // This is to be used only if you are expecting one distinct activity project
                if (storedValue.am && this.isFilterOk(storedValue.am)) {
                    if (storedValue.pm && this.isFilterOk(storedValue.pm) && storedValue.am == storedValue.pm) {
                        this.emit(ActivityProcessorEmitter.EVENT_FULL_DAY, storedValue.am, date1, numberOfDay, dayOfTheMonth);
                    } else {
                        this.emit(ActivityProcessorEmitter.EVENT_HALF_DAY, storedValue.am, date1, numberOfDay, dayOfTheMonth);
                    }
                } else {
                    if (storedValue.pm && this.isFilterOk(storedValue.pm)) {
                        this.emit(ActivityProcessorEmitter.EVENT_HALF_DAY, storedValue.pm, date1, numberOfDay, dayOfTheMonth);
                    } else {
                        this.emit(ActivityProcessorEmitter.EVENT_ZERO_DAY, '', date1, numberOfDay, dayOfTheMonth);
                    }
                }
                if (date1.day() == 5) {
                // See if we have to generate the doc
                    if ((parseFloat(this.activityTotal) - cumulatedWeekTotal) > 0) {
                        log.verbose('processor', 'End of week there is some activity.');
                        this.emit(ActivityProcessorEmitter.EVENT_LAST_DAY_OF_WEEK, this.activityTotal - cumulatedWeekTotal, date1);
                    } else {
                        log.verbose('processor', 'No activity this week');
                        this.emit(ActivityProcessorEmitter.EVENT_LAST_DAY_OF_WEEK_NO_ACTIVITY, this.activityTotal - cumulatedWeekTotal, date1);
                    }
                }
            }
            if (date1.date() == date1.clone().endOf('month').date()) {
                var monthTotal = this.activityTotal - previousMonthTotal;
                this.emit(ActivityProcessorEmitter.EVENT_LAST_DAY_OF_MONTH, monthTotal, date1);
            }
            date1.add(1, 'days');
        }
    }
    catch (e) {
        log.error(e);
    }
};


module.exports = ActivityProcessorEmitter;
