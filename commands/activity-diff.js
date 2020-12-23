#!/usr/bin/env node

const createJsonObject = require('../lib/util/Utils').createJsonObject
const displayPrompt = require('../lib/util/CommandUtils.js')
const log = require('../lib/util/LogBridge')
const DiffGenerator = require('../lib/generator/DiffGenerator')

// This is the sub command to generate the diff between time management and planning
let program = require('commander')
program
    .version('1.0.0')
    .option('-u --user <user>', 'user to connect to OBM service')
    .option('-p --password <password>', 'password to connect to OBM service')
    .option('-j --json <json>', 'json data to use for diff generation')
    .option('-s --startDate <startDate>', 'the starting date')
    .option('-e --endDate <endDate>', 'the ending date')
    .parse(process.argv)

let json = createJsonObject(program.json, program)

displayPrompt(program, [ 'user', 'password', 'json' ], json).then((answers) => {

    let generator = new DiffGenerator()
    let json = createJsonObject(program.json, program)
    let connectionProperties = {
        user: program.user,
        password: program.password,
        groupId: json.groupId
    }

    generator.generate(json, connectionProperties)
})
.catch(function(reason) {
    log.error('planning command', reason)
})

