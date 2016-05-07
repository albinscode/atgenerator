var fs = require('fs');

function testConnection() {
    var LinagoraConnection = require('./linagoraconnection');

    var connection = new LinagoraConnection('avigier', 'sabine2014');
    connection.getPage('04', '2016');
}

function testParsing() {
    var TimeManagementParser = require('./timemanagementparser');

    var parser = new TimeManagementParser();
    fs.readFile('outputbodyresponse.html', function (err, data) {
        if (err) throw err;
        parser.parse(data);
    });

}

//testConnection();
testParsing();
