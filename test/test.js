var fs = require('fs');

require('should');
require('mocha');

describe('>>>> Whole tests', function() {
    this.timeout(10000);
    it('should connect', function (done) {
        var LinagoraConnection = require('../linagoraconnection');

        var connection = new LinagoraConnection('avigier', 'sabine2014');
        // To generate a file
        connection.getPage('05', '2016', 'test/resources/may.html').should.not.throw();

        // To get the content directly as a return
        connection.getPage('04', '2016').then(function(data) {
            console.log(data);
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
            //console.log(data);
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

});
