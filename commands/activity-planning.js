// This is the sub command to generate the planning of a worker for given period.
const program = require('commander')
const moment = require('moment')
const fs = require('fs')
const log = require('../lib/util/LogBridge')
const displayPrompt = require('../lib/util/CommandUtils.js')
const createJsonObject = require('../lib/util/Utils')
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
    .parse(process.argv)

let json = createJsonObject(program.json, program)
displayPrompt(program, [ 'user', 'password', 'json', 'worker' ], json).then((answers) => {
    generator(json, {
        user: program.user,
        password: program.password,
        groupId: json.groupId }
    )
})
.catch(reason => log.error('planning command', reason))
