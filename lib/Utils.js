var fs = require('fs');
var log = require('./LogBridge');
var moment = require('moment');

function Utils() {

    // This will enable us to specify a period (week, month, year) with an added or substracted value.
    // For example, week+2, month+4, etc...
    this.parsePeriod = function(json) {
        // We apply some period analysis (TODO see where to do this in a more business dedicated object)
        var startDate = json.startDate;
        var endDate = json.endDate;
        if (startDate !== undefined) {

            var fullString = startDate;
            var period = fullString;
            var modifierNumber = 0;

            // 1 for addition, -1 for substration
            var modifierOperation = 1;
            var split = fullString.split('+');
            if (split.length == 2) {
                modifierNumber = parseInt(split[1]);
                period = split[0];
            }
            // Substration case
            else {
                split = fullString.split('-');
                if (split.length == 2) {
                    modifierOperation = -1;
                    modifierNumber = parseInt(split[1]);
                    period = split[0];
                }
            }

            if (period == 'week') {
                startDate = moment().add('weeks', modifierNumber * modifierOperation).isoWeekday(1);
                endDate = moment().add('weeks', modifierNumber * modifierOperation).isoWeekday(5);
            }
            else if (period == 'month') {
                startDate = moment().add('months', modifierNumber * modifierOperation).date(1);
                endDate = moment().add('months', modifierNumber * modifierOperation).add('months', 1).date(0);
            }
            else if (period == 'year') {
                startDate = moment().add('years', modifierNumber * modifierOperation).month(0).day(1);
                endDate = moment().add('years', modifierNumber * modifierOperation).month(11).add('months', 1).day(0);
            }

        }

        // We assign the new dates if any
        json.startDate = startDate;
        json.endDate = endDate;

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
                log.verbose('utils', 'The json property %j has been overriden by the program argument with value %j', key, program[key]);
                json[key] = program[key];
            //}
        });
    }

    this.parsePeriod(json);
    return json;
};

module.exports = new Utils();
