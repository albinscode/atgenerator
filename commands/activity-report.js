// This is the sub command to generate the activity report
var program = require('commander');
var inquirer = require('inquirer');
var fs = require('fs');
var ActivityGenerator = require('../lib/ActivityGenerator');
var Promise = require('promise');
var log = require('../lib/LogBridge');
var commandUtils = require('../lib/CommandUtils.js');
var utils = require('../lib/Utils');

program
    .version('1.0.0')
    .option('-u --user <user>', 'user to connect to OBM service')
    .option('-p --password <password>', 'password to connect to OBM service')
    .option('-j --json <json>', 'json data to use for report')
    .option('-f --format', 'the format to use: csv or console')
    .option('-F --followup', 'to generate the followup due every 6 months')
    .option('-s --startDate <startDate>', 'the starting date')
    .option('-e --endDate <endDate>', 'the ending date')
    .option('-a --activityProject <activityProject>', 'the activity code to filter')
    .parse(process.argv);

    var features = [ 'user', 'password', 'json'];
    // In followup mode we don't need activity project
    if (!program.followup) {
        features.push('activityProject');
    }
    commandUtils.displayPrompt(program, features).then(function(answers) {
        performCommand();
    })
    .catch(function(reason) {
        log.error('report command', reason);
    });

function performCommand() {

    var generator = new ActivityGenerator();
    var json = utils.createJsonObject(program.json, program);
    //log.verbose('report command', JSON.stringify(json));
    var connectionProperties = { user: program.user, password: program.password };
    generator.generate(json, connectionProperties, program.followup);
}
