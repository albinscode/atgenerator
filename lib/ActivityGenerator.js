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
var provider = require('od-provider');

var moment = require('moment');

var JsonRules = require('./JsonRules');
var Promise = require('promise');
var merger = require('od-merger');

function ActivityGenerator() {

    var self = this;
    this.jsonObj = null;
    this.ifFollowUp = false;

    /**
     * @param object months an object that contains all days with morning and afternoon value.
     * @param object jsonObj contains all information ready to inject in the template
     * @param templateData the template to use for the declaration
     */
    this.generateDeclarations = function(months, templateData) {
        try {
            log.verbose('generator', "Generating declarations");
            var date3 = moment(this.date1);
            var originalJsonObj = JSON.parse(JSON.stringify(this.jsonObj));
            var days = {};
            // Total of days consumed for this project
            if (originalJsonObj.activityTotal === null) {
                originalJsonObj.activityTotal = 0;
            }
            var weekTotal = 0;

            var processor = null;
            if (this.ifFollowUp) {
                processor = new ActivityProcessorEmitter(0, false);
            } else {
                processor = new ActivityProcessorEmitter(this.jsonObj.activityTotal, false, this.jsonObj.activityProject);
            }
            var struct = null;
            var firstDayOfWeek = null;

            // each start of week
            processor.on(ActivityProcessorEmitter.EVENT_FIRST_DAY_OF_WEEK, function(date) {
                // We reset the days structure
                days = {};
                firstDayOfWeek = date;
            });

            // Follow up mode
            if (this.ifFollowUp) {
                // each full day
                processor.on(ActivityProcessorEmitter.EVENT_ONE_DAY, function(value, date, numberOfDay) {
                    struct = {};
                    struct['day' + numberOfDay] = date.format(self.jsonObj.patternHumanDateFormat);
                    struct['day' + numberOfDay + 'Value'] = self.getAmount(value, true);
                    if (self.isWorked(value)) struct.amount = 1;
                    days['day' + numberOfDay] = struct;
                });

                // each  morning
                processor.on(ActivityProcessorEmitter.EVENT_MORNING_DAY, function(value, date, numberOfDay) {
                    struct = {};
                    struct['day' + numberOfDay] = date.format(self.jsonObj.patternHumanDateFormat);
                    // We keep the previous value if any
                    var amount = struct['day' + numberOfDay + 'Value'];
                    if (amount === undefined) amount = 0;
                    struct['day' + numberOfDay + 'Value'] = amount + self.getAmount(value, false);
                    log.verbose('processor', '%j : %j et %j', value, amount, struct['day' + numberOfDay + 'Value']);
                    days['day' + numberOfDay] = struct;
                    if (self.isWorked(value)) struct.amount = 0.5;
                });

                // each afternoon
                processor.on(ActivityProcessorEmitter.EVENT_AFTERNOON_DAY, function(value, date, numberOfDay) {
                    struct = days['day' + numberOfDay];
                    // We keep the previous value
                    var amount = struct['day' + numberOfDay + 'Value'];
                    // We already have an amount of work if struct.amount contains a positive float
                    if (struct.amount > 0) {
                        // We got a full working day
                        if (self.isWorked(value)) {
                            struct['day' + numberOfDay + 'Value'] = self.getAmount(value, struct.amount > 0);
                            if (struct.amount > 0) {
                                struct.amount = struct.amount + 0.5;
                            }
                        }
                        // Otherwise, we don't add the holidays label
                    }
                    log.verbose('processor', '%j : %j et %j', value, amount, struct['day' + numberOfDay + 'Value']);
                    days['day' + numberOfDay] = struct;
                });

            }
            // Report mode
            else {
                // each morning
                processor.on(ActivityProcessorEmitter.EVENT_MORNING_DAY_STRICT, function(value, date, numberOfDay) {
                    struct = {};
                    struct['day' + numberOfDay] = date.format('DD');
                    struct['AM' + numberOfDay] = self.formatCell(value, 'AM', self.jsonObj.activityProject);
                });

                // each afternoon
                processor.on(ActivityProcessorEmitter.EVENT_AFTERNOON_DAY_STRICT, function(value, date, numberOfDay) {
                    struct['PM' + numberOfDay] = self.formatCell(value, 'PM', self.jsonObj.activityProject);
                    days['day' + numberOfDay] = struct;
                });
            }

            // We store each update promises to wait for end of processing
            var promises = [];
            // The array containing all generated files
            var files = [];
            // each end of week with data
            processor.on(ActivityProcessorEmitter.EVENT_LAST_DAY_OF_WEEK, function(weekTotal, date) {
                log.verbose('generator', "update the doc");

                // In the case of the followup we need to display the dates headers.
                // But we do not manage working the week end, sorry ;)
                if (self.ifFollowUp) {
                    days.day6 = { 'day6': date.add(1, 'days').format(self.jsonObj.patternHumanDateFormat) };
                    days.day7 = { 'day7': date.add(1, 'days').format(self.jsonObj.patternHumanDateFormat) };
                }
                self.jsonObj.days = days;

                self.jsonObj.activityTotal = parseFloat(self.jsonObj.activityTotal) + parseFloat(weekTotal);

                self.jsonObj = self.updateSpecificFields(firstDayOfWeek, self.jsonObj, originalJsonObj);
                log.verbose('generator', self.jsonObj);
                var newTemplateContent = filler.fill(self.jsonObj, templateData.content);
                var newTemplateFooter = filler.fill(self.jsonObj, templateData.styles);

                // Replaces the date of weeks
                var replaceall = require('replaceall');
                var filenamePattern = self.jsonObj.filenamePattern;
                filenamePattern = replaceall('$$firstDayOfWeek$$', firstDayOfWeek.format(self.jsonObj.patternDateFormat), filenamePattern);
                filenamePattern = replaceall('$$lastDayOfWeek$$', firstDayOfWeek.add(4, 'days').format(self.jsonObj.patternDateFormat), filenamePattern);

                log.info('generator', 'Writing file %j', filenamePattern);
                var newFile = self.jsonObj.filepath + '/' + filenamePattern;
                files.push(newFile);
                promises.push(provider.update(self.jsonObj.odtTemplate, newFile, newTemplateContent, newTemplateFooter));
            });

            // We can now process the data
            processor.process(months, moment(this.date1), moment(this.date2));

            // When all file writings are ok
            Promise.all(promises).then(function() {
                // we merge the ods files
                if (self.ifFollowUp) {
                    var filename = self.jsonObj.filepath + '/' + self.jsonObj.filenameFinalPattern;
                    merger.merge(files, filename);
                    log.info('generator', 'Followup file %j has been generated', filename);
                }
            });
        }
        catch (e) {
            log.error(e);
        }
    };

    /**
     * Updates all specific fields (relative to date like number of week, month, etc...)
     * These are computed fields.
     */
    this.updateSpecificFields = function(date, originalJsonObj) {

        // Current date or specified date
        if (originalJsonObj.activityDate === null) {
            this.jsonObj.activityDate = moment();
        }
        this.jsonObj.activityDate =  String(moment(originalJsonObj.date).format('DD/MM/YYYY'));

        this.jsonObj.activityWeek = String(date.weeks() - 1);
        this.jsonObj.activityMonth = String(date.locale('fr').format('MMMM'));
        this.jsonObj.activityYear = String(date.year());

        this.jsonObj.activityTotal = String(this.jsonObj.activityTotal);
        var weekWorkedTotal = 0;
        var days = this.jsonObj.days;
        Object.keys(days).forEach(function(element, key) {
            log.verbose('generator', 'key %j value %j amount %j', key, element, days[element].amount);
            var value = days[element].amount ;
            if (value !== undefined) weekWorkedTotal = parseFloat(weekWorkedTotal) + parseFloat(days[element].amount);
        });
        log.verbose('generator', 'worked total: %j', weekWorkedTotal);
        self.jsonObj.weekWorkedTotal = this.formatDate(weekWorkedTotal);
        return this.jsonObj;
    };

    /**
     * @return true if the day is worked, false otherwise.
     * @see if it can be externalize into another class.
     */
    this.isWorked = function(projectLabel) {
        return typeof projectLabel == 'string' && projectLabel.indexOf('Absences') == -1;
    };

    /**
     * @return the amount of work done
     * (value is defined from jsonObj values, @see activityFullDay or activityHalfDay)
     */
    this.getAmount = function (projectLabel, ifFullDay) {

        var result = '';
        // This has been a worked day on a project
        if (this.isWorked(projectLabel)) {
            if (ifFullDay) {
                result = this.jsonObj.activityFullDay;
            }
            else {
                result = this.jsonObj.activityHalfDay;
            }
        }
        // Holidays cases
        else {
            var detail = projectLabel.split('Absences -');
            // Put into place a mapping to have only acronyms instead of full description (e.g. CPA, CP, RTT, etc...)
            if (detail[1] !== undefined) {
                result = detail[1].trim();
            }
        }
        log.verbose('generator', 'valeur result %j pour projet %j et half %j et full %j', result, projectLabel, this.jsonObj.activityHalfDay, this.jsonObj.activityFullDay);
        return result;
    };

    /**
     * Note: this is specific to ODT libreoffice format.
     */
    this.formatCell = function(value, text, activityProject) {
        var result = null;

        if (typeof value == 'string' && value.indexOf(activityProject) != -1) {
            result = '<text:p text:style-name=\"Présent\">' + text + '</text:p>';
        } else {
            result = '<text:p text:style-name=\"Absent\">' + text + '</text:p>';
        }
        return result;
    };

    /**
     * Check moment dates validity.
     * TODO add this to JsonRules object
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

    this.formatDate = function(value) {
       // We convert the value from days to minutes

       var minutes = parseFloat(value) * parseFloat(this.jsonObj.activityMinutesPerDay);
       var hours = moment.duration(minutes, 'minutes');
       var intHours = parseInt(hours.asHours());
       if (intHours < 10) intHours = '0' + intHours;
       var intMinutes = hours.minutes();
       if (intMinutes < 10) intMinutes = '0' + intMinutes;

       var result = intHours + 'h' + intMinutes;
       log.verbose('generator', 'input value %s, converted to minutes %j, formatted to %j', value, minutes, result);
       return result;
    };
}


/**
 * @param jsonObj the json input object containing all data to inject
 * @param connectionProperties
 * @param password the password to access the obm account
 * @param ifFollowUp specifies wether to generate the activity report or followup (by default, report)
 */
ActivityGenerator.prototype.generate = function(jsonObj, connectionProperties, ifFollowUp) {

    if (ifFollowUp === undefined) {
        ifFollowUp = false;
    }
    this.ifFollowUp = ifFollowUp;
    var self = this;
    this.date1 = moment(jsonObj.startDate);
    this.date2 = moment(jsonObj.endDate);
    this.jsonObj = jsonObj;
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
    log.verbose('generator', 'Using template file %j', jsonObj.odtTemplate);
    provider.getFromFile(jsonObj.odtTemplate).then(function(templateData) {

        var date3 = moment(self.date1);
        date3.date(1);
        log.verbose('generator', date3.format());

        var extractor = new PageExtractor();
        var jsonRules = new JsonRules(jsonObj);
        var parser = null;
        parser = jsonRules.getTimeParser();

        // We extract date from time management
        extractor.extract(connectionProperties, date3, self.date2, true, parser).then(function(months) {
            self.generateDeclarations(months, templateData);
        });

    });
};

module.exports = ActivityGenerator;
