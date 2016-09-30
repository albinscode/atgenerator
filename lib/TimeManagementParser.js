var log = require('./LogBridge');
var cheerio = require('cheerio');

// TODO improve this file by removing the object concept. A single function is enough and will avoid "self" and prototypes only for one function!

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
 * or an array.
 * The array will be of booleans (when projectCode is provided) corresponding to the days of the month. True if worked, False otherwise.
 */
TimeManagementParser.prototype.parse = function(data) {

    var self = this;
    log.verbose('time parser', 'Entering parsing function');
    result = null;
    $ = cheerio.load(data);

    // The array that contains the data to exploit
    var result = [];

    // The line is found as the "a" link content is filled with the project code.
    // We need to go two levels upper to get the whole line (and not the "a" inside the "td").
    $('tr th a')
        .filter(
            function() {
                // Getting the line corresponding to the project code.
                if (self.projectCode != null) {
                    return $(this).text() === self.projectCode;
                }
                // We get all projects
                return true;
            }
        )
        .map(
            // We get the grand father of the found element
            // And we keep a reference on the project code
            function (k, elem) {
                return { "root": $(elem).parent().parent(), "projectCode": $(elem).text() };
            }
        )
        .each(
            function (j, line) {

                if (line.root.html() === null) {
                    log.info('time parser', 'There is NO data for this month related to project code %j', self.projectCode);
                } else {
                    log.info('time parser', 'There are data for this month related to project code %j', self.projectCode);
                    var index = 0;
                    line.root.find('td').each( function(i, elem) {

                        // Full day
                        if ($(this).attr('title') === '100%') {
                            log.verbose('time parser', 'index %j: one full day worked!', index);
                            result[index] = line.projectCode;
                            result[index+1] = line.projectCode;
                            index = index + 2;
                        }
                        // Half a day
                        else if ($(this).attr('title') === '50%') {
                            log.verbose('time parser', 'index %j: one half day worked!', index);
                            result[index] = line.projectCode;
                            result[index+1] = false;
                            index = index + 2;
                        } else {
                            result[index] = false;
                            result[index+1] = false;
                            index = index + 2;
                        }
                    });
                }
            }
        );

    return result;
}

module.exports = TimeManagementParser;
