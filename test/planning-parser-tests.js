var fs = require('fs');

require('should');
require('mocha');
var ConfigurationTests = require('./configuration-tests');

function parsePlanning(month) {
    var PlanningParser = require('../lib/PlanningParser');

    var parser = new PlanningParser('VIGIER');
    var data = fs.readFileSync('test/resources/planning-' + month + '.html');
    return parser.parse(data);
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
        var days = parsePlanning('july');
        days.forEach(function(value, key) {
            console.log(key + " : " + value);
        });

        // Two half days with different project codes for same day
        days[22].should.startWith('13977-02');
        days[23].should.startWith('14426-01');

        // Saturday and Sunday shall be not staffed
        days[30].should.be.equal('Not staffed');
        days[31].should.be.equal('Not staffed');
        days[32].should.be.equal('Not staffed');
        days[33].should.be.equal('Not staffed');

        done();
    });
    it('should parse planning june', function(done) {
        parsePlanning('june');
    });
});
