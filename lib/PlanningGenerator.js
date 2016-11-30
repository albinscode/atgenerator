var log = require('./LogBridge');
var fs = require('fs');

var PageExtractor = require('./PageExtractor');

// To intercept on month activity data
var ActivityProcessorEmitter = require('./ActivityProcessor');

var JsonRules = require('./JsonRules');
var moment = require('moment');
var OutputFormatter = require('./OutputFormatter.js');

function PlanningGenerator() {

    var self = this;
    var date1, date2 = null;

    /**
     * @param object months an object that contains all days with morning and afternoon value.
     * @param object jsonObj contains all information ready to inject in the template
     */
    this.build = function(months, jsonObj) {
        try {
            log.info('planning generator', "Generating planning for %j with %j", jsonObj.worker, jsonObj.activityProject);

            var processor = new ActivityProcessorEmitter();
            var formatter = new OutputFormatter();

            // We generate the activity planning on a specific project
            if (jsonObj.activityProject !== '') {

                processor.projectCode = jsonObj.activityProject;
                processor.ifManageWeekEnds = true;

                // When a new day is entered (wether working or non working days)
                processor.on(ActivityProcessorEmitter.EVENT_ONE_DAY_STRICT, function(value, date, numberOfDay) {
                    formatter.pushHeaders(date.format(jsonObj.patternDateFormat));
                });

                // When a full day is planned
                processor.on(ActivityProcessorEmitter.EVENT_FULL_DAY, function(value, date, numberOfDay) {
                    formatter.push('1');
                });
                // When a half day is planned
                processor.on(ActivityProcessorEmitter.EVENT_HALF_DAY, function(value, date, numberOfDay) {
                    formatter.push('0.5');
                });
                // When no day is planned
                processor.on(ActivityProcessorEmitter.EVENT_ZERO_DAY, function(value, date, numberOfDay) {
                    formatter.push('0');
                });
                // Saturday event
                processor.on(ActivityProcessorEmitter.EVENT_SATURDAY, function(date) {
                    formatter.push('0');
                });
                // Sunday event
                processor.on(ActivityProcessorEmitter.EVENT_SUNDAY, function(date) {
                    formatter.push('0');
                });
            }
            // We just fetch all labels of all projects for the specific worker
            else {
                // When morning day is planned
                processor.on(ActivityProcessorEmitter.EVENT_MORNING_DAY, function(value, date, numberOfDay) {
                    formatter.pushHeaders(date.format(jsonObj.patternDateFormat + ' WW') + ' AM');
                    formatter.push(value);
                    formatter.sumActivity(value, 0.5, date);
                });
                // When afternoon day is planned
                processor.on(ActivityProcessorEmitter.EVENT_AFTERNOON_DAY, function(value, date, numberOfDay) {
                    formatter.pushHeaders(date.format(jsonObj.patternDateFormat + ' WW') + ' PM');
                    formatter.push(value);
                    formatter.sumActivity(value, 0.5, date);
                });
                // When full day is planned
                processor.on(ActivityProcessorEmitter.EVENT_ONE_DAY, function(value, date, numberOfDay) {
                    if (date !== undefined) {
                        formatter.pushHeaders(date.format(jsonObj.patternDateFormat + ' WW') + '   ');
                        formatter.push(value);
                        formatter.sumActivity(value, 1, date);
                    }
                });
                // When sunday is raised
                processor.on(ActivityProcessorEmitter.EVENT_SUNDAY, function(value, date, numberOfDay) {
                    formatter.pushHeaders('Week-end');
                    formatter.push('');
                });
            }
            processor.process(months, moment(self.date1), moment(self.date2));


            if (jsonObj.filenamePattern !== '' && jsonObj.filenamePattern !== undefined) {
                formatter.buildCsv(jsonObj);
            } else {
                formatter.buildConsoleOutput(jsonObj);
            }
        }
        catch (e) {
            log.error('planning generator', e);
        }
    };
}


/**
 * @param jsonObj the json input object containing all data to inject
 * @param connectionProperties
 */
PlanningGenerator.prototype.generate = function(jsonObj, connectionProperties) {

    var self = this;

    jsonRules = new JsonRules(jsonObj);

    jsonRules.checkDates();

    this.date1 = jsonRules.getStartDate();
    this.date2 = jsonRules.getEndDate();

    log.info('planning generator', 'Processing between dates: %j and %j', this.date1.format(), this.date2.format());

    var extractor = new PageExtractor();

    // We extract date from planning
    // TODO find why we have to cast them to moment
    extractor.extract(connectionProperties, moment(this.date1), moment(this.date2), false, jsonRules.getPlanningParser()).then(function(months) {
        self.build(months, jsonObj);
    });
};

module.exports = PlanningGenerator;
