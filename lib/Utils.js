var fs = require('fs');
var log = require('./LogBridge');

function Utils() {
}

/**
 * Create a javascript object from a json file
 * @filepath the file path of the json file to read
 */
Utils.prototype.createJsonObject = function(filepath) {
    var json = null;
    var content = fs.readFileSync(filepath);
    if (content === undefined) {
        log.error('utils', 'The json file %j is not valid', filepath);
    } else {
        json = JSON.parse(content);
    }

    return json;
};

module.exports = new Utils();
