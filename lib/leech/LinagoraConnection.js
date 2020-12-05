const axios = require('axios')
const Promise = require('promise')
const log = require('../util/LogBridge')
const md5 = require('MD5')
const mkdirp = require('mkdirp')
const fs = require('fs')
const cheerio = require('cheerio')
const { v4: uuidv4 } = require('uuid');
const FormData = require('form-data')
const path = require('path')


const axiosCookieJarSupport = require('axios-cookiejar-support').default
const tough = require('tough-cookie')

const APPLI_TIME_URL = 'https://extranet.linagora.com/time/time_index.php?action=viewmonth&date=%year-%month-01'
const APPLI_PLANNING_URL = 'https://extranet.linagora.com/planning/planning_index.php?date=%year-%month-01'

const LINSHARE_WEBSERVICE_URL = 'https://linshare-internal.linagora.com/linshare/webservice/rest/user/v2'

const URL_PARAM_GROUP = '&sel_group_id[]=%group'
const AUTH_URL = 'https://auth.linagora.com'
const CACHE_DIR = './.cache/'

// this module does not expose an object as there will be only one connection
// to OBM linagora server.

let user = ''
let password = ''
let groupId = ''
let cacheEnabled = false
let isAuthenticated = false
let isAutenticatedLinshare = false
let request = null

/**
 * inits the connection to linagora server
 * @return the used axios request
 */
init = function(connectionProperties) {

    // some global variables to map the connection properties easily
    user = connectionProperties.user
    password = connectionProperties.password
    groupId = connectionProperties.groupId
    cacheEnabled = connectionProperties.cacheEnabled

    // By default the cache is disabled
    if (typeof(cacheEnabled) === 'undefined') cacheEnabled = false;
    log.info('connection', 'cache enabled %j', cacheEnabled);
    if (cacheEnabled) {
        log.warn('connection', 'You can delete the cache by removing the %j directory.', CACHE_DIR);
    }

    initRequest()
    return request
}


// return a promise with cookie if already exists
// or will log to app if not existing
// the callback shall return a promise to be compatible!
auth = async function(pageUrl) {

    // already authenticated
    if (isAuthenticated) {
        return isAuthenticated
    }

    log.verbose('connection', `We are not authenticated, we have to perform authentication through OBM`)
    log.verbose('connection', 'Authenticating through %j with user account %j', AUTH_URL, user)

    // We need to fetch the login page to grab the csrf token
    let response = null

    try {
        response = await request.get(AUTH_URL)

        // token part for csrf
        $ = cheerio.load(response.data)

        let token = $('input[name=token]').val()
        log.verbose('connection', 'Csrf token is %j', token)

        // by default it is void but it can be set if
        // accessing directly an obm application (planning, time management, etc...)
        let urlClean = $('input[name=url]').val()
        log.verbose('connection', 'Clean Url %j', urlClean)

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
        if (!isAuthenticated) throw new Error('Not authenticated')
    }
    else {
        isAuthenticated = true
    }

    return isAuthenticated
}

/*
 * To authenticate to Linshare. We use the OBM session then call the linshare auth endpoint
 * to generate the linshare session and getting the associated cookie (JSESSIONID)
 */
authLinshare = async function() {

    // already authenticated
    if (isAutenticatedLinshare) return

    // auth to OBM if needed
    auth()

    // auth in case (just grab the JSESSIONID cookie of linshare)
    let response = await request.get(`${LINSHARE_WEBSERVICE_URL}/authentication/authorized`)

    isAutenticatedLinshare = true
}

/**
 * An utility to debug request response error
 */
