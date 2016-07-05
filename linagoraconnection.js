var request = require('request');
var Promise = require('promise');
var log = require('./logbridge');
//require('request-debug')(request);

const APPLI_URL = 'https://extranet.linagora.com/time/time_index.php?action=viewmonth&date=%year-%month-01';
const AUTH_URL = 'https://auth.linagora.com';



function LinagoraConnection(user, password) {

    this.appliUrl = APPLI_URL;
    this.authUrl = AUTH_URL;
    this.user = user;
    this.password = password;
    this.cookie = null;
}

/**
 * Gets the page of the time management for the given month and year.
 * The page is stored in a file with given file name.
 * @param month
 * @param year
 * @param filename writes to the filename the content if provided.
 * @return a Promise
 */
LinagoraConnection.prototype.getPage = function (month, year, filename) {
    var self = this;

    log.info('connection', 'We run the request with year %j and month %j', year, month );

    var pageUrl = this.appliUrl.replace('%year', year).replace('%month', month);

    // We get the cookie, then we fetch the page
    return new Promise(function (resolve, reject) {
        self.getCookie(pageUrl).then(function() {
            request(
                    {
                        url: pageUrl,
                        jar: true,
                        headers: {
                            'User-Agent': 'request',
                            'Cookie': self.cookie,
                        }
                    },
                    function (error, response, body) {
                        if (filename) {
                            var fs = require('fs');
                            fs.writeFile(filename, body);
                            log.verbose('connection', 'Content has been written to a file %j', filename);
                            // the content is not be sent if written to a file
                            resolve(null)
                        } else {
                            log.verbose('connection', 'Content is returned directly as a string');
                            var obj = {};
                            obj.htmlContent = body;
                            obj.month = month;
                            obj.year = year;
                            resolve(obj);
                        }
                    }
                   );


        });
    });

}




/**
 * Enables to retrieve the cookie to access Linagora extranet applications.
 * @return a Promise after the cookie has been successfully fetched.
 */
LinagoraConnection.prototype.getCookie = function (page) {

    if (typeof(page) === 'undefined') page = this.authUrl;
    var self = this;

    return new Promise(function (resolve, reject) {
        // We already have a cookie
        if (self.cookie != null) return resolve(self.cookie);

        log.verbose('connection', 'Page to access %j', self.authUrl);

        // We need to fetch the cookie
        request(
                {
                    url: page
                },
                function (error, response, body) {
                    log.verbose('connection', 'Fetching page');
                    if (error) reject(error);
                    var urlToken = response.socket._httpMessage.path;
                    log.verbose('connection', 'Token fetched %j', urlToken);
                    var urlAuth = self.authUrl + urlToken;
                    var urlClean = urlToken.substr(6);
                    log.verbose('connection', 'Clean Url %j', urlClean);

                    request.post(

                        {
                            url: urlAuth,
                            form: {
                                user: self.user, password: self.password, timezone: 2, url: urlClean
                            },
                        },

                        function (error, response, body) {
                            if (error) reject(error);
                            var cookieLemonLdapServer = response.headers['set-cookie'][0];
                            var cookieLemonLdap = cookieLemonLdapServer.split(';')[0];
                            log.verbose('connection', cookieLemonLdap);
                            self.cookie = cookieLemonLdap;
                            resolve(self.cookie);
                        });
                }
        );
    });
}

module.exports = LinagoraConnection;
