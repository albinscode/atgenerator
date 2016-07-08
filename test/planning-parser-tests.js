var fs = require('fs');

require('should');
require('mocha');

describe('>>>> Planning parser tests', function() {
    this.timeout(10000);
    it('should connect planning', function (done) {
        var LinagoraConnection = require('../linagoraconnection');

        var connection = new LinagoraConnection('avigier', 'sabine2014');
        // To generate a file
        connection.getPlanningPage('07', '2016', 'test/resources/planning-july.html').should.not.throw();

        // To get the content directly as a return
        connection.getPlanningPage('07', '2016').then(function(data) {
            //console.log(data.htmlContent);
            done();
        }).should.not.throw();
    });
    it('should parse planning', function(done) {
        var PlanningParser = require('../planningparser');

        var parser = new PlanningParser();
        fs.readFile('test/resources/planning-july.html', function (err, data) {
            if (err) throw err;
            var daysWorked = parser.parse(data, 'VIGIER', '13977-02');
            var days = 0;
            if (daysWorked != null) {
                for (var i = 0; i < daysWorked.length; i++) {
                    console.log(i + ' ' + daysWorked[i]);
                    if (daysWorked[i]) {
                        days = days + 1;
                    }
                }
            }
            days.should.be.equal(17);
            done();
        });
    });
});
