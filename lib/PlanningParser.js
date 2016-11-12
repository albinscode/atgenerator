var log = require('./LogBridge');
var cheerio = require('cheerio');
/**
 * A simple planning parser that will retrieve all projects of the worker.
 * The array will be a simple array of project code labels.
 * @param worker the name of the worker to extract work days as appearing in the planning.
 */
function PlanningParser(worker) {
    this.worker = worker;
}

/**
 * @param data the html data to parse.
 * @return null if no day worked,
 * or an array of boolean corresponding to the days of the month. True if worked, False otherwise.
 */
PlanningParser.prototype.parse = function(data) {

    var self = this;
    result = null;
    $ = cheerio.load(data);

    // Getting the line corresponding to the worker then go upper one level to access the whole tds containing associated projects.
    var line = $('tr td').filter(
            function(index) {
                return $(this).text().trim() == self.worker;
            }
            ).parent();
    if (line.html() === null) {
        log.info('planning parser', 'There is NO data for this month related to worker %j', this.worker);
        return;
    }
    log.info('planning parser', 'There are data for this month related to worker %j', this.worker);
    result = [];
    var index = 0;

    // Browsing TDs
    line.find('td').each( function(i, elem) {
        try {
            // The two first TDs are to be ignored (
            if (i < 2) {
                return;
            }
            var cell = $(this).find('abbr');

            // There are projects associated to worker
            if (cell !== null && cell !== undefined) {
                var duration =  $(this).attr('rowspan');
                if (duration === null) {
                    log.warn('planning parser', 'There is a problem');
                }
                // There is a duration
                else {
                    // Gets the label of the project
                    var projectLabel = cell.attr('title');

                    var ifNotAWorkingDay = false;

                    // We are on saturday or sunday ;)
                    if (projectLabel === undefined) {
                        projectLabel = 'Not staffed';
                        ifNotAWorkingDay = true;
                    }

                    // Half a day case
                    if (duration == '1') {
                        result[index] = projectLabel.trim();
                        // we mark the line to be filled later
                        result[index+1] = undefined;
                        if (ifNotAWorkingDay) {
                            result[index+1] = projectLabel.trim();
                        }
                        index = index + 2;
                    }
                    // Full day case
                    else if (duration == '2') {
                        // We need to get the full consecutive days
                        duration = parseInt($(this).attr('colspan'));
                        while (duration > 0) {
                            result[index] = projectLabel.trim();
                            result[index+1] = projectLabel.trim();
                            index = index + 2;
                            duration = duration - 1;
                        }
                    }
                }
            }
        } catch (e) {
            log.error('planning parser', 'error detected while looping %j', e);
        }
    });

    // Browsing TDs for afternoon stuff (on a second line)
    line.next().find('td').each( function(i, elem) {
        var cell = $(this).find('abbr');
        // Gets the label of the project
        var projectLabel = cell.attr('title');

        // Searching for a result not yet assign
        result.forEach(function(elem2, i2) {
            if (elem2 === undefined) {
                result[i2] = projectLabel.trim();
            }
        });
    });

    return result;
};

module.exports = PlanningParser;
