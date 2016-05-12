
var cheerio = require('cheerio');

function TimeManagementParser() {

}

/**
 * @param data the html data to parse.
 * @param projectCode the string of the project code to extract.
 * @return null if no day worked for the project code, 
 * or an array of boolean corresponding to the days of the month. True if worked, False otherwise.
 */
TimeManagementParser.prototype.parse = function(data, projectCode) {

    result = null;
    // https://github.com/cheeriojs/cheerio
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
        console.log("There is no data related to project code " + projectCode);
    } else {

        console.log('test' + line.html());
        result = [];
        line.find('td').each( function(i, elem) {
            
            if ($(this).attr('title') === '100%') {
                result[i] = true;        
                console.log('index ' + i + ': one day worked!');
            } else {
                result[i] = false;
            }
        });
    }
    return result;
}

module.exports = TimeManagementParser;
