var log = require('./LogBridge');
var cheerio = require('cheerio');

/**
 * @param projectCode the string of the project code to extract.
 */
function TimeManagementParser() {

    log.verbose('time parser', 'Entering constructor');
}

/**
 * @param data the html data to parse.
 * @return null if no day worked
 * or an array.
 * The array will be of the full project description is returned.
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
                    log.verbose('time parser', 'There is NO data for this month');
                } else {
                    log.verbose('time parser', 'There are data for this month related');
                    var index = 0;
                    line.root.find('td').each( function(i, elem) {

                        var titleAttr = $(this).attr('title');
                        // Full day
                        if (titleAttr === '100%') {
                            log.verbose('time parser', 'index %j: one full day detected!', index);
                            result[index] = line.projectCode;
                            result[index+1] = line.projectCode;
                            index = index + 2;
                        }
                        // Half a day
                        // But also quarter of days. Only last one will be taken into account.
                        // We do not manage quarter of days currently (TODO).
                        else if (titleAttr === '50%' || titleAttr === '25%' || titleAttr === '75%') {
                            log.verbose('time parser', 'index %j: one half day detected!', index);
                            // To avoid overriding a previously pushed value
                            // If the first slot is free we use it
                            if (result[index] === undefined || result[index] === false) {
                                result[index] = line.projectCode;
                            } else {
                                result[index+1] = line.projectCode;
                            }
                            // To avoid overriding a previously pushed value
                            if (result[index+1] === undefined || result[index] === false) {
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
