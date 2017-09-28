require('should');
require('mocha');
var log = require('../lib/LogBridge.js');

describe('>>>> Activity processor emitter tests', function() {
    this.timeout(10000);
    it('Should check emitter', function(done) {

        var months = {
            '11072016': { 'am': true, 'pm': false },
            '13072016': { 'am': true, 'pm': true },
            '19072016': { 'am': true, 'pm': false },
            '20072016': { 'am': true, 'pm': false },

        }

        var Processor = require('../lib/ActivityProcessor.js');

        var processor = new Processor();

        processor.on(Processor.EVENT_FIRST_DAY_OF_WEEK, function() {
            log.verbose('test emitter', 'Event >> First day of week! ' + this.activityTotal);
        });
        processor.on(Processor.EVENT_MORNING_DAY, function(value, date) {
            log.verbose('test emitter', 'Event >> A morning has been processed with value %j for date %j and activity total %j', value, date, this.activityTotal);
        });
        processor.on(Processor.EVENT_AFTERNOON_DAY, function(value, date) {
            log.verbose('test emitter', 'Event >> An afternoon has been processed with value %j for date %j and activity total %j', value, date, this.activityTotal);
        });
        processor.on(Processor.EVENT_LAST_DAY_OF_WEEK, function(weekTotal, date) {
            log.verbose('test emitter', 'Total of the week %j / %j', weekTotal, this.activityTotal);
            // First week, we have 1.5 day
            if (date.isSame(moment('20160715'))) {
                weekTotal.should.be.equal(1.5);
                this.activityTotal.should.be.equal(1.5);
            }
            // Second week, we have 1.5 day
            if (date.isSame(moment('20160722'))) {
                weekTotal.should.be.equal(1);
                this.activityTotal.should.be.equal(2.5);
            }
            // Third week, we have 0 day
            if (date.isSame(moment('20160729'))) {
                weekTotal.should.be.equal(0);
                this.activityTotal.should.be.equal(2.5);
            }
        });

        var moment = require('moment');
        processor.process(months, moment('20160711'), moment('20160730'));
        processor.activityTotal.should.be.equal(2.5);
        done();
    });

});
