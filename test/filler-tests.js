require('should');
require('mocha');
var replaceall = require("replaceall");

var log = require('../lib/LogBridge.js');

describe('>>>> filler tests', function() {
    this.timeout(10000);
    it('Should check replace', function(done) {

        var result = replaceall('thing', 'other thing', 'here is my thing');
        result.should.be.equal('here is my other thing');

        result = replaceall('<thing [-:>"', '<other thing>', 'here is my <thing [-:>"');
        result.should.be.equal('here is my <other thing>');

        result = replaceall(
            '<text:p text:style-name="Standard"><text:user-field-get text:name="AM5">$$AM5$$</text:user-field-get></text:p>',
            '<text:p text:style-name="Absent">AM</text:p>',
            "<text:p text:style-name=\"Standard\"><text:user-field-get text:name=\"AM5\">$$AM5$$</text:user-field-get></text:p>");
        result.should.be.equal("<text:p text:style-name=\"Absent\">AM</text:p>");


        var fs = require('fs');

        fs.readFile('test/resources/content-to-replace.xml', 'utf-8', function (err, data) {
            console.log(data);
            if (err) throw err;
            var toReplace = '<text:p text:style-name="Standard"><text:user-field-get text:name="PM1">$$PM1$$</text:user-field-get></text:p>';
            var newString = '<text:p text:style-name="Absent">PM</text:p>';
            result = replaceall(toReplace, newString, data);
            fs.writeFile('test/resources/content-replaced.xml', result, function (err) {
                done();
            });

        });

    });

});
