
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

        //console.log('test' + line.html());
        result = [];
        var index = 0;
        line.find('td').each( function(i, elem) {
           
            // Full day
            if ($(this).attr('title') === '100%') {
                console.log('index ' + index + ': one full day worked!');
                result[index] = true;        
                result[index+1] = true;        
                index = index + 2;
            } 
            // Half a day
            else if ($(this).attr('title') === '50%') {
                console.log('index ' + index + ': one half day worked!');
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
