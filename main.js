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

function full(jsonObj, startDate, endDate) {
    
    var date1 = moment(startDate);
    var date2 = moment(endDate);

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
                            datePromise.month(data.month);
                            datePromise.year(data.year);
                            months[datePromise.format('MMYYYY')] = parser.parse(data.htmlContent, jsonObj.activityProject);
                        })
                    );
                } catch (e) { console.log(e); }
                date3.add(1, 'months');
            }

            // We wait for all promises to terminate
            Promise.all(promises).then(function() {
                // We can now generate files

                console.log('enfin on a fini!');
                for (var month in months) {
                    generateDeclarations(month, jsonObj, templateData);
                    console.log('et un');
                }


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
 * @param string month in MMYYYY format
 * @param object jsonObj contains all information ready to inject in the template
 * @param templateData the template to use for the declaration
 */
function generateDeclarations(month, jsonObj, templateData) {

    console.log('processing month ' + month);
}

/**
 * @param currentDate
 * @param endDate
 * @param extractObj
 */
function extract(currentDate, endDate, extractObj, jsonObj) {
 
}


require('fs');
var moment = require('moment');

fs.readFile('test/resources/bl-example.json', function(err, content) {
    full(JSON.parse(content), '20160401', '20160503');

});

