var fs = require('fs');

function testConnection() {
    var LinagoraConnection = require('./linagoraconnection');

    var connection = new LinagoraConnection('avigier', 'sabine2014');
    // To generate a file
    connection.getPage('05', '2016', 'resources/may.html');

    // To get the content directly as a return
    //connection.getPage('04', '2016').then(function(data) {
    //    console.log(data);
    //});
}

function testParsing() {
    var TimeManagementParser = require('./timemanagementparser');

    var parser = new TimeManagementParser();
    fs.readFile('resources/may.html', function (err, data) {
        if (err) throw err;
        var daysWorked = parser.parse(data, '13977-02');
        if (daysWorked != null) {
            for (var i = 0; i < daysWorked.length; i++) {
                console.log(daysWorked[i]);
            }
        }
    });
}

/**
 * Fills the declaration with given data.
 */
function testDeclarationFiller() {
    
    var DeclarationFiller = require('./declarationfiller.js');

    fs.readFile('resources/bl-example.json', function (err, data) {
        if (err) throw err;
        var filler = new DeclarationFiller();

        var content = filler.fill(JSON.parse(data), 'Hi, my name is $$companyConsultant$$ from $$companyFull$$, I\'m working hard for $$customerContact$$');
        console.log(content);
    });
}

function testFs() {

    fs.stat('resources/AT_13977-02_CRA_modele.odt', function (err, stats) {

        if (err) throw err;
        console.log('mais cest ok !');
    });
}

function testTemplate() {

    var TemplateProvider = require('./templateprovider.js');
    var provider= new TemplateProvider();
    
    provider.getFromOdt('resources/test.odt').then(function(data) {
        //console.log(data);
    });

    provider.update('resources/test.odt', 'resources/test2.odt', 'mon nouveau content'); 
}

function testAll() {

    // Arguments to give
    // period
    // html template
    // projectCode
}

