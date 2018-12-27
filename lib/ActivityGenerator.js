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
    this.ifMonthlyAtReport  = false;

    /**
     * This is to manage declarations.
     * three types:
     * 1. followup report: all project activities, we are interested on full days coverture
     * 2. report weekly: one specific project activity, only days concerned by activity
     * 3. report monthly
     * @param object months an object that contains all days with morning and afternoon value.
     * @param object jsonObj contains all information ready to inject in the template
     * @param templateData the template to use for the declaration
     */
    this.generateDeclarations = function(months, templateData) {
        try {
            log.verbose('generator', "Generating declarations");
            var date3 = moment(this.date1);
            var originalJsonObj = JSON.parse(JSON.stringify(this.jsonObj));

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
            // Follow up mode
            if (this.ifFollowUp) {
                this.manageFollowupReport(processor);
            }
            // Report mode
            else {
                this.manageAtReport(processor);
            }

            // We store each update promises to wait for end of processing
            var promises = [];
            // The array containing all generated files
            var files = [];

            // each end of week with data
            if (!this.ifMonthlyAtReport) {
                processor.on(ActivityProcessorEmitter.EVENT_LAST_DAY_OF_WEEK, function(weekTotal, date) {
                    log.verbose('generator', "weekly update the doc");

                    // In the case of the followup we need to display the dates headers.
                    // But we do not manage working the week end, sorry ;)
                    if (self.ifFollowUp) {
                        self.jsonObj.days.day6 = { 'day6': date.add(1, 'days').format(self.jsonObj.patternHumanDateFormat) };
                        self.jsonObj.days.day7 = { 'day7': date.add(1, 'days').format(self.jsonObj.patternHumanDateFormat) };
                    }

                    self.fillOneFile(promises, files, weekTotal, originalJsonObj, templateData, date);
                });
            }
            else {
                processor.on(ActivityProcessorEmitter.EVENT_LAST_DAY_OF_MONTH, function(monthTotal, date) {
                    log.verbose('generator', "monthly update the doc");

                    self.manageOutOfMonth(date);
                    self.fillOneFile(promises, files, monthTotal, originalJsonObj, templateData, date);
                });
            }

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
     * Generates void days to fill array with void values.
     * E.g. in november, we have only 30 days, so we do not want 31 to appear!
     */
    this.manageOutOfMonth = function (date) {
        var maxDayOfCurrentMonth = date.date() + 1;
        var maxDay = 31;

        // we generate void days
        for (maxDayOfCurrentMonth; maxDayOfCurrentMonth <= maxDay; maxDayOfCurrentMonth++) {
            struct = {};
            struct['day' + maxDayOfCurrentMonth] = '';//date.format('DD');
            struct['AM' + maxDayOfCurrentMonth] = '';//self.formatCell(value, 'AM', self.jsonObj.activityProject, date);
            struct['PM' + maxDayOfCurrentMonth] = '';//self.formatCell(value, 'PM', self.jsonObj.activityProject, date);
            self.jsonObj.days['day' + maxDayOfCurrentMonth] = struct;
        }
    }

    /**
     * Fills one file with given information
     */
    this.fillOneFile = function(promises, files, total, originalJsonObj, templateData, currentDay) {
        // we inject the incremental total of the activity
        self.jsonObj.activityTotal = parseFloat(self.jsonObj.activityTotal) + parseFloat(total);

        // we inject only the total of the month
        self.jsonObj.monthTotal = parseFloat(total);

        console.log(total);

        self.jsonObj = self.updateSpecificFields(currentDay, self.jsonObj, originalJsonObj);
        log.verbose('generator', self.jsonObj);
        var newTemplateContent = filler.fill(self.jsonObj, templateData.content);
        var newTemplateFooter = filler.fill(self.jsonObj, templateData.styles);

        var firstDayOfWeek = currentDay.clone().startOf('week');
        // Replaces the date of weeks (specific replacements)
        var replaceall = require('replaceall');
        var filenamePattern = self.jsonObj.filenamePattern;
        filenamePattern = replaceall('$$firstDayOfWeek$$', firstDayOfWeek.format(self.jsonObj.patternDateFormat), filenamePattern);
        filenamePattern = replaceall('$$lastDayOfWeek$$', firstDayOfWeek.add(4, 'days').format(self.jsonObj.patternDateFormat), filenamePattern);
        filenamePattern = replaceall('$$year$$', currentDay.year().toString(), filenamePattern);
        var month = (currentDay.month() + 1).toString();
        if (month.length == 1) month = '0' + month;
        filenamePattern = replaceall('$$month$$', month, filenamePattern);

        log.info('generator', 'Writing file %j', filenamePattern);
        var newFile = self.jsonObj.filepath + '/' + filenamePattern;
        files.push(newFile);
        promises.push(provider.update(self.jsonObj.odtTemplate, newFile, newTemplateContent, newTemplateFooter));
    }

    /**
     * Followup report generation for each day and all activities.
     */
    this.manageFollowupReport = function(processor) {

        var days = self.jsonObj.days;

        // each full day
        processor.on(ActivityProcessorEmitter.EVENT_ONE_DAY, function(value, date, numberOfDay) {
            var struct = {};
            struct['day' + numberOfDay] = date.format(self.jsonObj.patternHumanDateFormat);
            struct['day' + numberOfDay + 'Value'] = self.getAmount(value, true);
            if (self.isWorked(value)) struct.amount = 1;
            days['day' + numberOfDay] = struct;
        });

        // each  morning
        processor.on(ActivityProcessorEmitter.EVENT_MORNING_DAY, function(value, date, numberOfDay) {
            var struct = {};
            struct['day' + numberOfDay] = date.format(self.jsonObj.patternHumanDateFormat);
            // We keep the previous value if any
            var amount = struct['day' + numberOfDay + 'Value'];
            //if (amount === undefined) amount = 0;
            struct['day' + numberOfDay + 'Value'] = self.getAmount(value, false);
            log.verbose('processor', '%j : %j et %j', value, amount, struct['day' + numberOfDay + 'Value']);
            days['day' + numberOfDay] = struct;
            if (self.isWorked(value)) struct.amount = 0.5;
        });

        // each afternoon
        processor.on(ActivityProcessorEmitter.EVENT_AFTERNOON_DAY, function(value, date, numberOfDay) {
            var struct = days['day' + numberOfDay];
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

    /**
     * The weekly report to justify your presence with the customer.
     */
    this.manageAtReport = function(processor) {

        var struct = {};

        // each morning
        processor.on(ActivityProcessorEmitter.EVENT_MORNING_DAY_STRICT, function(value, date, numberOfDay, dayOfTheMonth) {
            struct = {};
            var day = self.getDay(numberOfDay, dayOfTheMonth);
            struct['day' + day] = date.format('DD');
            struct['AM' + day] = self.formatCell(value, 'AM', self.jsonObj.activityProject, date);
        });

        // each afternoon
        processor.on(ActivityProcessorEmitter.EVENT_AFTERNOON_DAY_STRICT, function(value, date, numberOfDay, dayOfTheMonth) {
            var day = self.getDay(numberOfDay, dayOfTheMonth);
            struct['PM' + day] = self.formatCell(value, 'PM', self.jsonObj.activityProject, date);
            self.jsonObj.days['day' + day] = struct;
        });

        // each week end
        processor.on(ActivityProcessorEmitter.EVENT_WEEK_END, function(value, date) {
            struct = {};
            var day = date.date();
            struct['day' + day] = date.format('DD');
            struct['AM' + day] = self.formatCell(value, 'AM', self.jsonObj.activityProject, date);
            struct['PM' + day] = self.formatCell(value, 'PM', self.jsonObj.activityProject, date);
            self.jsonObj.days['day' + day] = struct;
        });

    }

    this.getDay = function(dayOfWeek, dayOfMonth) {
        return this.ifMonthlyAtReport ? dayOfMonth : dayOfWeek;
    }


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

        this.jsonObj.activityWeek = String(date.locale('fr').weeks());
        this.jsonObj.activityMonth = String(date.locale('fr').format('MMMM'));
        this.jsonObj.activityYear = String(date.year());

        this.jsonObj.activityTotal = String(this.jsonObj.activityTotal);
        this.jsonObj.monthTotal = String(this.jsonObj.monthTotal);

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
            var detail = [];
            if (typeof(projectLabel) === 'string') detail = projectLabel.split('Absences -');
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
    this.formatCell = function(value, text, activityProject, date) {
        var result = null;

        // week end case
        if (date.day() == 6 || date.day() == 0) {
            result = '<text:p text:style-name=\"WeekEnd\">' + text + '</text:p>';
        } else if (typeof value == 'string' && value.indexOf(activityProject) != -1) {
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

    /**
     * @param jsonObj the json input object containing all data to inject
     * @param connectionProperties
     * @param password the password to access the obm account
     * @param ifFollowUp specifies wether to generate the activity report or followup (by default, report)
     */
    this.generate = function(jsonObj, connectionProperties, ifFollowUp, ifMonthlyAtReport) {

        this.ifFollowUp = ifFollowUp === true;
        this.ifMonthlyAtReport = ifMonthlyAtReport === true;

        var self = this;
        this.date1 = moment(jsonObj.startDate);
        this.date2 = moment(jsonObj.endDate);
        this.jsonObj = jsonObj;
        this.checkDates();
        log.info('generator', 'Processing between dates: %j and %j', this.date1.format(), this.date2.format());

        // we fix the dates if needed
        if (ifMonthlyAtReport) {
            this.date1.startOf('month');
            this.date2.endOf('month');
        }
        else {
            // on monday
            this.date1.day(1);
            this.date2.day(5);
        }

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

            var extractor = new PageExtractor();
            var jsonRules = new JsonRules(jsonObj);
            var parser = null;
            parser = jsonRules.getTimeParser();

            // We extract date from time management
            // FIXME bad implementation! we have to clone?
            extractor.extract(connectionProperties, self.date1.clone(), self.date2, true, parser).then(function(months) {
                self.generateDeclarations(months, templateData);
            });

        });
    };

}


module.exports = ActivityGenerator;