debugRequest = function(error, resetAuth) {
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

/**
 * Common function that return data on the page (time management or planning).
 */
getBasicPage = async function (month, year, pageAppUrl, ifTimeManagement, filename) {

    log.info('connection', 'We run the request with year %j and month %j', year, month )

    var pageUrl = pageAppUrl.replace('%year', year).replace('%month', month)

    // TODO part to externalize
    if (!ifTimeManagement && groupId !== null) {
        pageUrl += URL_PARAM_GROUP
        pageUrl = pageUrl.replace('%group', groupId)
    }

    pageUrl = encodeURI(pageUrl)

    const cachedFile = getCachedFile(pageUrl)

    // Fetches the content of the cache if any
    let content = await manageCache(cachedFile)

    // No cache, we have to fetch url
    if (content === null) {
        log.verbose('connection', 'Fetching url %j', pageUrl);

        // authentication if needed
        await auth()

        // we fetch the page
        log.verbose('connection', `Fetching page ${pageUrl}`)
        let contentFetched = await request(pageUrl)
        content = contentFetched.data
    }

    // writes cache if needed or enabled
    writeCachedFile(cachedFile, content)

    // FIXME bad design, we wrap parameters of month and year!
    return {
        htmlContent: content,
        month: month,
        year: year
    }
}

/**
 * Gets the page of the time management or planning for the given month and year.
 * The page is stored in a file with given file name.
 * @param month
 * @param year
 * @param ifTimeManagement true if to parse time management page, false for planning.
 * @param filename writes to the filename the content if provided.
 * @return a Promise
 */
getPage = function (month, year, ifTimeManagement, filename) {
    if (filename === undefined) filename = null
    if (ifTimeManagement) {
        return getTimePage(month, year, filename)
    } else {
        return getPlanningPage(month, year, filename)
    }
}

/**
 * Gets the page of the time management for the given month and year.
 * The page is stored in a file with given file name.
 * @param month
 * @param year
 * @param filename writes to the filename the content if provided.
 * @return a Promise
 */
getTimePage = function (month, year, filename) {
    return getBasicPage(month, year, APPLI_TIME_URL, true, filename)
}

/**
 * Gets the page of the planning for the given month and year.
 * The page is stored in a file with given file name.
 * @param month
 * @param year
 * @param filename writes to the filename the content if provided.
 * @return a Promise
 */
getPlanningPage = function (month, year, filename) {
    return getBasicPage(month, year, APPLI_PLANNING_URL, false, filename)
}

/**
 * Creates the given folder in given workspace and parent (can be the same).
 * @Return the created folder uuid
 */
createLinshareFolder = async function(folder, parent, workspace) {

    authLinshare()

    // create folder with given name in the common workspace
    let response = await request.post(
        `${LINSHARE_WEBSERVICE_URL}/shared_spaces/${workspace}/nodes`,
        {
            name: folder,
            parent: parent,
            type: 'FOLDER',
        },
        {
            headers: {
                'Accept': 'application/json'
            }
        }
    )
    return response.data.uuid
}

/**
 * Uploads the given filename under the given workgroupUuid.
 * Will use filename as descriptor for upload.
 */
uploadLinshareFile = async function(filename, parent, workgroupUuid) {

    // loading file content to send it
    const content = await fs.promises.readFile(filename)

    let formData = new FormData()
    formData.append('workGroupUuid', workgroupUuid)
    formData.append('workGroupParentNodeUuid', parent)

    // we send only one chunk
    formData.append('flowChunkNumber', 1)
    formData.append('flowTotalChunks', 1)
    // we set it to the file size to avoid sending several chunks (only for small files)
    formData.append('flowChunkSize', content.length)
    // this chunk's size
    formData.append('flowCurrentChunkSize', content.length)
    // whole size for all cumulated chunks
    formData.append('flowTotalSize', content.length)

    // flow identifier to be generated
    formData.append('flowIdentifier', uuidv4())
    formData.append('flowFilename', path.basename(filename))
    formData.append('flowRelativePath', path.basename(filename))
    formData.append('file',  Buffer.from(content))

    log.verbose(formData)
    log.verbose(formData.getHeaders())

    try {
        response = await request.post(
            `${LINSHARE_WEBSERVICE_URL}/flow.json`,
            formData.getBuffer(),
            {
                headers: formData.getHeaders()
            }
        )
        if (!response.data.chunkUploadSuccess) {
            throw new Error(`Upload problem: ${response.data.errorMessage}`)
        }
    }
    catch (e) {
        log.error(e)
    }
    return response
}

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

/**
 * @param url the url to crypt in order to get a unique id.
 * @return the cached file if cache is enabled.
 */
function getCachedFile(url) {
    if (cacheEnabled) {
        url = CACHE_DIR + md5(url)
    }
    return url
}

function writeCachedFile(filename, content) {
    if (cacheEnabled) {
        fs.writeFile(filename, content, () => { })
    }
}

/**
 * @param cachedFile the cached file to manage
 * @return a promise whith the cached file content if any (null otherwise)
 */
async function manageCache(cachedFile) {
    let content = null
    // check if cache enabled
    if (!cacheEnabled) return content

    try {
        await fs.promises.lstat(CACHE_DIR)
    }
    catch (e) {
        // Creating the cache dir if not exists
        log.info('connection', 'We are creating the cache dir %j', CACHE_DIR)
        mkdirp(CACHE_DIR)
    }

    // We'll try to find a previously fetched page
    try {
        await fs.promises.lstat(cachedFile)
    }
    catch (e) {
        log.info('connection', 'File not found in cache %j, we try to connect to get it.', cachedFile)
        return content
    }

    try {
        content = await fs.promises.readFile(cachedFile)
    }
    catch(e) {
        log.info('connection', 'Problem with cache file %j', e)
        throw e
    }
    return content
}


function initRequest() {
    // a dedicated request
    request = axios.create()

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
}

module.exports.init = init
module.exports.getPage = getPage
module.exports.getTimePage = getTimePage
module.exports.getPlanningPage = getPlanningPage
module.exports.uploadLinshareFile = uploadLinshareFile
module.exports.createLinshareFolder = createLinshareFolder
