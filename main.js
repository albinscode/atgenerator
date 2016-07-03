var fs = require('fs');

var TEMPLATE_FILE_NAME ='test/resources/AT_13977-02_CRA_modele.odt';

// The html parser
var TimeManagementParser = require('./timemanagementparser');
var parser = new TimeManagementParser();

// The http connection to linagora time management application
var LinagoraConnection = require('./linagoraconnection');

// The declaration filler
var DeclarationFiller = require('./declarationfiller.js');
var filler = new DeclarationFiller();

// To get a template
var TemplateProvider = require('./templateprovider.js');
var provider= new TemplateProvider();

var date1, date2 = null;

/**
 * @param jsonObj the json input object containing all data to inject
 * @param fileTemplate the file to use for reporting (an ODT file)
 * @param startDate the start date at which generating the report
 * @param endDate the end date at which generating the report
 */
function full(jsonObj, fileTemplate, startDate, endDate) {

    date1 = moment(startDate);
    date2 = moment(endDate);

    if (date1.isAfter(date2)) throw new Error('Your period is not valid');

    // A start date must start on the previous monday
    if (date1.days() > 1) {
       date1.add(-date1.days() + 1, 'days');
       console.log(date1.format());
    }
    // An end date must end on friday
    if (date2.days() < 5) {
        date2.add(5 - date2.days(), 'days');
        console.log(date2.format());
    }

    console.log('Processing between dates: ' + date1.format() + ' and ' + date2.format());

    var months = {};

    var promises = [];
    // We load the template to use
    provider.getFromOdt(TEMPLATE_FILE_NAME).then(function(templateData) {
        var date3 = moment(date1);
        date3.date(1);
        console.log(date3.format());

        // We get the cookie
        connection.getCookie().then(function() {

            // We build an array of promises
            while (date3.isBefore(date2)) {
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
                            convertToObject(months, datePromise.format('MMYYYY'), parser.parse(data.htmlContent, jsonObj.activityProject));
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
                    generateDeclarations(months, jsonObj, templateData, fileTemplate);
                } catch (e) { log.message(e); }


            });
        });

    });
}


/**
 * @param object months an object that contains all days with morning and afternoon value.
 * @param object jsonObj contains all information ready to inject in the template
 * @param templateData the template to use for the declaration
 * @param fileTemplate the file to use for reporting (an ODT file)
 */
function generateDeclarations(months, jsonObj, templateData, fileTemplate) {
    console.log("Generating declarations");
    var date3 = moment(date1);

    var originalJsonObj = JSON.parse(JSON.stringify(jsonObj));
    var days = null;
    // Total of days consumed for this project
    if (originalJsonObj.activityTotal == null) {
        originalJsonObj.activityTotal = 0;
    }
    var firstDateOfWeek = null;
    var weekTotal = 0;
    while (date3.isBefore(date2)) {
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
        struct['AM' + numberOfDays] = formatCell(storedValue.am, 'AM');
        struct['PM' + numberOfDays] = formatCell(storedValue.pm, 'PM');
        //days.push(struct);
        days['day' + numberOfDays] = struct;
        if (date3.day() == 5) {
            // See if we have to generate the doc
            if ((parseFloat(jsonObj.activityTotal) - weekTotal) > 0) {
                console.log("update the doc");

                jsonObj.days = days;

                jsonObj = updateSpecificFields(firstDateOfWeek, jsonObj, originalJsonObj);
                console.log(jsonObj);
                var newTemplateContent = filler.fill(jsonObj, templateData.content);
                var newTemplateFooter = filler.fill(jsonObj, templateData.footer);

                // Replaces the date of weeks
                var replaceall = require('replaceall');
                var filenamePattern = jsonObj.filenamePattern;
                filenamePattern = replaceall('$$firstDayOfWeek$$', firstDateOfWeek.format(jsonObj.patternDateFormat), filenamePattern);
                filenamePattern = replaceall('$$lastDayOfWeek$$', firstDateOfWeek.add(4, 'days').format(jsonObj.patternDateFormat), filenamePattern);

                provider.update(fileTemplate, filenamePattern, newTemplateContent, newTemplateFooter);
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
function updateSpecificFields(date, jsonObj, originalJsonObj) {

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
function formatCell(ifActivated, text) {
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
function convertToObject(object, format, month) {
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

require('fs');
var moment = require('moment');

// TODO four variables to inject

//convertToObjectTest();
var fileTemplate = 'test/resources/AT_13977-02_CRA_modele.odt';
var connection = new LinagoraConnection('avigier', 'sabine2014');
//return;
fs.readFile('test/resources/bl-example.json', function(err, content) {
    full(JSON.parse(content), fileTemplate, '20160301', '20160730');
    //full(JSON.parse(content), '20160509', '20160513');

});

