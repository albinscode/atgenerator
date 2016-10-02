// This is the sub command to generate the diff between time management and planning
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
var DiffGenerator = require('../lib/DiffGenerator');

var generator = new DiffGenerator();

fs.readFile(program.json, function(err, content) {
    var json = JSON.parse(content);
    var connectionProperties = { user: program.user, password: program.password, groupId: json.groupId };

    generator.generate(json, connectionProperties);
});

