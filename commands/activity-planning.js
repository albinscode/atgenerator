// This is the sub command to generate the planning of a worker for given period.
var program = require('commander');
var moment = require('moment');
var fs = require('fs');
var log = require('../lib/util/LogBridge');
var commandUtils = require('../lib/util/CommandUtils.js');
var utils = require('../lib/util/Utils');

program
    .version('1.0.0')
    .option('-u --user <user>', 'user to connect to OBM service')
    .option('-p --password <password>', 'password to connect to OBM service')
    .option('-j --json <json>', 'json data to use for diff generation')
    .option('-f --format', 'the format to use: csv or console')
    .option('-s --startDate <startDate>', 'the starting date')
    .option('-e --endDate <endDate>', 'the ending date')
    .option('-w --worker <worker>', 'the worker to display associated planning')
    .parse(process.argv);

    var json = utils.createJsonObject(program.json, program);
    commandUtils.displayPrompt(program, [ 'user', 'password', 'json', 'worker' ], json).then(function(answers) {
        performCommand();
    })
    .catch(function(reason) {
        log.error('planning command', reason);
    });

/**
 * Performs the planning command wether it is from interactive or non interactive mode.4
 */
function performCommand() {
    var PlanningGenerator = require('../lib/generator/PlanningGenerator');

    var generator = new PlanningGenerator();
    var json = utils.createJsonObject(program.json, program);

    var connectionProperties = { user: program.user, password: program.password, groupId: json.groupId };

    generator.generate(json, connectionProperties);
}

