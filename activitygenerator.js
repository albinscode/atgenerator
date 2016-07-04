
// The html parser
var TimeManagementParser = require('./timemanagementparser');
var parser = new TimeManagementParser();


// The declaration filler
var DeclarationFiller = require('./declarationfiller.js');
var filler = new DeclarationFiller();

// To get a template
var TemplateProvider = require('./templateprovider.js');
var provider= new TemplateProvider();

// The http connection to linagora time management application
var LinagoraConnection = require('./linagoraconnection');


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
        console.log("Generating declarations");
        console.log(self.date1);
        var date3 = moment(jsonObj.startDate);
        var originalJsonObj = JSON.parse(JSON.stringify(jsonObj));
        var days = null;
        // Total of days consumed for this project
        if (originalJsonObj.activityTotal == null) {
            originalJsonObj.activityTotal = 0;
        }
        var firstDateOfWeek = null;
        var weekTotal = 0;
        while (date3.isBefore(self.date2)) {
            var storedValue = months[date3.format('DDMMYYYY')];
            console.log('Managing ' + date3.format('DDMMYYYY'));
            if (storedValue === undefined) {
                console.log('Nothing to perform on this date');
                storedValue = {};
                storedValue.am = false;
                storedValue.pm = false;
            }
            var numberOfDays = date3.day();
            // We start a new week (so a new file
            if (numberOfDays == 1) {
                firstDateOfWeek = moment(date3);
                console.log("Initializing doc");
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
            console.log(jsonObj.activityTotal);

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
                    console.log("update the doc");

                    jsonObj.days = days;

                    jsonObj = this.updateSpecificFields(firstDateOfWeek, jsonObj, originalJsonObj);
                    console.log(jsonObj);
                    var newTemplateContent = filler.fill(jsonObj, templateData.content);
                    var newTemplateFooter = filler.fill(jsonObj, templateData.footer);

                    // Replaces the date of weeks
                    var replaceall = require('replaceall');
                    var filenamePattern = jsonObj.filenamePattern;
                    filenamePattern = replaceall('$$firstDayOfWeek$$', firstDateOfWeek.format(jsonObj.patternDateFormat), filenamePattern);
                    filenamePattern = replaceall('$$lastDayOfWeek$$', firstDateOfWeek.add(4, 'days').format(jsonObj.patternDateFormat), filenamePattern);

                    provider.update(jsonObj.odtTemplate, filenamePattern, newTemplateContent, newTemplateFooter);
                } else {
                    console.log('No activity this week, week ignored');
                }
                // next week
                date3.add(2, 'days');
            }
            date3.add(1, 'days');
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

            //console.log(key + ' ' + value + ' ' + day + format + ' ' + (key / 2 >> 0));
        });
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

    if (this.date1.isAfter(this.date2)) throw new Error('Your period is not valid');

    // A start date must start on the previous monday
    if (this.date1.days() > 1) {
       this.date1.add(-this.date1.days() + 1, 'days');
       console.log(this.date1.format());
    }
    // An end date must end on friday
    if (this.date2.days() < 5) {
        this.date2.add(5 - this.date2.days(), 'days');
        console.log(this.date2.format());
    }

    console.log('Processing between dates: ' + this.date1.format() + ' and ' + this.date2.format());

    var connection = new LinagoraConnection(user, password);

    var months = {};

    var promises = [];
    // We load the template to use
    provider.getFromOdt(jsonObj.odtTemplate).then(function(templateData) {
        var date3 = moment(self.date1);
        date3.date(1);
        console.log(date3.format());

        // We get the cookie
        connection.getCookie().then(function() {

            // We build an array of promises
            while (date3.isBefore(self.date2)) {
                try {
                    promises.push(
                        // We fetch the corresponding pages
                        connection.getPage(date3.month() + 1, date3.year()).then(function(data) {
                            // We now know the worked days for this specific project and month
                            // Note: we cannot use date3 as far as it is changing during the loop and we are async.
                            // So most of the time it was the laste date and we lost all the previous dates.
                            var datePromise = moment();
                            datePromise.month(data.month - 1);
                            datePromise.year(data.year);
                            self.convertToObject(months, datePromise.format('MMYYYY'), parser.parse(data.htmlContent, jsonObj.activityProject));
                        })
                    );
                } catch (e) { console.log(e); }
                date3.add(1, 'months');
            }

            // We wait for all promises to terminate
            Promise.all(promises).then(function() {
                // We can now generate files
                console.log(months);
                console.log('enfin on a fini!');
                try {
                    self.generateDeclarations(months, jsonObj, templateData);
                } catch (e) { log.message(e); }


            });
        });

    });
}

module.exports = ActivityGenerator;



