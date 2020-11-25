const axios = require('axios');
const Promise = require('promise');
const log = require('../util/LogBridge');
const md5 = require('MD5');
const mkdirp = require('mkdirp');
const fs = require('fs');
const cheerio = require('cheerio');

const axiosCookieJarSupport = require('axios-cookiejar-support').default
const tough = require('tough-cookie')

const APPLI_TIME_URL = 'https://extranet.linagora.com/time/time_index.php?action=viewmonth&date=%year-%month-01';
const APPLI_PLANNING_URL = 'https://extranet.linagora.com/planning/planning_index.php?date=%year-%month-01';
const URL_PARAM_GROUP = '&sel_group_id[]=%group';
const AUTH_URL = 'https://auth.linagora.com';
const CACHE_DIR = './.cache/';


function LinagoraConnection(connectionProperties) {

    // some global variables to map the connection properties easily
    let user = connectionProperties.user
    let password = connectionProperties.password
    let groupId = connectionProperties.groupId
    let cacheEnabled = connectionProperties.cacheEnabled

    const request = initRequest()
    let isAutenticated = false


    // return a promise with cookie if already exists
    // or will log to app if not existing
    // the callback shall return a promise to be compatible!
    this.auth = async function(pageUrl) {

        // already authenticated
        if (isAutenticated) {
            return isAutenticated
        }

        log.verbose('connection', `We are not authenticated, we have to perform authentication through OBM`)
        log.verbose('connection', 'Authenticating through %j with user account %j', AUTH_URL, user)

        // We need to fetch the login page to grab the csrf token
        let response = null

        try {
            response = await request.get(AUTH_URL)

            // token part for csrf
            $ = cheerio.load(response.data);

            let token = $('input[name=token]').val();
            log.verbose('connection', 'Csrf token is %j', token);

            // by default it is void but it can be set if
            // accessing directly an obm application (planning, time management, etc...)
            let urlClean = $('input[name=url]').val();
            log.verbose('connection', 'Clean Url %j', urlClean);

            let data = {
                        user: user,
                        password: password,
                        timezone: '1',
                        url: urlClean,
                        token: token,
                        skin: 'bootstrap'
                    }

            // FIXME I did not found a way to send POST params
            // as xxx-form-url-encoded
            data = Object.keys(data).reduce( (acc, elt) => {
                acc.push(`${elt}=${data[elt]}`)
                return acc
            }, [])
            .join('&')

            response = await request.post(
                AUTH_URL + '?url=' + urlClean + '&' + data
            )
        }
        catch (e) {
            // catch to enable the request debuggin
            debugRequest(e)
            throw e
        }

        // if no cookie provided or still on the auth portal, we have problems!
        if (response.data.indexOf('Login Footer') > -1) {
            log.error('connection', 'The credentials seem not good to authenticate to OBM (bad landing page)...')
        }
        else {
            isAutenticated = true
        }
        return isAutenticated
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

        // TODO part to externalize
        if (!ifTimeManagement && groupId !== null) {
            pageUrl += URL_PARAM_GROUP;
            pageUrl = pageUrl.replace('%group', groupId);
        }
        pageUrl = encodeURI(pageUrl);

        // authentication if needed
        let authenticated = await this.auth()
        if (!authenticated) throw new Error('Not authenticated')

        // we fetch the page
        log.verbose('connection', `Fetching page ${pageUrl}`);
        let content = await request(pageUrl)

        // FIXME bad design, we wrap parameters of month and year!
        return {
            htmlContent: content.data,
            month: month,
            year: year
        }
    }


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

// this is to pass the cookies but we can use
// plugins too for that;)
function configureRequestInterceptors(request)  {
    // Add a request interceptor to add cookies and bearer token
    request.interceptors.request.use((request) => {
        return request
    })
    request.interceptors.response.use((response) => {
        // TODO syntax highlighting
        log.verbose(`Statut ${response.status}`)
        log.verbose('Received headers')
        log.verbose(JSON.stringify(response.headers, null, 2))
        log.verbose('Sent request')
        log.verbose(JSON.stringify(response.config, null, 2))
        log.verbose('Received content')
        // log.verbose(response.data)
        return response
    })
}


function initRequest() {
    // a dedicated request
    let request = axios.create()

    // add cookie jar support
    axiosCookieJarSupport(request)

    // false is to allow public domain
    // @see https://github.com/request/request/issues/792#issuecomment-33843245
    request.defaults.jar = new tough.CookieJar(null, false)

    // we have invalid domains on obm, so we shall ignore cookie errors!
    // https://www.npmjs.com/package/axios-cookiejar-support#extended-request-config
    request.defaults.ignoreCookieErrors = true
    request.defaults.headers.common['User-Agent'] =  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:80.0) Gecko/20100101 Firefox/80.0"
    request.defaults.headers.common['Accept'] =  'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    request.defaults.withCredentials = true
    configureRequestInterceptors(request)

    return request
}



module.exports = LinagoraConnection
