// This is the sub command to generate the activity report
var program = require('commander');
var inquirer = require('inquirer');
var fs = require('fs');
var ActivityGenerator = require('../lib/ActivityGenerator');


program
    .version('1.0.0')
    .option('-u --user <user>', 'user to connect to OBM service')
    .option('-p --password <password>', 'password to connect to OBM service')
    .option('-j --json <json>', 'json data to use for report')
    .parse(process.argv);

var question = [{
    type: 'password',
    name: 'password',
    message: 'Please enter your obm password.'
}];

// Check of parameters not taken into account by commander.
// TODO find a better way to do this and avoid code redundancy.
if (program.user === undefined) throw new Error("You must specify a user");
if (program.json === undefined) throw new Error("You must specify a json file");
if (program.password === undefined) {//throw new Error("You must specify a password");
    inquirer.prompt(question)
    .then(function(answer) {
        if (!answer.password.trim()) {
            throw new Error("You must specify a password");
        }

        program.password = answer.password;
        var generator = new ActivityGenerator();

        fs.readFile(program.json, function(err, content) {
            var connectionProperties = { user: program.user, password: program.password };
            generator.generate(JSON.parse(content), connectionProperties);
        });
    })
    .catch(function(reason) {
        console.log(reason);
    })
}


