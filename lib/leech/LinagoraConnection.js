const axios = require('axios');
const Promise = require('promise');
const sleep = require('../util/SleepPromise');
const log = require('../util/LogBridge');
const md5 = require('MD5');
const mkdirp = require('mkdirp');
const fs = require('fs');
const cheerio = require('cheerio');
const FormData = require('form-data')
// require('request-debug')(request);

const APPLI_TIME_URL = 'https://extranet.linagora.com/time/time_index.php?action=viewmonth&date=%year-%month-01';
const APPLI_PLANNING_URL = 'https://extranet.linagora.com/planning/planning_index.php?date=%year-%month-01';
const URL_PARAM_GROUP = '&sel_group_id[]=%group';
const AUTH_URL = 'https://auth.linagora.com';
const CACHE_DIR = './.cache/';


function LinagoraConnection(connectionProperties) {

    this.authUrl = AUTH_URL;
    this.user = connectionProperties.user;
    this.password = connectionProperties.password;
    this.groupId = connectionProperties.groupId;
    this.cacheEnabled = connectionProperties.cacheEnabled;

    // this is to pass the cookies but we can use
    // plugins too for that;)
    this.configureRequestInterceptors = function() {
        // Add a request interceptor to add cookies and bearer token
        request.interceptors.request.use((request) => {
            // Do something before request is sent
            if (cookie != '') {
                log.verbose(`Adding existing cookie ${cookie}`)
                request['headers']['Cookie'] = cookie
            }
            return request
        })
        request.interceptors.response.use((response) => {
            log.verbose(`Statut ${response.status}`)
            log.verbose('Received headers')
            log.verbose(JSON.stringify(response.headers, null, 2))
            log.verbose('Sent request')
            log.verbose(JSON.stringify(response.config, null, 2))
            log.verbose('Received content')
            log.verbose(response.data)
            return response
        })
    }


    // a dedicated request by app
    const request = axios.create({
      // withCredentials: true
    })

    request.defaults.headers.common['User-Agent'] =  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:80.0) Gecko/20100101 Firefox/80.0"
    // request.defaults.headers.common['Accept'] =  "*/*"
    request.defaults.headers.common['Accept'] =  'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    request.defaults.headers.common['Content-Type'] = 'text/html'
    request.defaults.withCredentials = true
    this.configureRequestInterceptors()

    // the cookie retrieved during auth
    let cookie = ''

    // return a promise with cookie if already exists
    // or will log to app if not existing
    // the callback shall return a promise to be compatible!
    this.auth = async function(pageUrl) {

        if (typeof(pageUrl) === 'undefined') pageUrl = this.authUrl;

        // reject never happens
        if (cookie) {
            log.verbose(`cookie is ${cookie}`)
            return new Promise((resolve, reject) => resolve('cookie already provided'))
        }
        log.verbose(`there is no cookie we have to fetch it`)

        log.verbose('connection', 'Page to access %j with user account %j', pageUrl, this.user);

        // We need to fetch the login page to grab the csrf token
        let response = null

        try {
            log.verbose('connection', 'Fetching page ${pageUrl}');
            response = await request.get(pageUrl)
            this.retrieveCookie(response)

            // if (error) throw ('Network problems, check your internet settings: ' + error);

            // token part for csrf
            $ = cheerio.load(response.data);

            let token = $('input[name=token]').val();
            log.verbose('connection', 'Csrf token is %j', token);

            let urlClean = $('input[name=url]').val();
            log.verbose('connection', 'Clean Url %j', urlClean);


            let data = {
                        user: this.user,
                        password: this.password,
                        timezone: '1',
                        url: urlClean,
                        token: token,
                        skin: 'bootstrap'
                    }

            // to pass form data
            // data = new FormData()
            // data.append('user', this.user)
            // data.append('password', this.password)
            // data.append('timezone', '1')
            // data.append('url', urlClean)
            // data.append('token', token)
            // data.append('skin', 'bootstrap')

            response = await request.post(
                this.authUrl + '?url=' + urlClean, data,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    withCredentials: true
                }
            )
            this.retrieveCookie(response)
        }
        catch (e) {
            this.debugRequest(e)
            throw e
        }

        // if no cookie provided or still on the auth portal, we have problems!
        if (response.data.indexOf('Login Footer') > -1) {
            log.error('connection', 'The credentials seem not good to authenticate to OBM (bad landing page)...')
        }
        else if (response.headers['set-cookie'] === undefined) {
            log.error('connection', 'The credentials seem not good to authenticate to OBM (no cookie sent)...')
        }
        // console.log(response.data)

        // TODO fetch cookie
        // this.retrieveCookie(response)


        // resolve(self.authenticated);
    }

    /**
     * Gets the cookie from a given response
     */
    this.retrieveCookie = function(res)  {

        // no need to fetch a new cookie
        // we can receive incremental cookies
        // if (cookie) return cookie;

        if (!res.headers['set-cookie']) throw new Error(`no cookie received`)

        // we keep cookie internally
        cookie = res.headers['set-cookie'].map( c =>
            // extract the cookie part (without path attribute)
            c.substring(0, c.indexOf(';'))
        )
        .join(';')

        log.verbose(`Extracted cookie is ${cookie}`)
        return cookie;
    }

    this.getCookie = function() {
        return cookie
    }

    /**
     * An utility to debug request response error
     */
    this.debugRequest = function(error, resetAuth) {
        log.error("Error on request")
        if (error.request) {
            log.error(`Here are the sent headers of the request: ${error.request._header}`)
        }
        else {
            log.error(error)
        }
        if (resetAuth) {
            cookie = ''
        }
    }



    this.getBasicPage = async function (month, year, pageAppUrl, ifTimeManagement, filename) {

        log.info('connection', 'We run the request with year %j and month %j', year, month );

        var pageUrl = pageAppUrl.replace('%year', year).replace('%month', month);

        // part to externalize
        if (!ifTimeManagement && this.groupId !== null) {
            pageUrl += URL_PARAM_GROUP;
            pageUrl = pageUrl.replace('%group', this.groupId);
        }
        pageUrl = encodeURI(pageUrl);

        return await this.auth(pageUrl)
        // return await this.auth(AUTH_URL)

        // TODO then we have to call page ;)
    }

}






