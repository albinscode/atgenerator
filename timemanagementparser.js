
var cheerio = require('cheerio');

function TimeManagementParser() {

}


TimeManagementParser.prototype.parse = function(data) {

// https://github.com/cheeriojs/cheerio
        $ = cheerio.load(data);

        console.log($('tr[class=project7191]').html());
        console.log('test');

}

module.exports = TimeManagementParser;
