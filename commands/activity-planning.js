// This is the sub command to generate the planning of a worker for given period.
var program = require('commander');
var moment = require('moment');
var inquirer = require('inquirer');
var fs = require('fs');
var log = require('../lib/LogBridge');

program
    .version('1.0.0')
    .option('-u --user <user>', 'user to connect to OBM service')
    .option('-p --password <password>', 'password to connect to OBM service')
    .option('-j --json <json>', 'json data to use for diff generation')
    .option('-N --nextmonth', 'the next month to parse')
    .option('-P --previousmonth', 'the previous month to parse')
    .parse(process.argv);



var questions = [];

// The obm username
buildQuestion(questions,
        {
            name: 'user',
            type: 'input',
            message: 'Please enter your username to connect to obm'
        }
);
// the obm password
buildQuestion(questions,
        {
            name: 'password',
            type: 'password',
            message: 'Please enter your obm password.'
        }
);
// The json file to use
buildQuestion(questions,
        {
            name: 'json',
            type: 'list',
            choices: function () {
                return fs.readdirSync('../templates').map(function (element) { return '../templates/' + element; });
            },
            message: 'Json file to use (located in you templates directory).'
        }
);

inquirer.prompt(questions).then(function(answers) {

    performCommand();
})
.catch(function(reason) {
    log.error('planning command', reason);
});

/**
 * Builds the associated question for the given input variable.
 * @param questions the array of question to fill.
 * @param question the expected inquirer array that contains variables and callbacks.
 * Note: the inquirer array name value will be used for the program variable.
 * I.e. by providing an inquirer array with "name": "password", the program.password will be filled.
 */
function buildQuestion(questions, question) {

    var name = question.name;
    if (name === undefined) {
        log.error('planning command', 'You shall define a question with a name attribute');
        return;
    }
    // It is not defined we will ask for it
    if (program[name] === undefined) {
        // We add a validate function
        question.validate = function (value) {
            // No value provided
            if (value.trim() === '') {
                return 'You must provide a value';
            } else {
                return true;
            }
        };
        // We add a filter to add the input variable to the command arguments
        question.filter = function (value) {
            // We assign the value to the command arguments
            program[name] = value;
            return value;
        };
        questions.push(question);
    }
}

/**
 * Performs the planning command wether it is from interactive or non interactive mode.4
 */
function performCommand() {
    var PlanningGenerator = require('../lib/PlanningGenerator');

    var generator = new PlanningGenerator();
    fs.readFile(program.json, function(err, content) {
        if (content === undefined) {
            log.error('planning command', 'The json file %j is not valid', program.json);
            return;
        }
        var json = JSON.parse(content);

        // Setting the next month
        if (program.nextmonth) {
            json.startDate = moment().add(1, 'months').startOf('month');
            json.endDate = moment().add(1, 'months').endOf('month');
        }
        var connectionProperties = { user: program.user, password: program.password, groupId: json.groupId };

        generator.generate(json, connectionProperties);
    });
}
