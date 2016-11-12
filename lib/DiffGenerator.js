var log = require('./LogBridge');
var fs = require('fs');
var mkdirp = require('mkdirp');

var PageExtractor = require('./PageExtractor');
var Promise = require('promise');

// The http connection to linagora time management application
var LinagoraConnection = require('./LinagoraConnection');

var JsonRules = require('./JsonRules');
var moment = require('moment');

function DiffGenerator() {

    this.timeResults = {};
    this.planningResults = {};

    /**
     * @param object months an object that contains all days with morning and afternoon value.
     * @param object jsonObj contains all information ready to inject in the template
     * @param templateData the template to use for the declaration
     */
    this.generateDiff = function(jsonObj) {
        log.verbose('diff generator', "Generating diff");

        jsonRules = new JsonRules(jsonObj);
        var date = jsonRules.getStartDate();
        var date2 = jsonRules.getEndDate();


        var self = this;
        Object.keys(this.timeResults).forEach(function (key, value) {
            log.verbose('diff generator', 'Content of time array %j, %j', key, self.timeResults[key]);
        });
        Object.keys(this.planningResults).forEach(function (key, value) {
            log.verbose('diff generator', 'Content of planning array %j, %j', key, self.planningResults[key]);
        });

        var ifDiff = false;

        // Browsing the whole dates
        while (date.isBefore(date2)) {

            // The time value will contain project code or false if nothing supplied
            var timeValue = this.timeResults[date.format('DDMMYYYY')];

            // The planning value will contain full project description with project code
            var planningValue = this.planningResults[date.format('DDMMYYYY')];

            // Valid values
            if (timeValue !== undefined && timeValue.am && timeValue.pm && planningValue !== undefined) {
                // Doesn't match
                if (timeValue && planningValue.am.indexOf(timeValue.am) == -1) {
                    log.format('diff generator', '%j, diff détectée le matin, plannifié %j --> déclaré %j', date.format('DDMMYYYY'), planningValue.am, timeValue.am);
                    ifDiff = true;
                }
                if (timeValue && planningValue.pm.indexOf(timeValue.pm) == -1) {
                    log.format('diff generator', '%j, diff détectée l\'après midi, plannifié %j --> déclaré %j', date.format('DDMMYYYY'), planningValue.pm, timeValue.pm);
                    ifDiff = true;
                }
            }

            date.add(1, 'days');
        }

        // TODO improve to provide a csv or console output

        if (!ifDiff) {
            log.format('diff generator', 'aucune différence détectée');
        }
    };
}

/**
 * @param jsonObj the json input object containing all parameters
 * @param connectionProperties
 */
DiffGenerator.prototype.generate = function(jsonObj, connectionProperties) {

    var promises = [];
    var self = this;

    jsonRules = new JsonRules(jsonObj);
    this.date1 = jsonRules.getStartDate();
    this.date2 = jsonRules.getEndDate();

    jsonRules.checkDates();

    log.info('diff generator', 'Processing between dates: %j and %j', this.date1.format(), this.date2.format());

    var extractor = new PageExtractor();
    try {
        // We fetch the corresponding planning page
        extractor.extract(connectionProperties, moment(this.date1), moment(this.date2), false, jsonRules.getPlanningParser()).then(function(months) {
            self.planningResults = months;
            // We fetch the corresponding time page
            extractor.extract(connectionProperties, moment(self.date1), moment(self.date2), true, jsonRules.getTimeParser()).then(function(months2) {
                self.timeResults = months2;
                self.generateDiff(jsonObj);
            });
        });
    } catch (e) { log.error('diff generator', e); }
};

module.exports = DiffGenerator;
