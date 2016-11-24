var fs = require('fs');
var log = require('./LogBridge');
var moment = require('moment');
require('moment-period');

function Utils() {

    // This will enable us to specify a period (week, month, year) with an added or substracted value.
    // For example, week+2, month+4, etc...
    this.parsePeriod = function(json) {
        // We apply some period analysis (TODO see where to do this in a more business dedicated object)
        var range1 = moment.period(json.startDate);
        var range2 = moment.period(json.endDate);

        // The first date can be used to only define a period (current month, year, etc...)
        if (range1 !== undefined) {
            json.startDate = range1.startDate;
            json.endDate = range1.endDate;
        }
        log.verbose('utils', 'start date %j and end date %j', json.startDate, json.endDate);
        // The second date can be used to redefine the end date
        if (range2 !== undefined) {
            json.endDate = range2.endDate;
        }
        log.verbose('utils', 'start date %j and end date %j', json.startDate, json.endDate);
    };

}

/**
 * Create a javascript object from a json file
 * @filepath the file path of the json file to read
 * @program the program arguments (@see Commander module) if provided
*/
Utils.prototype.createJsonObject = function(filepath, program) {
    var json = null;
    var content = fs.readFileSync(filepath);
    if (content === undefined) {
        log.error('utils', 'The json file %j is not valid', filepath);
    } else {
        json = JSON.parse(content);
    }

    if (program !== undefined) {
        Object.keys(program).forEach(function (key) {
            // TODO By default, we redefine all keys with values from program. See if we will check it with an array of allowed values.
            // if (json[key] !== undefined) {
            if (key !== 'password') {
                log.verbose('utils', 'The json property %j has been overriden by the program argument with value %j', key, program[key]);
                json[key] = program[key];
            }
            //}
        });
    }

    this.parsePeriod(json);
    return json;
};

module.exports = new Utils();