/**
 * @param connectionProperties contains at least 'user' and 'password' props. May also contain 'groupId' to fetch (Linagora GSO, GSE, ...) in case of planning fetching.
 */
function LinagoraConnection2(connectionProperties) {

    this.authUrl = AUTH_URL;
    this.user = connectionProperties.user;
    this.password = connectionProperties.password;
    this.groupId = connectionProperties.groupId;
    this.cacheEnabled = connectionProperties.cacheEnabled;
    this.cookieCounter = 0;

    // let cookie = null

    // By default the cache is disabled
    if (this.cacheEnabled === undefined) this.cacheEnabled = false;
    log.info('connection', 'cache enabled %j', this.cacheEnabled);
    if (this.cacheEnabled) {
        log.warn('connection', 'You can delete the cache by removing the %j directory.', CACHE_DIR);
    }
    this.authenticated = false;
    this.authenticationInProgress = false;
    var self = this;

    /*
     * Enables to retrieve the cookie to access Linagora extranet applications.
     * @return a Promise after the cookie has been successfully fetched.
     */
    this.getCookie = function (page) {

        var sleepAmount = 0;
        // We wait for the cookie to be retrieved by another thread
        if (this.authenticationInProgress) {
            sleepAmount = 3000;
        }
        if (typeof(page) === 'undefined') page = this.authUrl;

        return sleep(sleepAmount).then(function(resolve, reject) {
            self.authenticationInProgress = true;
            return new Promise(function (resolve, reject) {
                // We already have a cookie
                if (self.authenticated) return resolve(authenticated);

                log.verbose('connection', 'Page to access %j with user account %j', self.authUrl, self.user);

                // We need to fetch the cookie
                request(
                        {
                            url: page,
                            jar: true,
                        },
                        function (error, response, body) {
                            log.verbose('connection', 'Fetching page');
                            if (error) throw ('Network problems, check your internet settings: ' + error);

                            // token part for csrf
                            $ = cheerio.load(body);
                            token = $('input[name=token]').val();
                            log.verbose('connection', 'csrf token is %j', token);
                            urlClean = $('input[name=url]').val();
                            log.verbose('connection', 'Clean Url %j', urlClean);

                            request.post(
                                {
                                    url: self.authUrl + '?url=' + urlClean,
                                    jar: true,
                                    form: {
                                        user: self.user, password: self.password, timezone: 2, url: urlClean, token: token, skin: 'bootstrap'
                                    },
                                },

                                function (error, response, body) {
                                    if (error) reject(error);

                                    // if no cookie provided or still on the auth portal, we have problems!
                                    if (body.indexOf('Authentication portal') > -1 || response.headers['set-cookie'] === undefined) {
                                        log.error('connection', 'The credentials seem not good to authenticate to OBM...');
                                        reject('credentials problem');
                                    }

                                    self.authenticated = true;
                                    self.authenticationInProgress = false;

                                    resolve(self.authenticated);
                                });
                        }
                );
            });
        });
    };

    /**
     * @param url the url to crypt in order to get a unique id.
     * @return the cached file if cache is enabled.
     */
    this.getCachedFile = function(url) {
        if (this.cacheEnabled) {
            url = CACHE_DIR + md5(url);
        }
        return url;
    };

    this.writeCachedFile = function(filename, content) {
        if (this.cacheEnabled) {
            fs.writeFile(filename, content, function() {
            });
        }
    };

    /**
     * @param cachedFile the cached file to manage
     * @return a promise whith the cached file content if any (null otherwise)
     */
    this.manageCache = function(cachedFile) {
        return new Promise(function(resolve, reject) {
            // check if cache enabled
            if (self.cacheEnabled) {
                fs.lstat(CACHE_DIR, function(err) {
                    // Creating the cache dir if not exists
                    if (err) {
                        log.verbose('connection', 'We are creating the cache dir %j', CACHE_DIR);
                        mkdirp(CACHE_DIR);
                    }
                    // We'll try to find a previously fetched page
                    fs.lstat(cachedFile, function(err) {
                        if (err) {
                            log.verbose('connection', 'File not found in cache %j, we try to connect to get it.', cachedFile);
                            resolve(null);
                        } else {
                            fs.readFile(cachedFile, function (err, data) {
                                if (err) {
                                    log.verbose('connection', 'Problem with cache file %j', err);
                                    reject();
                                } else {
                                    resolve(data);
                                }
                            });
                        }
                    });
                });
            }
            else {
                resolve(null);
            }
        });
    };

    /**
     * Gets the page of the time management for the given month and year.
     * The page is stored in a file with given file name.
     * @param month
     * @param year
     * @param pageAppUrl the application url to fetch.
     * @param ifTimeManagement to specify wether we fetch the time management page or planning.
     * @param filename writes to the filename the content if provided.
     * @return a Promise
     */
    this.getBasicPage = function (month, year, pageAppUrl, ifTimeManagement, filename) {

        log.info('connection', 'We run the request with year %j and month %j', year, month );

        var pageUrl = pageAppUrl.replace('%year', year).replace('%month', month);

        if (!ifTimeManagement && this.groupId !== null) {
            pageUrl += URL_PARAM_GROUP;
            pageUrl = pageUrl.replace('%group', this.groupId);
        }
        pageUrl = encodeURI(pageUrl);

        var cachedFile = this.getCachedFile(pageUrl);

        // Fetches the content of the cache if any
        return this.manageCache(cachedFile).then(function(content) {

            // No cache, we have to fetch url
            if (content === null) {
                log.verbose('connection', 'Fetching url %j', pageUrl);

                // We get the cookie, then we fetch the page
                return new Promise(function (resolve, reject) {
                    self.getCookie(pageUrl).then(function() {
                        request(
                                {
                                    url: pageUrl,
                                    jar: true,
                                    headers: {
                                        'User-Agent': 'request',
                                        // 'Cookie': self.cookie,
                                    }
                                },
                                function (error, response, body) {
                                    if (filename) {
                                        fs.writeFile(filename, body, function() {
                                        });
                                        log.verbose('connection', 'Content has been written to a file %j', filename);
                                        // the content is not be sent if written to a file
                                        self.writeCachedFile(cachedFile, body);
                                        resolve(null);
                                    } else {
                                        log.verbose('connection', 'Content is returned directly as a string');
                                        var obj = { htmlContent: body, month: month, year: year };
                                        self.writeCachedFile(cachedFile, body);
                                        resolve(obj);
                                    }
                                }
                               );
                    });
                });
            }
            else {
                // We've got content, we return a promise wrapper
                return new Promise(function(resolve, reject) {
                    var obj = { htmlContent: content, month: month, year: year };
                    resolve(obj);
                });
            }
        });
    };
}

