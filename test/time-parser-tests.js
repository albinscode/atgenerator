var fs = require('fs');

require('should');
require('mocha');
var ConfigurationTests = require('./configuration-tests');

function parseTime(month) {
    var TimeManagementParser = require('../lib/parser/TimeManagementParser');

    var parser = new TimeManagementParser();
    var data = fs.readFileSync('test/resources/time-' + month + '.html');
    return parser.parse(data);
}

describe('>>>> Time parser tests', function() {
    this.timeout(10000);
    it('should parse time management 25percent', function(done) {
        var days = parseTime('25percent');
        days.forEach(function(value, key) {
            console.log(key + " : " + value);
        });

        // This is 25% day
        days[2].should.be.type('string');
        days[2].should.startWith('21917-21');
        // This is 75% day
        days[3].should.be.type('string');
        days[3].should.startWith('9913-23');

        days[54].should.startWith('9913-23');
        days[55].should.startWith('9913-23');

        // Saturday and Sunday shall be not staffed
        days[8].should.be.equal(false);
        days[9].should.be.equal(false);
        days[10].should.be.equal(false);
        days[11].should.be.equal(false);

        done();
    });
    it('should parse time management september', function(done) {
        var days = parseTime('september');
        days.forEach(function(value, key) {
            console.log(key + " : " + value);
        });

        // An example of two half days with two working halves
        days[8].should.be.type('string');
        days[8].should.startWith('13977-02');
        days[9].should.be.type('string');
        days[9].should.startWith('13977-03');

        done();
    });
});
