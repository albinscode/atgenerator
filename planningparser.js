var log = require('./logbridge');
var cheerio = require('cheerio');
/**
 * @param worker the name of the worker to extract work days as appearing in the planning.
 * @param projectCode project code associated to the worker.
 */
function PlanningParser(worker, projectCode) {
    this.worker = worker;
    this.projectCode = projectCode;
}

/**
 * @param data the html data to parse.
 * @return null if no day worked,
 * or an array of boolean corresponding to the days of the month. True if worked, False otherwise.
 */
PlanningParser.prototype.parse = function(data) {

    result = null;
    $ = cheerio.load(data);

    // Getting the line corresponding to the worker then go upper one level to access the whole tds containing associated projects.
    var line = $('tr td').filter(
            function(index) {
                return $(this).text() === this.worker;
            }
            ).parent();
    if (line.html() === null) {
        log.info('planning parser', 'There is NO data for this month related to worker %j and project code %j', this.worker, this.projectCode);
        return;
    }
    log.info('planning parser', 'There are data for this month related to worker %j and project code %j', this.worker, this.projectCode);
    result = [];
    var index = 0;
    line.find('td').each( function(i, elem) {

        var cell = $(this).find('abbr');

        // There are projects associated to worker
        if (cell != null) {
            var duration =  $(this).attr('rowspan');
            if (duration == null) {
                log.warn('There is a problem');
            }
            // There is a duration
            else {
                // Gets the label of the project
                var projectLabel = cell.attr('title');

                // We are on saturday or sunday ;)
                if (projectLabel == null) {
                    projectLabel = 'Not a working day';
                }
                var ifFits = projectLabel.indexOf(this.projectCode) == 0;
                if (ifFits) {
                    log.verbose("%j fits the project code %j", projectLabel, this.projectCode);
                }

                // Half a day case
                if (duration == '1') {
                    result[index] = ifFits;
                    result[index+1] = false;
                    index = index + 2;
                }
                // Full day case
                else if (duration == '2') {
                    // We need to get the full consecutive days
                    duration = parseInt($(this).attr('colspan'));
                    while (duration > 0) {
                        result[index] = ifFits;
                        result[index+1] = ifFits;
                        index = index + 2;
                        duration = duration - 1;
                    }
                }
            }
        }
    });

    return result;
}

module.exports = PlanningParser;
