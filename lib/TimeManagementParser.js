var log = require('./LogBridge');
var cheerio = require('cheerio');

// TODO improve this file by removing the object concept. A single function is enough and will avoid "self" and prototypes only for one function!

/**
 * @param projectCode the string of the project code to extract.
 */
function TimeManagementParser(projectCode) {

    log.verbose('time parser', 'Entering constructor');
    if (projectCode === undefined) projectCode = '';
    this.projectCode = projectCode;
    log.verbose('time parser', 'Exiting constructor');
}

/**
 * @param data the html data to parse.
 * @return null if no day worked for the project code,
 * or an array.
 * The array will be of booleans (when projectCode is provided) corresponding to the days of the month. True if worked, False otherwise.
 * If no project code is provided, the full project description is returned.
 */
TimeManagementParser.prototype.parse = function(data) {

    var self = this;
    log.verbose('time parser', 'Entering parsing function');
    result = null;
    $ = cheerio.load(data);

    // The array that contains the data to exploit
    var result = [];

    // The line is found as the "a" link or "abbr" (for holidays) content is filled with the project code.
    // We need to go two levels upper to get the whole line (and not the "a" inside the "td").
    //$('tr th a')
    $('tr th')
        .filter(
            function() {
                // Getting the line corresponding to the project code.
                if (self.projectCode !== '') {
                    log.verbose('time parse', 'a project has been specified');
                    return $(this).children().first().text() === self.projectCode;
                }
                // We get all projects
                return true;
            }
        )
        .map(
            // We get the grand father of the found element
            // And we keep a reference on the project code
            function (k, elem) {
                // We fill it with the full label contained within the "title" attribute
                return { "root": $(elem).children().first().parent().parent(), "projectCode": $(elem).children().first().attr('title') };
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
                            // To avoid overrind a previously pushed value
                            if (result[index+1] === undefined) {
                                result[index+1] = false;
                            }
                            index = index + 2;
                        } else {
                            if (result[index] === undefined) {
                                result[index] = false;
                            }
                            if (result[index+1] === undefined) {
                                result[index+1] = false;
                            }
                            index = index + 2;
                        }
                    });
                }
            }
        );

    return result;
};

module.exports = TimeManagementParser;
