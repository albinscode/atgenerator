var log = require('./LogBridge');

var moment = require('moment');
var fs = require('fs');
var mkdirp = require('mkdirp');

var PlanningParser = require('./PlanningParser');
var TimeManagementParser = require('./TimeManagementParser');

/**
 * Allows to get valid data from the current json used for the requested activity command.
 * @param jsonObj
 */
function JsonRules(jsonObj) {
    this.jsonObj = jsonObj;

    /**
     * @param the key value to check in the json obj
     * @param the default value to store if empty of undefined.
     * @return the value updated if empty or undefined.
     * It updates the value in json too!
     */
    this.getValue = function (value, defaultValue) {
        if (this.jsonObj[value] === undefined || this.jsonObj[value] === '') {
            this.jsonObj[value] = defaultValue;
            return defaultValue;
        }
        return value;
    };
    /**
     * @param the key value to check in the json obj
     * @param the default value to store if empty of undefined.
     * @return the value updated if empty or undefined.
     * It updates the value in json too!
     */
    this.getMomentValue = function (key, defaultValue) {
        var value = this.jsonObj[key];
        if (value === undefined || value ===  '') {
            this.jsonObj[key] = defaultValue;
            return defaultValue;
        }
        if (!moment.isMoment(value)) {
            this.jsonObj[key] = moment(value, 'YYYYMMDD');
        }
        return this.jsonObj[key];
    };

}

/**
 * @return the start date defined in the json obj, start of month if not defined or empty.
 */
JsonRules.prototype.getStartDate = function() {
    return this.getMomentValue('startDate', moment(moment().startOf('month')));
};

/**
 * @return the end date defined in the json obj, end of month if not defined or empty.
 */
JsonRules.prototype.getEndDate = function() {
    return this.getMomentValue('endDate', moment(moment().endOf('month')));
};

/**
 * @return the file path and create it if provided (not undefined and not empty string).
 */
JsonRules.prototype.getFilePath = function() {
    var filePath = this.getValue('filepath', '');
    if (filePath !== '') {
        log.verbose('json rules', 'Creating needed directories');
        fs.lstat(filePath, function(err) {
            if (err) {
                mkdirp(filePath);
                log.verbose('json rules', 'filepath created');
            }
        });
    }
    return filePath;
};

/**
 * @return the associated planning parser depending on json rules (if activity project is provided or not).
 */
JsonRules.prototype.getPlanningParser = function() {

    return new PlanningParser(this.jsonObj.worker);
};

/**
 * @return the associated time parser depending on json rules (if activity project is provided or not).
 */
JsonRules.prototype.getTimeParser = function() {

    return new TimeManagementParser(this.jsonObj.activityProject);
};

/**
 * Check moment dates validity.
 */
JsonRules.prototype.checkDates = function() {
    if (this.getStartDate().isAfter(this.getEndDate())) throw new Error('Your period is not valid');
};

module.exports = JsonRules;