/**
 * Gets the page of the time managementi or planning for the given month and year.
 * The page is stored in a file with given file name.
 * @param month
 * @param year
 * @param ifTimeManagement true if to parse time management page, false for planning.
 * @param filename writes to the filename the content if provided.
 * @return a Promise
 */
LinagoraConnection.prototype.getPage = function (month, year, ifTimeManagement, filename) {
    if (filename === undefined) filename = null;
    if (ifTimeManagement) {
        return this.getTimePage(month, year, filename);
    } else {
        return this.getPlanningPage(month, year, filename);
    }
};

/**
 * Gets the page of the time management for the given month and year.
 * The page is stored in a file with given file name.
 * @param month
 * @param year
 * @param filename writes to the filename the content if provided.
 * @return a Promise
 */
LinagoraConnection.prototype.getTimePage = function (month, year, filename) {
    return this.getBasicPage(month, year, APPLI_TIME_URL, true, filename);
};

/**
 * Gets the page of the planning for the given month and year.
 * The page is stored in a file with given file name.
 * @param month
 * @param year
 * @param filename writes to the filename the content if provided.
 * @return a Promise
 */
LinagoraConnection.prototype.getPlanningPage = function (month, year, filename) {
    return this.getBasicPage(month, year, APPLI_PLANNING_URL, false, filename);
};


module.exports = LinagoraConnection;
