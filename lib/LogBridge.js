// To avoid using directly the npmlog module we build a bridge.
// It will allow us to configure it as we want.
var Log = require('npmlog'), inherits = require('util').inherits;

function LogBridge() {
    Log.call(this);
}

// Some configurations
//Log.level = 'verbose';
Log.level = 'info';


Log.addLevel('format', 4000, { fg: 'green', bg: 'black' }, '');

// TODO Currently I cannot perform a correct inherit from the npmlog module, so I'm using directly the Log object.
module.exports = Log;
