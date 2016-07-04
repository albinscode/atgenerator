// This is the sub command to generate the activity report
var program = require('commander');
program
    .version('1.0.0')
    .option('-u --user [user]', 'user to connect to OBM service')
    .option('-p --password <password>', 'password to connect to OBM service')
    //.option('-t --template [value]', 'odt template to use for report')
    .option('-j --json <json>', 'json data to use for report')
    .parse(process.argv);


// Check of parameters not taken into account by commander.
// TODO find a better way to do this and avoid code redundancy.
if (program.user === undefined) throw new Error("You must specify a user");
if (program.password === undefined) throw new Error("You must specify a password");
if (program.json === undefined) throw new Error("You must specify a json file");

var fs = require('fs');
var ActivityGenerator = require('./activitygenerator');

var generator = new ActivityGenerator();

fs.readFile(program.json, function(err, content) {
    generator.generate(JSON.parse(content), program.user, program.password);
});
