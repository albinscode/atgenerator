#!/usr/bin/env node

// This is the sub command to generate the activity report
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
    .option('-F --followup', 'to generate the followup due every 6 months')
    .option('-M --monthlyAtReport', 'to generate the monthly at report (used by agency director)')
    .option('-s --startDate <startDate>', 'the starting date')
    .option('-e --endDate <endDate>', 'the ending date')
    .parse(process.argv)

let features = [ 'user', 'password', 'json']
// In followup mode we don't need activity project
if (!program.followup) {
    features.push('activityProject')
}

let json = createJsonObject(program.json, program)

displayPrompt(program, features, json).then((answers) => {
    let generator = new ActivityGenerator()
    let json = createJsonObject(program.json, program)
    let connectionProperties = {
        user: program.user,
        password: program.password
    }
    generator.generate(json, connectionProperties, {
        followup: program.followup,
        monthlyAtReport: program.monthlyAtReport
    })
})
.catch(function(reason) {
    log.error('report command', reason)
})
