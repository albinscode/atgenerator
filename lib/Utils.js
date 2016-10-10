var fs = require('fs');
var log = require('./LogBridge');

function Utils() {
}

/**
 * Create a javascript object from a json file
 * @filepath the file path of the json file to read
 * @program the program arguments (@see Commander module) if provided
*/
Utils.prototype.createJsonObject = function(filepath, program) {
    var json = null;
    var content = fs.readFileSync(filepath);
    if (content === undefined) {
        log.error('utils', 'The json file %j is not valid', filepath);
    } else {
        json = JSON.parse(content);
    }

    console.log(JSON.stringify(program));
    if (program !== undefined) {
        Object.keys(program).forEach(function (key) {
            if (json[key] !== undefined) {
                log.verbose('utils', 'The json property %j has been overriden by the program argument with value %j', key, program[key]);
                json[key] = program[key];
            }
        });
    }
    return json;
};

module.exports = new Utils();
