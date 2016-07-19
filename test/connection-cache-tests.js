var fs = require('fs');

require('should');
require('mocha');

describe('>>>> Connection cache tests', function() {
    this.timeout(10000);
    it('should create cache file', function(done) {
        var LinagoraConnection = require('../lib/LinagoraConnection');

        var connection = new LinagoraConnection({});

        var cachedFile = connection.getCachedFile('http://myurl.html');
        connection.writeCachedFile(cachedFile, 'my content');
        fs.lstat('.cache/' + cachedFile, function (err) {
            should.not.ifError(err);
        });
        connection.manageCache(cachedFile).then(function(content) {
           console.log(content);
        });
        done();
    });
});
