var fs = require('fs');

function testConnection() {
    var LinagoraConnection = require('./linagoraconnection');

    var connection = new LinagoraConnection('avigier', 'sabine2014');
    // To generate a file
    connection.getPage('05', '2016', 'test/resources/may.html');

    // To get the content directly as a return
    //connection.getPage('04', '2016').then(function(data) {
    //    console.log(data);
    //});
}

function testParsing() {
    var TimeManagementParser = require('./timemanagementparser');

    var parser = new TimeManagementParser();
    fs.readFile('test/resources/may.html', function (err, data) {
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

    fs.readFile('test/resources/bl-example.json', function (err, data) {
        if (err) throw err;
        var filler = new DeclarationFiller();

        filler.updateTemplate('test/resources/AT_13977-02_CRA_modele.odt');

        var content = filler.fill(JSON.parse(data), 'test/resources/AT_13977-02_CRA_modele.odt');

    });
}

function testFs() {

    fs.stat('test/resources/AT_13977-02_CRA_modele.odt', function (err, stats) {

        if (err) throw err;
        console.log('mais cest ok !');
    });
}

function testTemplate() {

    var TemplateProvider = require('./templateprovider.js');
    var provider= new TemplateProvider();
    
    provider.getFromOdt('test/resources/test.odt').then(function(data) {
        //console.log(data);
    });

    provider.update('test/resources/test.odt', 'test/resources/test2.odt', 'mon nouveau content'); 
}

function testAll() {

    // Arguments to give
    // period
    // html template
    // projectCode
}

//testConnection();
testParsing();
//testDeclarationFiller();
//testFs();
//testTemplate();
