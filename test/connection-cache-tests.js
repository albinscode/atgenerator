var fs = require('fs');

require('should');
require('mocha');

describe('>>>> Connection cache tests', function() {
    this.timeout(10000);
    it('should create cache file', function(done) {
        const linagoraConnection = require('../lib/leech/LinagoraConnection');

        var connection = linagoraConnection.init({});

        var cachedFile = connection.getCachedFile('http://myurl.html');
        connection.writeCachedFile(cachedFile, 'my content');
        fs.lstat(cachedFile, function (err) {
            console.log(err);
            try {
                if (err != null) throw new Error('should be null!');
                connection.manageCache(cachedFile).then(function(content) {
                    console.log(content);
                    done();
                });
            } catch (e) {
                console.log(e);
                should.not.fail();
            }
        });
    });
});
