const log = require('../util/LogBridge')
const fs = require('fs')

const PageExtractor = require('../leech/PageExtractor')

// To intercept on month activity data
const ActivityProcessorEmitter = require('./EventProcessor')

const JsonRules = require('../util/JsonRules')
const moment = require('moment')
const OutputFormatter = require('../output/OutputFormatter.js')


let date1, date2 = null

/**
 * @param object months an object that contains all days with morning and afternoon value.
 * @param object jsonObj contains all information ready to inject in the template
 */
function build(months, jsonObj) {
    try {
        log.info('planning generator', "Generating planning for %j with %j", jsonObj.worker, jsonObj.activityProject)

        const processor = new ActivityProcessorEmitter()
        const formatter = new OutputFormatter()

        // We generate the activity planning on a specific project
        if (jsonObj.activityProject !== '') {

            processor.projectCode = jsonObj.activityProject
            processor.ifManageWeekEnds = true

            // TODO a fluent API would be more intuitive

            // When a new day is entered (wether working or non working days)
            processor.on(ActivityProcessorEmitter.EVENT_ONE_DAY_STRICT,
                (value, date, numberOfDay) => formatter.pushHeaders(date.format(jsonObj.patternDateFormat))
            )

            // When a full day is planned
            processor.on(ActivityProcessorEmitter.EVENT_FULL_DAY,
                (value, date, numberOfDay) => formatter.push('1')
            )
            // When a half day is planned
            processor.on(ActivityProcessorEmitter.EVENT_HALF_DAY,
                (value, date, numberOfDay) => formatter.push('0.5')
            )
            // When no day is planned
            processor.on(ActivityProcessorEmitter.EVENT_ZERO_DAY,
                (value, date, numberOfDay) => formatter.push('0')
            )
            // Saturday event
            processor.on(ActivityProcessorEmitter.EVENT_SATURDAY,
                (date) => formatter.push('0')
            )
            // Sunday event
            processor.on(ActivityProcessorEmitter.EVENT_SUNDAY,
                (date) => formatter.push('0')
            )
        }
        // We just fetch all labels of all projects for the specific worker
        else {
            // When morning day is planned
            processor.on(ActivityProcessorEmitter.EVENT_MORNING_DAY, (value, date, numberOfDay) => {
                formatter.pushHeaders(date.format(jsonObj.patternDateFormat + ' WW') + ' AM')
                formatter.push(value)
                formatter.sumActivity(value, 0.5, date)
            })
            // When afternoon day is planned
            processor.on(ActivityProcessorEmitter.EVENT_AFTERNOON_DAY, (value, date, numberOfDay) => {
                formatter.pushHeaders(date.format(jsonObj.patternDateFormat + ' WW') + ' PM')
                formatter.push(value)
                formatter.sumActivity(value, 0.5, date)
            })
            // When full day is planned
            processor.on(ActivityProcessorEmitter.EVENT_ONE_DAY, (value, date, numberOfDay) => {
                if (date !== undefined) {
                    formatter.pushHeaders(date.format(jsonObj.patternDateFormat + ' WW') + '   ')
                    formatter.push(value)
                    formatter.sumActivity(value, 1, date)
                }
            })
            // When sunday is raised
            processor.on(ActivityProcessorEmitter.EVENT_SUNDAY, (value, date, numberOfDay) => {
                formatter.pushHeaders('Week-end')
                formatter.push('')
            })
        }
        processor.process(months, moment(date1), moment(date2))


        if (jsonObj.filenamePattern !== '' && jsonObj.filenamePattern !== undefined) {
            formatter.buildCsv(jsonObj)
        } else {
            formatter.buildConsoleOutput(jsonObj)
        }
    }
    catch (e) {
        log.error('planning generator', e)
    }
}


/**
 * @param jsonObj the json input object containing all data to inject
 * @param connectionProperties
 */
function generate(jsonObj, connectionProperties) {

    jsonRules = new JsonRules(jsonObj)

    jsonRules.checkDates();

    date1 = jsonRules.getStartDate()
    date2 = jsonRules.getEndDate()

    log.info('planning generator', 'Processing between dates: %j and %j', date1.format(), date2.format())

    const extractor = new PageExtractor()

    // We extract date from planning
    // TODO find why we have to cast them to moment
    extractor.extract(connectionProperties, moment(date1), moment(date2), false, jsonRules.getPlanningParser())
        .then(months =>  build(months, jsonObj))
}

module.exports = generate
