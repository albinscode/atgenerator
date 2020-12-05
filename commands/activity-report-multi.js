// This is the sub command to generate the activity report
// for several people.
// It will be almost the same as activity-report but the main
// difference is that it will copy some specific configuration
// properties for each people: number of hours per month, name, etc...
// WARNING It will use the planning too instead of time management!
const program = require('commander')
const inquirer = require('inquirer')
const fs = require('fs')
const ActivityGenerator = require('../lib/generator/ActivityGenerator')
const Promise = require('promise')
const log = require('../lib/util/LogBridge')
const displayPrompt = require('../lib/util/CommandUtils.js')
const createJsonObject = require('../lib/util/Utils')

program
    .version('1.0.0')
    .option('-u --user <user>', 'user to connect to OBM service')
    .option('-p --password <password>', 'password to connect to OBM service')
    .option('-j --json <json>', 'json data to use for report')
    .option('-f --format', 'the format to use: csv or console')
    .option('-s --startDate <startDate>', 'the starting date')
    .option('-e --endDate <endDate>', 'the ending date')
    .option('-C --cache', 'cache activation')
    .option('-W --workspace', 'defines the linshare workspace uuid to use for uploading')
    .option('-L --linshare', 'uploads file(s) on linshare using given workspace uuuid')
    .parse(process.argv)

let features = [ 'user', 'password', 'json']

let json = createJsonObject(program.json, program)

displayPrompt(program, features, json).then(async (answers) => {
    let generator = new ActivityGenerator()

    // we use a global configuration (as for followup)
    let json = createJsonObject(program.json, program)
    let connectionProperties = {
        user: program.user,
        password: program.password,
        groupId: json.groupId,
        cacheEnabled: program.cache,
    }

    // we load the workers file that contains all worker
    // we want to integrate for our report
    const users = require('../' + json.workersFile)

    // we now browse each user related config to generate
    // dedicated followup report
    // We use a for to wait for each user to be processed
    // rather to be run in parallel
    for (const userId of Object.keys(users)) {

        log.info('activity-report-multi', "Processing user %j", userId)
        let user = users[userId]

        // we duplicate the original json
        let jsonUser = {...json}
        // we update global config with specific config
        Object.assign(jsonUser, {...user})

        // we set the specific prefix for final generated file
        jsonUser.filenameFinalPattern = `${userId}_${json.filenameFinalPattern}`

        // we set worker
        jsonUser.worker = userId

        await generator.generate({...jsonUser}, connectionProperties, {
                followUpReport:  true,
                monthlyAtReport: false,
                parser: 'planning'
            })

        // we upload on linshare
        if (program.linshare) {
            if (jsonUser.workspace === undefined) {
                throw new Error('You have to provide a workspace uuuid if you want to upload files on Linshare')
            }

        }
    }
})
.catch(function(reason) {
    log.error('report command', reason)
})
