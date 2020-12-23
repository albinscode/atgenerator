const fs = require('fs')
const log = require('../util/LogBridge')
const moment = require('moment')
require('moment-period')

/**
 * This utility allows to perform some actions on json config file:
 * - merge config with command arguments
 * - converts dates to moment
 * FIXME no class needed, use only static functions
 */

// This will enable us to specify a period (week, month, year) with an added or substracted value.
// For example, week+2, month+4, etc...
function parsePeriod(json) {
    // We apply some period analysis (TODO see where to do this in a more business dedicated object)
    let range1 = moment.period(json.startDate)
    let range2 = moment.period(json.endDate)

    // The first date can be used to only define a period (current month, year, etc...)
    if (range1 !== undefined) {
        json.startDate = range1.startDate
        json.endDate = range1.endDate
    }
    log.verbose('utils', 'start date %j and end date %j', json.startDate, json.endDate)
    // The second date can be used to redefine the end date
    if (range2 !== undefined) {
        json.endDate = range2.endDate
    }
    log.verbose('utils', 'start date %j and end date %j', json.startDate, json.endDate)
}

/**
 * @return working directory in json if set, otherwise the absolute path computed
 * from relative path
 */
function getWorkingDirectory(json, relativePath) {
    return json['workingDirectory'] ? json['workingDirectory'] : __dirname + relativePath
}

/**
 * Redefines given key with an absolute path
 */
function setAbsolutePath(json, key) {
    // we put absolute paths
    if (json[key]) {
        // uses working directory if defined otherwise computed from __dirname
        let dir = getWorkingDirectory(json, '/../..')
        json[key] = dir + '/' + json[key]
    }
}

/**
 * Create a javascript object from a json file
 * @param filepath the file path of the json file to read
 * @param program the program arguments (@see Commander module) if provided
*/
function createJsonObject(filepath, program) {
    let json = null
    // we don't throw exception in order to ask user for json through inquirer questions
    if (!fs.existsSync(filepath)) return {}

    let content = fs.readFileSync(filepath)
    if (content === undefined) {
        log.error('utils', 'The json file %j is not valid', filepath)
    } else {
        json = JSON.parse(content)
    }

    if (program !== undefined) {
        Object.keys(program).forEach((key) => {
            if (key !== 'password') {
                // FIXME we have to check if it is primitive type, otherwise we will inject objects!
                // see if feature really interesting. Pb reproduced with a monthly activity report
                let value = program[key]
                if (key.indexOf('_') !== 0 && typeof value === 'string') {
                    log.verbose('utils', 'The json property %j has been overriden by the program argument with value %j', key, program[key])
                    json[key] = program[key]
                }
            }
        })
    }

    // we set path
    if (json) {
        setAbsolutePath(json, 'odtTemplate')
    }

    parsePeriod(json)
    return json
}

module.exports.createJsonObject = createJsonObject
module.exports.getWorkingDirectory = getWorkingDirectory
