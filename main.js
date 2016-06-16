var fs = require('fs');

var TEMPLATE_FILE_NAME ='test/resources/AT_13977-02_CRA_modele.odt'; 

// The html parser
var TimeManagementParser = require('./timemanagementparser');
var parser = new TimeManagementParser();

// The http connection to linagora time management application
var LinagoraConnection = require('./linagoraconnection');
var connection = new LinagoraConnection('avigier', 'sabine2014');

// The declaration filler
var DeclarationFiller = require('./declarationfiller.js');
var filler = new DeclarationFiller();

// To get a template    
var TemplateProvider = require('./templateprovider.js');
var provider= new TemplateProvider();

var date1, date2 = null;

function full(jsonObj, startDate, endDate) {
    
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
                generateDeclarations(months, jsonObj, templateData);
                } catch (e) { log.message(e); }


            });
        });
        // We fetch the corresponding pages
        //connection.getPage('04', '2016').then(function(htmlContent) {

            // We now know the worked days for this specific project and month
            //var daysWorked = parser.parse(htmlContent, jsonObj.activityProject);

            //var newTemplateContent = filler.fill(jsonObj, templateData.content); 
            //var newTemplateFooter = filler.fill(jsonObj, templateData.footer); 
            
            //provider.update('test/resources/AT_13977-02_CRA_modele.odt', 'output.odt', newTemplateContent, newTemplateFooter); 
            
        //});
    
    });
}


/**
 * @param object months an object that contains all days with morning and afternoon value.
 * @param object jsonObj contains all information ready to inject in the template
 * @param templateData the template to use for the declaration
 */
function generateDeclarations(months, jsonObj, templateData) {
    var date3 = moment(date1); 

    console.log("coucou");
    var days = null;
    while (date3.isBefore(date2)) {
        var storedValue = months[date3.format('DDMMYYYY')];
        if (storedValue === undefined) {
            console.log("et zut..." + date3.format('DDMMYYYY'));
            throw new Error('There is a pb with ' + date3.format('DDMMYYYY'));
        }
        console.log("test");

        var numberOfDays = date3.days(); 
        // We start a new week (so a new file
        if (numberOfDays == 1) {
            console.log("Initializing doc");
            days = {};
        }
        var struct = {};
        struct['day' + numberOfDays] = date3.format('DD');
        // TODO for testing purpose
        struct['AM' + numberOfDays] = formatCell(storedValue.am, 'AM'); 
        struct['PM' + numberOfDays] = formatCell(storedValue.pm, 'PM');
        //days.push(struct);        
        days['day' + numberOfDays] = struct;
        if (date3.days() == 5) {
            // TODO update the doc
            console.log("update the doc");

            jsonObj.days = days;
            console.log(jsonObj);
            var newTemplateContent = filler.fill(jsonObj, templateData.content); 
            var newTemplateFooter = filler.fill(jsonObj, templateData.footer); 
            
            provider.update('test/resources/AT_13977-02_CRA_modele.odt', 'output-' + date3.format('DDMMYYYY') + '.odt', newTemplateContent, newTemplateFooter); 

            // next week
            date3.add(2, 'days');
        }
        date3.add(1, 'days');
    }
}

function formatCell(ifActivated, text) {
    var result = null; 
    if (ifActivated) {
        result = "ok" + text + "ok";
    } else {
        result = "ko" + text + "ko";
    }
    return result;
}

/**
 * @param currentDate
 * @param endDate
 * @param extractObj
 */
function extract(currentDate, endDate, extractObj, jsonObj) {
 
}

/*
 * Converts the month array to an object containing keys with DDMMYYYY and a structure with am and pm properties.
 * @param object
 * @param format
 * @param month
*/
function convertToObject(object, format, month) {
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

fs.readFile('test/resources/bl-example.json', function(err, content) {
    full(JSON.parse(content), '20160401', '20160503');

});

