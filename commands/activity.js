var log = require('../lib/LogBridge');

log.info('| -- Welcome to activity utilities --|');

// This is the main command to run the utilities
var program = require('commander');
program
    .version('1.0.0')
    .command('report', 'generates the activity report for given customer and project')
    .command('diff', 'generates a diff between the time management and planning as described in OBM')
    .command('planning', 'generates the planning of a worker for a specific project')
    .parse(process.argv);
