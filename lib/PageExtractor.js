var log = require('./LogBridge');

// The http connection to linagora time management application
var LinagoraConnection = require('./LinagoraConnection');
var Promise = require('promise');

var moment = require('moment');

function PageExtractor() {

    var self = this;

    var connection = null;

    /*
     * Converts the month array to an object containing keys with DDMMYYYY and a structure with am and pm properties.
     * @param object
     * @param format
     * @param month
     * @param shiftArray the number of elements to add before the array to avoid week end days.
    */
    this.convertToObject = function(object, format, month, shiftArray) {
        if (month == null) return;

        month.map(function(value, key) {
            var day = (((key + shiftArray) / 2 >> 0) + 1);
            if (day < 10) {
                day = '0' + day;
            }
            var keyString = day + format;
            var valueObj = object[keyString];

            // The first time we are storing value, so it is "am" value
            if (valueObj === undefined) {
                valueObj = {};
                valueObj.am = value;
                object[keyString] = valueObj;
            }
            // The second time, this is "pm" value
            else {
                valueObj.pm = value;
            }

            log.verbose('page extractor', 'key %j, value %j, day %j, format %j, index %j', key ,value, day, format, (key / 2 >> 0));
        });
    }

    /**
     * @param connectionProperties
     */
    this.getConnection = function(connectionProperties) {
        if (this.connection == null) {
            this.connection = new LinagoraConnection(connectionProperties);
        }
        return this.connection;
    }

}


/**
 * @param connectionProperties contains at least 'user' and 'password'.
 * @param moment date1
 * @param moment date2
 * @param boolean ifTimeManagement true if extraction is to be done on time management, false if for planning.
 * @param parser the parser to use to parse html data.
 * @return a promise with an associated array listing all days activity.
 */
PageExtractor.prototype.extract = function (connectionProperties, date1, date2, ifTimeManagement, parser) {

    var self = this;

    if (ifTimeManagement === undefined) {
       ifTimeManagement = true;
    }
    log.info('page extractor', 'Processing between dates: %j and %j', date1.format(), date2.format());
    log.info('page extractor', 'Using account %j', connectionProperties.user);

    var months = {};

    var promises = [];

    // We build an array of promises
    while (date1.isBefore(date2)) {
        try {
            promises.push(
                // We fetch the corresponding pages
                self.getConnection(connectionProperties).getPage(date1.month() + 1, date1.year(), ifTimeManagement).then(function(data) {

                    // We now know the worked days for this specific project and month
                    // Note: we cannot use date1 as far as it is changing during the loop and we are async.
                    // So most of the time it was the last date and we lost all the previous dates.
                    var datePromise = moment();
                    datePromise.date(1);
                    datePromise.month(data.month - 1);
                    datePromise.year(data.year);
                    var datePromiseFormat = datePromise.format('MMYYYY');
                    log.info('page extractor', 'Parsing month %j', datePromiseFormat);

                    // Manage the week ends that will be ignored if the month begin by a saturday or sunday.
                    var shiftArray = 0;
                    // TODO improve this processing
                    // This is specific to planning management process. If the month starts with a week end the array will be
                    // created right after the week end. This is the opposite with the time management parser.
                    if (!ifTimeManagement) {
                        var dateCheck = moment(datePromise);
                        if (dateCheck.day() == 6) shiftArray = shiftArray + 4;
                        if (dateCheck.day() === 0) shiftArray = shiftArray + 2;
                    }
                    log.verbose('page extractor', 'Shift array of %j for day %j', shiftArray, datePromise.day());
                    self.convertToObject(months, datePromiseFormat, parser.parse(data.htmlContent), shiftArray);
                })
            );
        } catch (e) { log.error('page extractor', e); }

        var originalDate1 = moment(date1);
        date1.add(1, 'months');

        // We set the date1 to the first day of month instead of adding a full month
        if (date2.month() - originalDate1.month() == 1 && date1.isAfter(date2)) {
            log.info('page extractor', 'We are between two months for a duration < 1 month');
            date1.date(1);
        }
        log.verbose('page extractor', 'another iteration on another month');
    }

    // We wait for all promises to terminate
    return Promise.all(promises).then(function() {
        // We can now generate files
        log.verbose('page extractor', 'The month object is %j', months);
        log.verbose('page extractor', 'we finished all promises');
        return new Promise(function (resolve, reject) {
            resolve(months);
        });
    });
}

module.exports = PageExtractor;
