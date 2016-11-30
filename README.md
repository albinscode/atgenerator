PREREQUISITES
=============

Nodejs shall be installed, e.g. `sudo apt-get install nodejs nodejs-legacy` on debian systems.

npm shall be installed, e.g. `sudo apt-get install npm` on debian systems.

This application has been tested with a version 0.10.25.

INSTALLATION
============

In this project root just run `npm install` to get all node dependencies (internet shall be accessible).



RUNNING
=======

Update the scripts/common.sh file to fit your environment.


Generic usage
-------------

Each time an argument won't be supplied in the command line it will be interactively asked for input.

Generating a followup report
-----------------------------

This report allows you to generate an ods file with your whole activity set by week and specifying duration in hours for each day.

See scripts/run_followup:

    JSON='templates/followup.json'
    nodejs commands/activity.js report -u $USER -p $PASSWORD -j $JSON -F

Generating a diff to check your activity
----------------------------------------

To avoid gaps between planning and time management this features will allow you to generate a diff between these two input modes.

See scripts/run_diff:

    JSON='templates/diff.json'
    nodejs commands/activity.js diff -u $USER -p $PASSWORD -j $JSON

Generating an activity report
-----------------------------

This report allows you to generate an odt file (when applicable) for each week spent for a customer.

See scripts/run_report:

    JSON='templates/report-bl.json'
    nodejs commands/activity.js report -u $USER -p $PASSWORD -j $JSON

Generating a planning
---------------------

This will generate a CSV file for a worker activity for a specific project code.

Can be used by manager to send intervention dates for customer.

See scripts/run_planning:

    JSON='templates/planning-csv.json'
    nodejs commands/activity.js planning -u $USER -p $PASSWORD -j $JSON

Global note
-----------

Do not forget to update the json file at least for start and end dates or specify them using -s and -e arguments.

TESTING
=======

Configuration
-------------

Update the test/configuration-tests.js file to fit your environment.


Running
-------


`npm test`


By running mocha manually (especially when wanting to specify some tests using a regex, see -g directive):
`./node_modules/.bin/mocha`

Advanced use
============

Another interesting thing is to get the current planning for a worker directly on the console.
This can be done simply by using the planning command without project code in JSON.

To ease the use of the commands, the following bash could be created:

    AT="/home/avigier/git/atgenerator"
    JSON="$AT/perso/current-planning.json"
    source $AT/scripts/common.sh
    nodejs $AT/commands/activity.js planning -u $USER -p $PASSWORD --json $JSON $@


Then the following aliases can be used for example:

    alias myjob=cd /home/avigier/git/atgenerator/ && ./scripts/run_planning.sh
    alias myjobnext="cd /home/avigier/git/atgenerator/ && ./scripts/run_planning.sh nextmonth"

