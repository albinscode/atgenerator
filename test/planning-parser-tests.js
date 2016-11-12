var fs = require('fs');

require('should');
require('mocha');
var ConfigurationTests = require('./configuration-tests');

function parsePlanning(month, expected, done) {
    var PlanningParser = require('../lib/PlanningParser');

    var parser = new PlanningParser('VIGIER', '13977-02');
    fs.readFile('test/resources/planning-' + month + '.html', function (err, data) {
        if (err) throw err;
        var daysWorked = parser.parse(data);
        var days = 0;
        if (daysWorked != null) {
            for (var i = 0; i < daysWorked.length; i++) {
                console.log(i + ' ' + daysWorked[i]);
                if (daysWorked[i]) {
                    days = days + 1;
                }
            }
        }
        days.should.be.equal(expected);
        // Some specific checks for june
        if (month == 'june') {
            daysWorked[0].should.be.equal(true);
            daysWorked[1].should.be.equal(true);
            daysWorked[2].should.be.equal(true);
            daysWorked[3].should.be.equal(true);
            daysWorked[10].should.be.equal(true);
            daysWorked[11].should.be.equal(true);
            daysWorked[12].should.be.equal(true);
            daysWorked[13].should.be.equal(true);
        }
        done();
    });
}

describe('>>>> Planning parser tests', function() {
    this.timeout(10000);
    it('should create planning files', function(done) {
        var LinagoraConnection = require('../lib/LinagoraConnection');

        // By default, we generate them once with account avigier
        done();
        return;
        ConfigurationTests.connectionProperties.groupId = '421';
        var connection = new LinagoraConnection(ConfigurationTests.connectionProperties);
        // To generate the inital files
        connection.getPlanningPage('07', '2016', 'test/resources/planning-july.html').then(function() {
            // To generate a file
            connection.getPlanningPage('06', '2016', 'test/resources/planning-june.html').then(function() {
                //console.log(data.htmlContent);
                done();
            });
        });
    });
    it('should connect planning', function(done) {
        var LinagoraConnection = require('../lib/LinagoraConnection');

        var connection = new LinagoraConnection(ConfigurationTests.connectionProperties);
        // To get the content directly as a return
        connection.getPlanningPage('07', '2016').then(function(data) {
            //console.log(data.htmlContent);
            done();
        });
    });
    it('should parse planning july', function(done) {
        parsePlanning('july', 17, done);
    });
    it('should parse planning june', function(done) {
        parsePlanning('june', 20, done);
    });
});
