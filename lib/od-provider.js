/**
 *  This module allows to load a template as an ODT or ODS file (libreoffice writer or calc format).
 *  This ODT/ODS file is a zip with serveral xml and binaries.
 *  The content.xml and styles.xml are the two files that are extracted.
 */

var fs = require('fs');
var JSZip = require('jszip');
var log = require('npmlog');

/**
 * Gets the ODS/ODT content and styles as a plain string.
 * @param template the file name of the odt template to load.
 * @return a Promise with an object "content" and "styles" data.
 */
module.exports.getFromFile = function(file) {

    return new Promise(function (resolve, reject) {
        fs.readFile(file, function(err, content) {
            if (err) {
                log.error('file provider', 'Cannot open file file %j', file);
                throw err;
            }
            var zip = new JSZip();
            zip.loadAsync(content).then(function(zip) {
                zip.file('content.xml').async('string').then(function(dataContent) {
                    log.verbose('open document provider', 'Content from file successfully fetched: ' + file);
                    zip.file('styles.xml').async('string').then(function(dataStyles) {
                        log.verbose('file provider', 'Styles from file successfully fetched: ' + file);
                        var result = {};
                        result.content = dataContent;
                        result.styles = dataStyles;
                        resolve(result);
                    });
                });
            });
        });
    });
};

/**
 * Updates the content of the template in a new file.
 * @param the template file name
 * @param the content to update
 * @param the styles to update
 * @return a Promise to perform after the file write.
 */
module.exports.update = function(template, newfile, content, styles) {
    return new Promise(function (resolve, reject) {
        fs.readFile(template, function(err, zipContent) {
            var zip = new JSZip();
            zip.loadAsync(zipContent).then(function(zip) {
                zip.file('content.xml', content);
                if (styles !== undefined) zip.file('styles.xml', styles);
                // We need to write it to file system
                zip.generateNodeStream({type:'nodebuffer', streamFiles:true})
                    .pipe(fs.createWriteStream(newfile))
                    .on('finish', function () {
                        log.verbose('open document provider', 'File %j created', newfile);
                        resolve();
                });
            });
        });
    });

};
