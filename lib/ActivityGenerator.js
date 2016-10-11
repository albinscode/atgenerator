var log = require('./LogBridge');
var fs = require('fs');
var mkdirp = require('mkdirp');

// The declaration filler
var DeclarationFiller = require('./DeclarationFiller.js');
var filler = new DeclarationFiller();

var PageExtractor = require('./PageExtractor');

var TimeManagementParser = require('./TimeManagementParser');

// To intercept on month activity data
var ActivityProcessorEmitter = require('./ActivityProcessor');

// To get a template
var TemplateProvider = require('./TemplateProvider.js');
var provider= new TemplateProvider();

var moment = require('moment');

var JsonRules = require('./JsonRules');

function ActivityGenerator() {

    var self = this;
    var date1, date2 = null;

    /**
     * @param object months an object that contains all days with morning and afternoon value.
     * @param object jsonObj contains all information ready to inject in the template
     * @param templateData the template to use for the declaration
     */
    this.generateDeclarations = function(months, jsonObj, templateData) {
        try {
            log.verbose('generator', "Generating declarations");
            var date3 = moment(jsonObj.startDate);
            var originalJsonObj = JSON.parse(JSON.stringify(jsonObj));
            var days = {};
            // Total of days consumed for this project
            if (originalJsonObj.activityTotal === null) {
                originalJsonObj.activityTotal = 0;
            }
            var weekTotal = 0;

            var processor = new ActivityProcessorEmitter(jsonObj.activityTotal);
            var struct = null;
            var firstDayOfWeek = null;

            // each start of week
            processor.on(ActivityProcessorEmitter.EVENT_FIRST_DAY_OF_WEEK, function(date) {
                // We reset the days structure
                days = {};
                firstDayOfWeek = date;
            });

            // each morning
            processor.on(ActivityProcessorEmitter.EVENT_MORNING_DAY, function(value, date, numberOfDay) {
                struct = {};
                struct['day' + numberOfDay] = date.format('DD');
                struct['AM' + numberOfDay] = self.formatCell(value, 'AM');
            });

            // each afternoon
            processor.on(ActivityProcessorEmitter.EVENT_AFTERNOON_DAY, function(value, date, numberOfDay) {
                struct['PM' + numberOfDay] = self.formatCell(value, 'PM');
                days['day' + numberOfDay] = struct;
            });

            // each end of week with data
            processor.on(ActivityProcessorEmitter.EVENT_LAST_DAY_OF_WEEK, function(weekTotal, date) {
                log.verbose('generator', "update the doc");

                jsonObj.days = days;

                jsonObj.activityTotal = parseFloat(jsonObj.activityTotal) + parseFloat(weekTotal);

                jsonObj = self.updateSpecificFields(firstDayOfWeek, jsonObj, originalJsonObj);
                log.verbose('generator', jsonObj);
                var newTemplateContent = filler.fill(jsonObj, templateData.content);
                var newTemplateFooter = filler.fill(jsonObj, templateData.footer);

                // Replaces the date of weeks
                var replaceall = require('replaceall');
                var filenamePattern = jsonObj.filenamePattern;
                filenamePattern = replaceall('$$firstDayOfWeek$$', firstDayOfWeek.format(jsonObj.patternDateFormat), filenamePattern);
                filenamePattern = replaceall('$$lastDayOfWeek$$', firstDayOfWeek.add(4, 'days').format(jsonObj.patternDateFormat), filenamePattern);

                log.info('generator', 'Writing file %j', filenamePattern);
                provider.update(jsonObj.odtTemplate, jsonObj.filepath + '/' + filenamePattern, newTemplateContent, newTemplateFooter);
            });

            // We can now process the data
            processor.process(months, moment(jsonObj.startDate), moment(jsonObj.endDate));
        }
        catch (e) {
            log.error(e);
        }
    };

    /**
     * Updates all specific fields (relative to date like number of week, month, etc...)
     */
    this.updateSpecificFields = function(date, jsonObj, originalJsonObj) {

        // Current date or specified date
        if (originalJsonObj.activityDate === null) {
            jsonObj.activityDate = moment();
        }
        jsonObj.activityDate =  String(moment(originalJsonObj.date).format('DD/MM/YYYY'));

        jsonObj.activityWeek = String(date.weeks() - 1);
        jsonObj.activityMonth = String(date.locale('fr').format('MMMM'));
        jsonObj.activityYear = String(date.year());

        jsonObj.activityTotal = String(jsonObj.activityTotal);
        return jsonObj;
    };

    /**
     * Note: this is specific to ODT libreoffice format.
     */
    this.formatCell = function(ifActivated, text) {
        var result = null;
        if (ifActivated) {
            result = '<text:p text:style-name=\"Présent\">' + text + '</text:p>';
        } else {
            result = '<text:p text:style-name=\"Absent\">' + text + '</text:p>';
        }
        return result;
    };

    /**
     * Check moment dates validity.
     */
    this.checkDates = function() {
        if (this.date1.isAfter(this.date2)) throw new Error('Your period is not valid');

        // A start date must start on the previous monday
        if (this.date1.days() > 1) {
           this.date1.add(-this.date1.days() + 1, 'days');
           log.verbose('generator', 'Start date computed %j', this.date1.format());
        }
        // An end date must end on friday
        if (this.date2.days() < 5) {
            this.date2.add(5 - this.date2.days(), 'days');
            log.verbose('generator', 'End date computed %j', this.date2.format());
        }
    };
}


/**
 * @param jsonObj the json input object containing all data to inject
 * @param connectionProperties
 * @param password the password to access the obm account
 */
ActivityGenerator.prototype.generate = function(jsonObj, connectionProperties) {

    var self = this;
    this.date1 = moment(jsonObj.startDate);
    this.date2 = moment(jsonObj.endDate);

    this.checkDates();

    log.info('generator', 'Processing between dates: %j and %j', this.date1.format(), this.date2.format());

    log.verbose('generator', 'Creating needed directories');
    fs.lstat(jsonObj.filepath, function(err) {
        if (err) {
            mkdirp(jsonObj.filepath);
            log.verbose('generator', 'filepath created');
        }
    });

    // We load the template to use
    log.verbose('generator', 'Using odt template file %j', jsonObj.odtTemplate);
    provider.getFromOdt(jsonObj.odtTemplate).then(function(templateData) {

        var date3 = moment(self.date1);
        date3.date(1);
        log.verbose('generator', date3.format());

        var extractor = new PageExtractor();

        var jsonRules = new JsonRules(jsonObj);

        // We extract date from time management
        extractor.extract(connectionProperties, date3, self.date2, true, jsonRules.getTimeParser()).then(function(months) {
            self.generateDeclarations(months, jsonObj, templateData);
        });

    });
};

module.exports = ActivityGenerator;
