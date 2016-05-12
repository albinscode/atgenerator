var fs = require('fs');

function testConnection() {
    var LinagoraConnection = require('./linagoraconnection');

    var connection = new LinagoraConnection('avigier', 'sabine2014');
    connection.getPage('04', '2016', 'outputbodyresponse.html');
}

function testParsing() {
    var TimeManagementParser = require('./timemanagementparser');

    var parser = new TimeManagementParser();
    fs.readFile('test/resources/outputbodyresponse.html', function (err, data) {
        if (err) throw err;
        var daysWorked = parser.parse(data, '20173-01');
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
        var content = filler.fill(JSON.parse(data), 'test/resources/bl-template.html');

        fs.writeFile('test/resources/template-out.html', content);
    });
}

function testAll() {

    // Arguments to give
    // period
    // html template
    // projectCode
}

//testConnection();
//testParsing();
testDeclarationFiller();
