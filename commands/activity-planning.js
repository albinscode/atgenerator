#!/usr/bin/env node

// This is the sub command to generate the planning of a worker for given period.
const program = require('commander')
const moment = require('moment')
const fs = require('fs')
const log = require('../lib/util/LogBridge')
const displayPrompt = require('../lib/util/CommandUtils.js')
const createJsonObject = require('../lib/util/Utils').createJsonObject
const generator = require('../lib/generator/PlanningGenerator')

program
    .version('1.0.0')
    .option('-u --user <user>', 'user to connect to OBM service')
    .option('-p --password <password>', 'password to connect to OBM service')
    .option('-j --json <json>', 'json data to use for diff generation')
    .option('-f --format', 'the format to use: csv or console')
    .option('-s --startDate <startDate>', 'the starting date')
    .option('-e --endDate <endDate>', 'the ending date')
    .option('-w --worker <worker>', 'the worker to display associated planning')
    .option('-C --cache', 'cache activation')
    .parse(process.argv)

let json = createJsonObject(program.json, program)
displayPrompt(program, [ 'user', 'password', 'json', 'worker' ], json).then((answers) => {
    // json has to be fetched because it has been lately provided by user
    if (answers.json) json = createJsonObject(program.json, program)
    generator(json, {
        user: program.user,
        password: program.password,
        groupId: json.groupId,
        cacheEnabled: program.cache,
    })
})
.catch(reason => log.error('planning command', reason))
