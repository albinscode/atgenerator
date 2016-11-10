var log = require('./LogBridge');
var Promise = require('promise');
var cheerio = require('cheerio');
var provider = require('./od-provider.js');
var fs = require('fs');

/*
 * TODO externalize this module and TemplateProvider to standalone modules
 * @param output if a string, directory the full directory containing ods to merge.
 * If an array of string, list of files to merge.
 * @param filename the filename of the final generated file
 */
module.exports.merge = function(output, filename) {

    // The main file that will be used for merging
    var mainFile = null;
    var promises = [];
    var contents = [];
    // Where to put
    var items = null;

    // We provide the file list with a full directory
    if (typeof output === 'string') {
        items = fs.readdirSync(output);
    } else {
        items = output;
    }
    items.sort();

    // We iterate over ods files
    items.filter(function (value) { return value.indexOf('.ods') !== -1; }).forEach(function (value, key) {
        // We only have file names, we preprend directory
        if (typeof output == 'string') {
            value = output + '/' + value;
            log.verbose('ods merger', 'Browsing directory %s for ods files, found %s', output, value);
        }
        // We open all ods files
        promises.push(provider.getFromFile(value).then(function (content) {
            // We keep first file as reference
            if (mainFile === null) {
                mainFile = value;
            } else {
                // we delete other files, only content is needed
                fs.unlink(value, function (err) {
                    if (err) throw err;
                });
            }
            // To keep the sorting
            contents[key] = content;
        }));
    });

    // We process the content of all files
    Promise.all(promises).then(function() {
        $ = cheerio.load(contents[0].content, { xmlMode: true} );
        contents.forEach(function(value, key) {
            try {
                // We do not process the first element another time as far as it is being used
                // as base line for the future merged document
                if (key !== 0) {
                    $2 = cheerio.load(value.content, { xmlMode: true });
                    $('office\\:spreadsheet').append($2('table\\:table'));
                }
            } catch (e) {
                log.error('ods merger', e);
            }
        });
        provider.update(mainFile, filename, $.html());
        // We can delete the first file
        fs.unlink(mainFile, function (err) {
            if (err) throw err;
        });

    });
};
