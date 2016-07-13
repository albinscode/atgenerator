var log = require('./LogBridge');
var fs = require('fs');
var mkdirp = require('mkdirp');

var PageExtractor = require('./PageExtractor');

var PlanningParser = require('./PlanningParser');

// To intercept on month activity data
var ActivityProcessorEmitter = require('./ActivityProcessor');

var moment = require('moment');

function PlanningGenerator() {

    var self = this;
    var date1, date2 = null;

    /**
     * @param object months an object that contains all days with morning and afternoon value.
     * @param object jsonObj contains all information ready to inject in the template
     */
    this.generateCsv = function(months, jsonObj) {
        try {
            log.verbose('planning generator', "Generating planning for %j with %j", jsonObj.worker, jsonObj.activityProject);

            var processor = new ActivityProcessorEmitter();
            var csvValues = '';
            var csvHeaders = '';

            // When a new day is entered (wether working or non working days)
            processor.on(ActivityProcessorEmitter.EVENT_ONE_DAY, function(date) {
                csvHeaders += date.format(jsonObj.patternDateFormat) + jsonObj.csvSeparator;
            });
            // When a full day is planned
            processor.on(ActivityProcessorEmitter.EVENT_FULL_DAY, function(date, numberOfDay) {
                csvValues += '1' + jsonObj.csvSeparator;
            });
            // When a half day is planned
            processor.on(ActivityProcessorEmitter.EVENT_HALF_DAY, function(date, numberOfDay) {
                csvValues += '0.5' + jsonObj.csvSeparator;
            });
            // When no day is planned
            processor.on(ActivityProcessorEmitter.EVENT_ZERO_DAY, function(date, numberOfDay) {
                csvValues += '0' + jsonObj.csvSeparator;
            });
            // Saturday event
            processor.on(ActivityProcessorEmitter.EVENT_SATURDAY, function(date) {
                csvValues += '0' + jsonObj.csvSeparator;
            });
            // Sunday event
            processor.on(ActivityProcessorEmitter.EVENT_SUNDAY, function(date) {
                csvValues += '0' + jsonObj.csvSeparator;
            });

            processor.process(months, moment(jsonObj.startDate), moment(jsonObj.endDate));

            // Replaces the variables in file pattern
            var replaceall = require('replaceall');
            var filenamePattern = jsonObj.filenamePattern;
            Object.keys(jsonObj).forEach(function(key) {
                var value = jsonObj[key];
                if (typeof(value) === 'string') {
                    filenamePattern = replaceall('$$' + key + '$$', value, filenamePattern);
                }
            });

            log.info('planning generator', 'Writing csv file: %j/%j', jsonObj.filepath, filenamePattern);
            fs.writeFile(jsonObj.filepath + '/' + filenamePattern, csvHeaders + '\n' + csvValues);

            log.verbose('planning generator', csvHeaders);
            log.verbose('planning generator', csvValues);
        }
        catch (e) {
            log.error('planning generator', e);
        }
    }


    /**
     * Check moment dates validity.
     */
    this.checkDates = function() {
        if (this.date1.isAfter(this.date2)) throw new Error('Your period is not valid');
    }
}


/**
 * @param jsonObj the json input object containing all data to inject
 * @param connectionProperties
 * @param password the password to access the obm account
 */
PlanningGenerator.prototype.generate = function(jsonObj,connectionProperties) {

    var self = this;
    this.date1 = moment(jsonObj.startDate);
    this.date2 = moment(jsonObj.endDate);

    this.checkDates();

    log.info('planning generator', 'Processing between dates: %j and %j', this.date1.format(), this.date2.format());

    log.verbose('planning generator', 'Creating needed directories');
    fs.lstat(jsonObj.filepath, function(err) {
        if (err) {
            mkdirp(jsonObj.filepath);
            log.verbose('planning generator', 'filepath created');
        }
    });

    log.verbose('planning generator', this.date1.format());

    var extractor = new PageExtractor();

    var parser = new PlanningParser(jsonObj.worker, jsonObj.activityProject);

    // We extract date from planning
    extractor.extract(connectionProperties, this.date1, this.date2, false, parser).then(function(months) {
        self.generateCsv(months, jsonObj);
    });

}

module.exports = PlanningGenerator;
