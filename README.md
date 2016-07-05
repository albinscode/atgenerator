
RUNNING
=======

`
USER=myuser
PASSWORD=mypassword
JSON='test/resources/bl-example.json'
nodejs activity.js generate -u $USER -p $PASSWORD -j $JSON
`

Do not forget to update the json file at least for start and end dates.

TESTING
=======

`npm test`


By running mocha manually (especially when wanting to specify some tests using a regex, see -g directive):
`./node_modules/.bin/mocha`
