var log = require('./LogBridge');
var fs = require('fs');
var mkdirp = require('mkdirp');

// The time parser
var TimeManagementParser = require('./TimeManagementParser');
var timeParser = new TimeManagementParser();

// The planning parser
var PlanningParser = require('./PlanningParser');
var planningParser = new PlanningParser();

var PageExtractor = require('./PageExtractor');
var Promise = require('promise');

// The http connection to linagora time management application
var LinagoraConnection = require('./LinagoraConnection');

var JsonRules = require('./JsonRules');
var moment = require('moment');

function DiffGenerator() {

    var self = this;
    var timeResults = {};
    var planningResults = {};

    /**
     * @param object months an object that contains all days with morning and afternoon value.
     * @param object jsonObj contains all information ready to inject in the template
     * @param templateData the template to use for the declaration
     */
    this.generateDiff = function(jsonObj) {
        log.verbose('diff generator', "Generating declarations");

        jsonRules = new JsonRules(jsonObj);
        var date = jsonRules.getStartDate();
        var date2 = jsonRules.getEndDate();

        // Browsing the whole dates
        while (date.isBefore(date2)) {
            // TODO use timeResults and planningResults
            var storedValue = months[date.format('DDMMYYYY')];
            log.verbose('diff generator', 'Managing ' + date.format('DDMMYYYY'));

            // TODO Add "intelligence here"

            if (storedValue === undefined) {
                log.verbose('diff generator', 'Nothing to perform on this date');
                storedValue = {};
                storedValue.am = false;
                storedValue.pm = false;
            }
            date.add(1, 'days');
        }
    }
}

/**
 * @param jsonObj the json input object containing all parameters
 * @param connectionProperties
 */
DiffGenerator.prototype.generate = function(jsonObj, connectionProperties) {

    var connection = new LinagoraConnection(connectionProperties.user, connectionProperties.password);

    var promises = [];

    jsonRules = new JsonRules(jsonObj);
    this.date1 = jsonRules.getStartDate();
    this.date2 = jsonRules.getEndDate();

    jsonRules.checkDates();

    log.info('diff generator', 'Processing between dates: %j and %j', this.date1.format(), this.date2.format());

    var extractor = new PageExtractor();

    try {
        promises.push(
            // We fetch the corresponding planning page
            extractor.extract(connectionProperties, this.date1, this.date2, false, jsonRules.getPlanningParser()).then(function(months) {
                self.planningResults = months;
            })
        );
        promises.push(
            // We fetch the corresponding time page
            extractor.extract(connectionProperties, this.date1, this.date2, true, jsonRules.getTimeParser()).then(function(months) {
                self.timeResults = months;
            })
        );
    } catch (e) { log.error('diff generator', e); }

    // We for all promises to terminate
    Promise.all(promises).then(function() {
        // We can now generate files
        log.verbose('diff generator', 'we finished all promises');
        try {
        log.verbose('diff generator', 'we finished all promises');
            self.generateDiff(jsonObj);
        log.verbose('diff generator', 'we finished all promises');
        } catch (e) { log.message(e); }

    });
}

module.exports = DiffGenerator;
