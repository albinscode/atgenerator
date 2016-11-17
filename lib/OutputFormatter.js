var log = require('./LogBridge');
var replaceall = require('replaceall');
var moment = require('moment');
var fs = require('fs');

function OutputFormatter() {
    // an array containing the amount of day worked for this specific day
    this.values = [];
    // an array containing the dates for each day
    this.headers = [];
    // Contains the consumption per project
    // key: project code and label, value : number of days
    this.sumObject = {};
}

/**
 * Sums all the values for the given project.
 * This is store in the sumObject property.
 * @param project the project to whiche we have to add a value
 * @param value the value to add (shall be a float: 0, 0.5, 1)
 * @param date the date at which the value is applicable.
 */
OutputFormatter.prototype.sumActivity = function(project, value, date) {
    if (this.sumObject[project] === undefined) {
        this.sumObject[project] = { consumed: 0, affected: 0 };
    }
    if (date.isBefore(moment())) {
        this.sumObject[project].consumed = parseFloat(this.sumObject[project].consumed) + parseFloat(value);
    }

    this.sumObject[project].affected = parseFloat(this.sumObject[project].affected) + parseFloat(value);
};

/**
 * @param jsonObj the json object containing all parameters.
 */
OutputFormatter.prototype.buildCsv = function (jsonObj) {
    // Replaces the variables in file pattern
    var filenamePattern = jsonObj.filenamePattern;
    Object.keys(jsonObj).forEach(function(key) {
        var value = jsonObj[key];
        if (typeof(value) === 'string') {
            filenamePattern = replaceall('$$' + key + '$$', value, filenamePattern);
        }
    });

    log.info('output formatter', 'Writing csv file: %j/%j', jsonObj.filepath, filenamePattern);
    fs.writeFile(jsonObj.filepath + '/' + filenamePattern, this.headers.join(jsonObj.csvSeparator) + '\n' + this.values.join(jsonObj.csvSeparator));
};

/**
 * @param jsonObj the json object containing all parameters.
 */
OutputFormatter.prototype.buildConsoleOutput = function (jsonObj) {
    var today = moment().format(jsonObj.patternDateFormat);
    var self = this;
    log.format('', '');
    // Printing each activity
    this.headers.forEach(function(value, index) {
        var prefix = '   ';
        if (value.indexOf(today) != -1) {
            prefix = '(*)';
        }
        log.format(prefix + value, self.values[index]);
    });
    log.format('', '');
    // Printing the affected and consumed
    var affected = 0;
    var consumed = 0;
    Object.keys(this.sumObject).forEach(function(key) {
        log.format(key + ':', '%j / %j', self.sumObject[key].consumed, self.sumObject[key].affected);
        affected += self.sumObject[key].affected;
        consumed += self.sumObject[key].consumed;
    });
    log.format('TOTAL:', '%j / %j', consumed, affected);
};

/**
 * @param the value to add to the values array.
 */
OutputFormatter.prototype.push = function(value) {
    this.values.push(value);
};

/**
 * @param the value to add to the headers array.
 */
OutputFormatter.prototype.pushHeaders = function(value) {
    this.headers.push(value);
};

module.exports = OutputFormatter;
