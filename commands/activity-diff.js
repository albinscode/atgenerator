var utils = require('../lib/Utils');
var commandUtils = require('../lib/CommandUtils.js');

// This is the sub command to generate the diff between time management and planning
var program = require('commander');
program
    .version('1.0.0')
    .option('-u --user <user>', 'user to connect to OBM service')
    .option('-p --password <password>', 'password to connect to OBM service')
    .option('-j --json <json>', 'json data to use for diff generation')
    .option('-s --startDate <startDate>', 'the starting date')
    .option('-e --endDate <endDate>', 'the ending date')
    .parse(process.argv);

commandUtils.displayPrompt(program, [ 'user', 'password', 'json' ]).then(function(answers) {
    performCommand();
})
.catch(function(reason) {
    log.error('planning command', reason);
});

function performCommand() {

    var DiffGenerator = require('../lib/DiffGenerator');

    var generator = new DiffGenerator();
    var json = utils.createJsonObject(program.json, program);
    var connectionProperties = { user: program.user, password: program.password, groupId: json.groupId };

    generator.generate(json, connectionProperties);
}

