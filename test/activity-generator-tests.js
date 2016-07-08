var fs = require('fs');

require('should');
require('mocha');

describe('>>>> Whole tests', function() {
    this.timeout(10000);
    it('should connect', function (done) {
        var LinagoraConnection = require('../linagoraconnection');

        var connection = new LinagoraConnection('avigier', 'sabine2014');
        // To generate a file
        connection.getTimePage('05', '2016', 'test/resources/may.html').should.not.throw();

        // To get the content directly as a return
        connection.getTimePage('04', '2016').then(function(data) {
            console.log(data.htmlContent);
            done();
        }).should.not.throw();
    });
    it('should parse', function(done) {
        var TimeManagementParser = require('../timemanagementparser');

        var parser = new TimeManagementParser();
        fs.readFile('test/resources/may.html', function (err, data) {
            if (err) throw err;
            var daysWorked = parser.parse(data, '13977-02');
            if (daysWorked != null) {
                for (var i = 0; i < daysWorked.length; i++) {
                    console.log(daysWorked[i]);
                }
            }
            done();
        });
    });
    it('should fill', function(done) {

        var DeclarationFiller = require('../declarationfiller.js');

        fs.readFile('test/resources/bl-example.json', function (err, data) {
            if (err) throw err;
            var filler = new DeclarationFiller();

            var content = filler.fill(JSON.parse(data), 'Hi, my name is $$companyConsultant$$ from $$companyFull$$, I\'m working hard for $$customerContact$$');
            console.log(content);
            done();
        });
    });
    it('Should load template', function(done) {

        var TemplateProvider = require('../templateprovider.js');
        var provider = new TemplateProvider();

        provider.getFromOdt('test/resources/test.odt').then(function(data) {
            console.log(data.content);
            console.log(data.footer);
            done();
        });
    });
    it('Should update template', function(done) {

        var TemplateProvider = require('../templateprovider.js');
        var provider = new TemplateProvider();

        provider.update('test/resources/test.odt', 'test/resources/test2.odt', 'mon nouveau content').then(function() {
            done();
        });
    });
    it('Should check the dates', function(done) {

        var ActivityGenerator = require('../activitygenerator.js');
        var generator = new ActivityGenerator();
        var moment = require('moment');
        function checkDates(date1, date2) {
            generator.date1 = moment(date1);
            generator.date2 = moment(date2);
            generator.checkDates();
        }
        checkDates('20160101', '20160203');
        moment('20151228').isSame(generator.date1).should.be.true();
        moment('20160205').isSame(generator.date2).should.be.true();

        //checkDates('20160203', '20160103').should.throw();

        // Dates after the processing
        console.log(generator.date1.format('DDMMYYY') + ' ' + generator.date2.format('DDMMYYY'));
        done();
    });
    if('Should convert the array', function(done) {
        // TODO See how to test without a require (thus no class description of main.js)
        function convertToObjectTest() {

            var obj = {};
            var month = [
                true,
                true,

                false,
                false,

                true,
                false,

                false,
                true
            ];
            convertToObject(obj, '052016', month);

            console.log(obj);
        }
    });

});
