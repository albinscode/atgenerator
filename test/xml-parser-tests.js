require('should');
require('mocha');
var cheerio = require('cheerio');

describe('>>>> Xml parser tests', function() {
    this.timeout(10000);
    it('should parse xml stream', function(done) {

        // Loading string
        $ = cheerio.load('<xml><body>here is the body of xml</body></xml>'); // By default, we generate them once with account avigier
        $('body').text().should.be.equal('here is the body of xml');

        $ = cheerio.load('<xml><body:body>here is the body of xml</body:body></xml>', { xmlMode: true } ); // By default, we generate them once with account avigier
        // a namespace has to be escaped using \\:
        $('body\\:body').text().should.be.equal('here is the body of xml');
        done();
    });
});
