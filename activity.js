var log = require('./logbridge');

log.info('| -- Welcome to activity utilities --|');

// This is the main command to run the utilities
var program = require('commander');
program
    .version('1.0.0')
    .command('generate', 'generates the activity report for given customer and project')
    .command('diff', 'generates a diff between the time management and planning as described in OBM')
    .parse(process.argv);
