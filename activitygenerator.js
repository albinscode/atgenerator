var log = require('./logbridge');
var fs = require('fs');
var mkdirp = require('mkdirp');

// The declaration filler
var DeclarationFiller = require('./declarationfiller.js');
var filler = new DeclarationFiller();

// To get a template
var TemplateProvider = require('./templateprovider.js');
var provider= new TemplateProvider();

var moment = require('moment');

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
            if (originalJsonObj.activityTotal == null) {
                originalJsonObj.activityTotal = 0;
            }
            var firstDateOfWeek = date3;
            var weekTotal = 0;
            while (date3.isBefore(self.date2)) {
                var storedValue = months[date3.format('DDMMYYYY')];
                log.verbose('generator', 'Managing ' + date3.format('DDMMYYYY'));
                if (storedValue === undefined) {
                    log.verbose('generator', 'Nothing to perform on this date');
                    storedValue = {};
                    storedValue.am = false;
                    storedValue.pm = false;
                }
                var numberOfDays = date3.day();
                // We start a new week (so a new file
                if (numberOfDays == 1) {
                    firstDateOfWeek = moment(date3);
                    log.verbose('generator', 'Initializing doc');
                    days = {};
                    weekTotal = parseFloat(jsonObj.activityTotal);
                }
                // Number of days consumed
                if (storedValue.am) {
                    jsonObj.activityTotal = parseFloat(jsonObj.activityTotal) + 0.5;
                }
                if (storedValue.pm) {
                    jsonObj.activityTotal = parseFloat(jsonObj.activityTotal) + 0.5;
                }
                log.verbose('generator', jsonObj.activityTotal);

                var struct = {};
                struct['day' + numberOfDays] = date3.format('DD');
                // TODO for testing purpose
                struct['AM' + numberOfDays] = this.formatCell(storedValue.am, 'AM');
                struct['PM' + numberOfDays] = this.formatCell(storedValue.pm, 'PM');
                //days.push(struct);
                days['day' + numberOfDays] = struct;
                if (date3.day() == 5) {
                    // See if we have to generate the doc
                    if ((parseFloat(jsonObj.activityTotal) - weekTotal) > 0) {
                        log.verbose('generator', "update the doc");

                        jsonObj.days = days;

                        jsonObj = this.updateSpecificFields(firstDateOfWeek, jsonObj, originalJsonObj);
                        log.verbose('generator', jsonObj);
                        var newTemplateContent = filler.fill(jsonObj, templateData.content);
                        var newTemplateFooter = filler.fill(jsonObj, templateData.footer);

                        // Replaces the date of weeks
                        var replaceall = require('replaceall');
                        var filenamePattern = jsonObj.filenamePattern;
                        filenamePattern = replaceall('$$firstDayOfWeek$$', firstDateOfWeek.format(jsonObj.patternDateFormat), filenamePattern);
                        filenamePattern = replaceall('$$lastDayOfWeek$$', firstDateOfWeek.add(4, 'days').format(jsonObj.patternDateFormat), filenamePattern);

                        log.info('generator', 'Writing file %j', filenamePattern);
                        provider.update(jsonObj.odtTemplate, jsonObj.filepath + '/' + filenamePattern, newTemplateContent, newTemplateFooter);
                    } else {
                        log.verbose('generator', 'No activity this week, week ignored');
                    }
                    // next week
                    date3.add(2, 'days');
                }
                date3.add(1, 'days');
            }
        }
        catch (e) {
            log.error(e);
        }
    }

    /**
     * Updates all specific fields (relative to date like number of week, month, etc...)
     */
    this.updateSpecificFields = function(date, jsonObj, originalJsonObj) {

        // Current date or specified date
        if (originalJsonObj.activityDate == null) {
            jsonObj.activityDate = moment();
        }
        jsonObj.activityDate =  String(moment(originalJsonObj.date).format('DD/MM/YYYY'));

        jsonObj.activityWeek = String(date.weeks() - 1);
        jsonObj.activityMonth = String(date.locale('fr').format('MMMM'));
        jsonObj.activityYear = String(date.year());

        jsonObj.activityTotal = String(jsonObj.activityTotal);
        return jsonObj;
    }

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
    }

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
    }
}


/**
 * @param jsonObj the json input object containing all data to inject
 * @param user the user to access the obm account
 * @param password the password to access the obm account
 */
ActivityGenerator.prototype.generate = function(jsonObj, user, password) {

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
    provider.getFromOdt(jsonObj.odtTemplate).then(function(templateData) {

        var date3 = moment(self.date1);
        date3.date(1);
        log.verbose('generator', date3.format());

        var PageExtractor = require('./pageextractor');
        var extractor = new PageExtractor();

        var TimeManagementParser = require('./timemanagementparser');
        var parser = new TimeManagementParser(jsonObj.activityProject);

        // We extract date from time management
        extractor.extract(user, password, date3, self.date2, true, parser).then(function(months) {
            self.generateDeclarations(months, jsonObj, templateData);
        });

    });
}

module.exports = ActivityGenerator;
