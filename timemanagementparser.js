var log = require('./logbridge');
var cheerio = require('cheerio');
/**
 * @param projectCode the string of the project code to extract.
 */
function TimeManagementParser(projectCode) {

    log.verbose('time parser', 'Entering constructor');
    this.projectCode = projectCode;
}

/**
 * @param data the html data to parse.
 * @return null if no day worked for the project code,
 * or an array of boolean corresponding to the days of the month. True if worked, False otherwise.
 */
TimeManagementParser.prototype.parse = function(data) {

    var self = this;
    log.verbose('time parser', 'Entering parsing function');
    result = null;
    $ = cheerio.load(data);

    // Getting the line corresponding to the project code.
    // The line is found as the "a" link content is filled with the project code.
    // We need to go two levels upper to get the whole line (and not the "a" inside the "td").
    var line = $('tr th a').filter(
                function(index) {
                    return $(this).text() === self.projectCode;
                }
                ).parent().parent();
    if (line.html() === null) {
        log.info('time parser', 'There is NO data for this month related to project code %j', this.projectCode);
    } else {
        log.info('time parser', 'There are data for this month related to project code %j', this.projectCode);
        result = [];
        var index = 0;
        line.find('td').each( function(i, elem) {

            // Full day
            if ($(this).attr('title') === '100%') {
                log.verbose('time parser', 'index %j: one full day worked!', index);
                result[index] = true;
                result[index+1] = true;
                index = index + 2;
            }
            // Half a day
            else if ($(this).attr('title') === '50%') {
                log.verbose('time parser', 'index %j: one half day worked!', index);
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

module.exports = TimeManagementParser;
