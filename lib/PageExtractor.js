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
    */
    this.convertToObject = function(object, format, month) {
        if (month == null) return;
        month.map(function(value, key) {
            var day = ((key / 2 >> 0) + 1);
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

            log.verbose('page extractor', '%j %j %j %j %j', key ,value, day, format, (key / 2 >> 0));
        });
    }

    /**
     * @param user the user to access the obm account
     * @param password the password to access the obm account
     */
    this.getConnection = function(user, password) {
        if (this.connection == null) {
            this.connection = new LinagoraConnection(user, password);
        }
        return this.connection;
    }

}


/**
 * @param user the user to access the obm account
 * @param password the password to access the obm account
 * @param moment date1
 * @param moment date2
 * @param boolean ifTimeManagement true if extraction is to be done on time management, false if for planning.
 * @param parser the parser to use to parse html data.
 * @return a promise with an associated array listing all days activity.
 */
PageExtractor.prototype.extract = function (user, password, date1, date2, ifTimeManagement, parser) {

    var self = this;

    if (ifTimeManagement === undefined) {
       ifTimeManagement = true;
    }
    log.info('page extractor', 'Processing between dates: %j and %j', date1.format(), date2.format());
    log.info('page extractor', 'Using account %j', user);

    var months = {};

    var promises = [];

    // We get the cookie
    return this.getConnection(user, password).getCookie().then(function() {

        // We build an array of promises
        while (date1.isBefore(date2)) {
            try {
                promises.push(
                    // We fetch the corresponding pages
                    self.getConnection(user, password).getPage(date1.month() + 1, date1.year(), ifTimeManagement).then(function(data) {

                        // We now know the worked days for this specific project and month
                        // Note: we cannot use date1 as far as it is changing during the loop and we are async.
                        // So most of the time it was the laste date and we lost all the previous dates.
                        var datePromise = moment();
                        datePromise.month(data.month - 1);
                        datePromise.year(data.year);
                        var datePromiseFormat = datePromise.format('MMYYYY');
                        log.info('page extractor', 'Parsing month %j', datePromiseFormat);
                        self.convertToObject(months, datePromiseFormat, parser.parse(data.htmlContent));
                    })
                );
            } catch (e) { log.error('page extractor', e); }
            date1.add(1, 'months');
            log.verbose('page extractor', 'another iteration on another month');
        }

        // We wait for all promises to terminate
        return Promise.all(promises).then(function() {
            // We can now generate files
            log.verbose('page extractor', months);
            log.verbose('page extractor', 'we finished all promises');
            return new Promise(function (resolve, reject) {
                resolve(months);
            });
        });
    });
}

module.exports = PageExtractor;
