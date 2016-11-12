var inquirer = require('inquirer');
var log = require('../lib/LogBridge');
var utils = require('../lib/Utils');
var fs = require('fs');

function CommandUtils() {

    var self = this;

    // The program object @see commander module
    this.program = null;

    this.enabledFeatures = null;

    /**
     * @param the string argument that represent the feature.
     * @return true if the feature is enable, false otherwise.
     */
    this.isEnabledFeature = function(feature) {
        var found = this.enabledFeatures.filter(function (element) {
            return element == feature;
        });
       return found.length  == 1;
    };
    /**
     * Builds the associated question for the given input variable.
     * @param questions the array of question to fill.
     * @param question the expected inquirer array that contains variables and callbacks.
     * Note: the inquirer array name value will be used for the program variable.
     * I.e. by providing an inquirer array with "name": "password", the program.password will be filled.
     */
    this.buildQuestion = function(questions, question) {

        var name = question.name;
        // Only built if the feature is not disabled
        if (this.isEnabledFeature(name)) {
            if (name === undefined) {
                log.error('planning command', 'You shall define a question with a name attribute');
                return;
            }
            // It is not defined we will ask for it
            if (this.program[name] === undefined) {
                // We add a validate function
                question.validate = function (value) {
                    // No value provided
                    if (value === undefined || value.trim() === '') {
                        return 'You must provide a value';
                    } else {
                        return true;
                    }
                };
                // We add a filter to add the input variable to the command arguments
                if (question.filter === undefined && typeof question.filter != 'function') {
                    question.filter = function (value) {
                        self.program[name] = value;
                        return value;
                    };
                }
                questions.push(question);
            }
        }
    };


    /**
     * Builds the common questions for the common commands.
     */
    this.buildQuestions = function() {
        // The questions to ask to the user in order to fill parameters
        // @see inquirer module
        var questions = [];

        // The obm username
        this.buildQuestion(questions,
                {
                    name: 'user',
                    type: 'input',
                    message: 'Please enter your username to connect to obm',
                }
        );
        // the obm password
        this.buildQuestion(questions,
                {
                    name: 'password',
                    type: 'password',
                    message: 'Please enter your obm password.'
                }
        );
        // The json file to use
        this.buildQuestion(questions,
                {
                    name: 'json',
                    type: 'list',
                    choices: function () {
                        return fs.readdirSync('templates').filter(function (element) { return element !== undefined && element.indexOf('.json') != - 1;  }).map(function (element) { return 'templates/' + element; });
                    },
                    message: 'Json file to use (located in you templates directory).'
                }
        );
        // Depending of the json file values, we could redefine some variables
        // We could add a specific question to handle this

        // The parameters to redefine
        this.buildQuestion(questions,
                {
                    name: 'redefineJson',
                    type: 'list',
                    choices: [ 'yes', 'no' ],
                    message: 'Do you want to define manually some variables to override some already defined in the json file?'
                }
        );

        // The projects to use if any
        this.buildQuestion(questions,
                {
                    name: 'activityProject',
                    type: 'list',
                    choices: function () {
                        var jsonObj = utils.createJsonObject('conf/conf.json').projects;
                        var array =  Object.keys(jsonObj).map(function (key) { return key + ' - ' + jsonObj[key].description; });
                        array.unshift('ALL');
                        return array;
                    },
                    filter: function (value) {
                        value = value.substring(0, 8);
                        self.program.activityProject = value;
                    },
                    message: 'Project code to use'
                }
        );
        // The format to display results
        this.buildQuestion(questions,
                {
                    name: 'format',
                    type: 'list',
                    choices: [ 'console', 'csv'
                    ],
                    message: 'The format to use for displaying data'
                }
        );

        return questions;
    };
}

/**
 * Display the prompt questions if not already provided by command arguments.
 * @param The program arguments (@see commander module).
 * @param an array of string arguments that are enabled (to avoid asking interactive questions
 * that would be useless.
 * @return a Promise when all the command arguments and prompting is done.
 */
CommandUtils.prototype.displayPrompt = function(program, enabledFeatures) {
    this.program = program;
    // A default void array
    if (enabledFeatures === undefined) {
        enabledFeatures = [];
    }
    this.enabledFeatures = enabledFeatures;

    return inquirer.prompt(this.buildQuestions());
};

module.exports = new CommandUtils();
