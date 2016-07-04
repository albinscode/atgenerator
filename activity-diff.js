// This is the sub command to generate the diff between time management and planning
var program = require('commander');
program
    .version('1.0.0')
    .option('-u --user [value]', 'user to connect to OBM service')
    .option('-p --password [value]', 'password to connect to OBM service')
    .parse(process.argv);

