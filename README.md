PREREQUISITES
=============

Nodejs shall be installed, e.g. `sudo apt-get install nodejs` on debian systems.

INSTALLATION
============

In this project root just run `npm install` to get all node dependencies (internet shall be accessible).



RUNNING
=======

Update the scripts/common.sh file to fit your environment.

Generating an activity report
-----------------------------

See scripts/run_report:

    JSON='../test/resources/report-example.json'
    nodejs ../commands/activity.js report -u $USER -p $PASSWORD -j $JSON

Generating a planning
---------------------

See scripts/run_planning:

    JSON='../test/resources/planning-example.json'
    nodejs ../commands/activity.js planning -u $USER -p $PASSWORD -j $JSON

Global note
-----------

Do not forget to update the json file at least for start and end dates.

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
