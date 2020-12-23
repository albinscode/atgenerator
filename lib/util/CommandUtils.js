const inquirer = require('inquirer')
const log = require('./LogBridge')
const createJsonObject = require('./Utils')
const fs = require('fs')

/**
 * This command utils allows to ask for missing infos with
 * interactive questions through terminal.
 * TODO Perhaps a feature to develop a little bit more in the future.
 */


// The program object @see commander module
let _program = null
let _enabledFeatures = []

/**
 * @param the string argument that represent the feature.
 * @return true if the feature is enable, false otherwise.
 */
function isEnabledFeature(feature) {
    return _enabledFeatures.filter(element => element == feature).length
}

/**
 * Builds the associated question for the given input variable.
 * @param questions the array of question to fill.
 * @param question the expected inquirer array that contains variables and callbacks.
 * Note: the inquirer array name value will be used for the program variable.
 * I.e. by providing an inquirer array with "name": "password", the program.password will be filled.
 */
function buildQuestion(questions, question) {

    let name = question.name

    // Only built if the feature is not disabled
    if (isEnabledFeature(name)) {
        if (name === undefined) {
            log.error('planning command', 'You shall define a question with a name attribute')
            return
        }
        // It is not defined we will ask for it
        if (_program[name] === undefined) {
            // We add a validate function
            question.validate = (value) => {
                // No value provided
                if (value === undefined || value.trim() === '') {
                    return 'You must provide a value'
                } else {
                    return true
                }
            }
            // We add a filter to add the input variable to the command arguments
            if (question.filter === undefined && typeof question.filter != 'function') {
                question.filter = (value) => {
                    _program[name] = value
                    return value
                }
            }
            questions.push(question)
        }
    }
}


/**
 * Builds the common questions for the common commands.
 */
function buildQuestions() {
    // The questions to ask to the user in order to fill parameters
    // @see inquirer module
    let questions = []

    // The obm username
    buildQuestion(questions,
            {
                name: 'user',
                type: 'input',
                message: 'Please enter your username to connect to obm',
            }
    )
    // the obm password
    buildQuestion(questions,
            {
                name: 'password',
                type: 'password',
                message: 'Please enter your obm password.'
            }
    )
    // The json file to use
    buildQuestion(questions,
            {
                name: 'json',
                type: 'list',
                choices: () => {
                    return fs.readdirSync(__dirname + '/../../templates')
                        .filter((element) => element !== undefined && element.indexOf('.json') != - 1)
                        .map((element) => __dirname + '/../../templates/' + element)
                },
                message: 'Json file to use (located in you templates directory).'
            }
    )
    // Depending of the json file values, we could redefine some variables
    // We could add a specific question to handle this

    // The parameters to redefine
    buildQuestion(questions,
            {
                name: 'redefineJson',
                type: 'list',
                choices: [ 'yes', 'no' ],
                message: 'Do you want to define manually some variables to override some already defined in the json file?'
            }
    )

    // The projects to use if any
    buildQuestion(questions,
            {
                name: 'activityProject',
                type: 'list',
                choices: () => {
                    var jsonObj = createJsonObject(__dirname + '/../../conf/conf.json').projects
                    var array =  Object.keys(jsonObj).map((key) => key + ' - ' + jsonObj[key].description)
                    array.unshift('ALL')
                    return array
                },
                filter: (value) => {
                    value = value.substring(0, 8)
                    _program.activityProject = value
                },
                message: 'Project code to use'
            }
    )

    // The format to display results
    buildQuestion(questions,
            {
                name: 'format',
                type: 'list',
                choices: [ 'console', 'csv'
                ],
                message: 'The format to use for displaying data'
            }
    )

    return questions
}

/**
 * Display the prompt questions if not already provided by command arguments.
 * @param The program arguments (@see commander module).
 * @param an array of string arguments that are enabled (to avoid asking interactive questions
 * that would be useless.
 * @param json (optional) if set, a valid json containing all predefined parameters
 * @return a Promise when all the command arguments and prompting is done containing all keys with answer.
 * TODO The program is also enriched with this new values.
 * Perhaps it would be better to let it immutable ASA we have all answers.
 */
function displayPrompt(program, enabledFeatures, json) {
    _program = program

    // A default void array
    if (enabledFeatures === undefined) {
        enabledFeatures = []
    }

    // If features are already defined in the json, we won't ask
    _enabledFeatures = enabledFeatures
        .filter((element) => json[element] === undefined || json[element] === '')

    return inquirer.prompt(buildQuestions())
}

module.exports = displayPrompt
