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
    this.build = function(months, jsonObj) {
        try {
            log.verbose('planning generator', "Generating planning for %j with %j", jsonObj.worker, jsonObj.activityProject);

            var processor = new ActivityProcessorEmitter();
            var values = [];
            var headers = [];

            // When a new day is entered (wether working or non working days)
            processor.on(ActivityProcessorEmitter.EVENT_ONE_DAY, function(date) {
                headers.push(date.format(jsonObj.patternDateFormat));
            });
            // When a full day is planned
            processor.on(ActivityProcessorEmitter.EVENT_FULL_DAY, function(date, numberOfDay) {
                values.push('1');
            });
            // When a half day is planned
            processor.on(ActivityProcessorEmitter.EVENT_HALF_DAY, function(date, numberOfDay) {
                values.push('0.5');
            });
            // When no day is planned
            processor.on(ActivityProcessorEmitter.EVENT_ZERO_DAY, function(date, numberOfDay) {
                values.push('0');
            });
            // Saturday event
            processor.on(ActivityProcessorEmitter.EVENT_SATURDAY, function(date) {
                values.push('0');
            });
            // Sunday event
            processor.on(ActivityProcessorEmitter.EVENT_SUNDAY, function(date) {
                values.push('0');
            });

            processor.process(months, moment(jsonObj.startDate), moment(jsonObj.endDate));


            if (jsonObj.filenamePattern == '') {
                this.buildCsv(jsonObj, headers, values);
            } else {
                this.buildConsoleOutput(jsonObj, headers, values);
            }

            log.verbose('planning generator', headers);
            log.verbose('planning generator', values);
        }
        catch (e) {
            log.error('planning generator', e);
        }
    }

    /**
     * @param jsonObj the json object containing all parameters.
     * @param headers an array containing the dates for each day.
     * @param values an array containing the amount of day worked for this specific day.
     */
    this.buildCsv = function (jsonObj, headers, values) {
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
        fs.writeFile(jsonObj.filepath + '/' + filenamePattern, headers.join(jsonObj.csvSeparator) + '\n' + values.join(jsonObj.csvSeparator));
    }

    /**
     * @param jsonObj the json object containing all parameters.
     * @param headers an array containing the dates for each day.
     * @param values an array containing the amount of day worked for this specific day.
     */
    this.buildConsoleOutput = function (jsonObj, headers, values) {
        headers.forEach(function(value, index) {
            log.info(value, values[index]);
        });
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

    if (jsonObj.startDate == '') {
        this.date1 = moment().startOf('month');
    } else {
        this.date1 = moment(jsonObj.startDate);
    }
    if (jsonObj.endDate == '') {
       this.date2 = moment(this.date1).endOf('month');
    } else {
        this.date2 = moment(jsonObj.endDate);
    }

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
        self.build(months, jsonObj);
    });

}

module.exports = PlanningGenerator;
