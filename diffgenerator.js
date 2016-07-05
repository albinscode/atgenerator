var log = require('./logbridge');
var fs = require('fs');
var mkdirp = require('mkdirp');

// The time parser
var TimeManagementParser = require('./timemanagementparser');
var timeParser = new TimeManagementParser();

// The planning parser
var PlanningParser = require('./planningparser');
var planningParser = new PlanningParser();

// The http connection to linagora time management application
var LinagoraConnection = require('./linagoraconnection');


var moment = require('moment');

function DiffGenerator() {

    var self = this;
    var timeResults;
    var planningResults;

    /**
     * @param object months an object that contains all days with morning and afternoon value.
     * @param object jsonObj contains all information ready to inject in the template
     * @param templateData the template to use for the declaration
     */
    this.generateDiff = function(jsonObj) {
        log.verbose('diff generator', "Generating declarations");
        var date = moment(jsonObj.date);
        // TODO put end of month
        var date2 = '';

        // Browsing the whole month
        while (date.isBefore(date2)) {
            // TODO use timeResults and planningResults
            var storedValue = months[date.format('DDMMYYYY')];
            log.verbose('diff generator', 'Managing ' + date.format('DDMMYYYY'));

            // TODO Add "intelligence here"

            if (storedValue === undefined) {
                log.verbose('diff generator', 'Nothing to perform on this date');
                storedValue = {};
                storedValue.am = false;
                storedValue.pm = false;
            }
            date.add(1, 'days');
        }
    }


    /*
     * TODO see if it is inheritable from activitygenerator.
     * Converts the results array to an object containing keys with DDMMYYYY and a structure with am and pm properties.
     * @param object
     * @param format
     * @param results
    */
    this.convertToObject = function(object, format, results) {
        if (results == null) return;
        results.map(function(value, key) {
            var day = ((key / 2 >> 0) + 1);
            if (day < 10) {
                day = '0' + day;
            }
            var keyString = day + format;
            var valueObj = object[keyString];

            // The first time we are storing value, so it is "am" value
            if (valueObj === undefined) {
                valueObj = {};
                valueObj.am = value;
                object[keyString] = valueObj;
            }
            // The second time, this is "pm" value
            else {
                valueObj.pm = value;
            }

            log.verbose('diff generator', '%j %j %j %j %j', key ,value, day, format, (key / 2 >> 0));
        });
    }

}

/**
 * @param jsonObj the json input object containing all parameters
 * @param user the user to access the obm account
 * @param password the password to access the obm account
 */
DiffGenerator.prototype.generate = function(jsonObj, user, password) {

    var self = this;
    var date = moment(jsonObj.date);

    log.info('diff generator', 'Processing month %j', date.format());

    var connection = new LinagoraConnection(user, password);

    var promises = [];
    var timeResults = {};
    var planningResults = {};
    try {
        promises.push(
            // We fetch the corresponding time page
            connection.getTimePage(date.month() + 1, date.year()).then(function(data) {
                self.convertToObject(timeResults, 'TODO format', timeParser.parse(data.htmlContent));
            })
        );
        promises.push(
            // We fetch the corresponding time page
            connection.getPlanningPage(date.month() + 1, date.year()).then(function(data) {
                self.convertToObject(planningResults, 'TODO format', planningParser.parse(data.htmlContent));
            })
        );
    } catch (e) { log.error('diff generator', e); }

    // We waiActivityGeneratorrt for all promises to terminate
    Promise.all(promises).then(function() {
        // We can now generate files
        log.verbose('diff generator', months);
        log.verbose('diff generator', 'we finished all promises');
        try {
            self.generateDeclarations(months, jsonObj, templateData);
        } catch (e) { log.message(e); }

    });
}

module.exports = DiffGenerator;



