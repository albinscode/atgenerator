// This is the sub command to generate the planning of a worker for given period.
var program = require('commander');
program
    .version('1.0.0')
    .option('-u --user <user>', 'user to connect to OBM service')
    .option('-p --password <password>', 'password to connect to OBM service')
    .option('-j --json <json>', 'json data to use for diff generation')
    .parse(process.argv);

// Check of parameters not taken into account by commander.
if (program.user === undefined) throw new Error("You must specify a user");
if (program.password === undefined) throw new Error("You must specify a password");
if (program.json === undefined) throw new Error("You must specify a json file");

var fs = require('fs');
var PlanningGenerator = require('../lib/PlanningGenerator');

var generator = new PlanningGenerator();

fs.readFile(program.json, function(err, content) {
    generator.generate(JSON.parse(content), program.user, program.password);
});

