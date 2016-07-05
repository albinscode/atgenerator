var log = require('./logbridge');
var cheerio = require('cheerio');

function PlanningParser() {

}

/**
 * @param data the html data to parse.
 * @param worker the name of the worker to extract work days as appearing in the planning.
 * @return null if no day worked,
 * or an array of boolean corresponding to the days of the month. True if worked, False otherwise.
 */
PlanningParser.prototype.parse = function(data, worker) {

    result = null;
    $ = cheerio.load(data);

    // Getting the line corresponding to the project code.
    // The line is found as the "a" link content is filled with the project code.
    // We need to go two levels upper to get the whole line (and not the "a" inside the "td").
    var line = $('tr th a').filter(
                function(index) {
                    return $(this).text() === projectCode;
                }
                ).parent().parent();
    if (line.html() === null) {
        log.info('planning parser', 'There is NO data for this month related to project code %j', projectCode);
    } else {
        log.info('planning parser', 'There are data for this month related to project code %j', projectCode);
        result = [];
        var index = 0;
        line.find('td').each( function(i, elem) {

            // Full day
            if ($(this).attr('title') === '100%') {
                log.verbose('planning parser', 'index %j: one full day worked!', index);
                result[index] = true;
                result[index+1] = true;
                index = index + 2;
            }
            // Half a day
            else if ($(this).attr('title') === '50%') {
                log.verbose('planning parser', 'index %j: one half day worked!', index);
                result[index] = true;
                result[index+1] = false;
                index = index + 2;
            } else {
                result[index] = false;
                result[index+1] = false;
                index = index + 2;
            }
        });
    }
    return result;
}

module.exports = PlanningParser;
