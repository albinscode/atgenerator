var replaceall = require("replaceall");
var log = require('./LogBridge');

/**
 * This allows to fill a template that contains variables surrounded with $$.
 */
function DeclarationFiller() {

    var templateContent = null;
}

/**
 * @param data the object that contains all needed data to format.
 * @param content the content of the template to use for formatting.
 * @return the template content filled with values.
 */
DeclarationFiller.prototype.fill = function(data, content) {

    var self = this;
    var templateContent = content;
    // We browse to inject variables in the footer and in the file name pattern only once (this function is recursive)
    if (data.documentFooter !== undefined) {
        Object.keys(data).forEach(function(key) {
            var value = data[key];
            if (typeof(value) === 'string') {
                pattern = '$$' + key + '$$';
                data.documentFooter = replaceall(pattern, value, data.documentFooter);
                data.filenamePattern = replaceall(pattern, value, data.filenamePattern);
            } else {
                log.verbose('filler', typeof(value));
            }
        });
    }


    // We fill all single values automatically
    Object.keys(data).forEach(function(key) {
        var value = data[key];
        log.verbose('filler', 'key %j, value %j, type %j', key, value, typeof(value));


        // We only have string types to manage
        if (typeof(value) === 'string') {
                var pattern = null;
                if (key.indexOf('AM') === 0 || key.indexOf('PM') === 0) {
                    pattern = '<text:p text:style-name="Standard"><text:user-field-get text:name="' + key + '">$$' + key + '$$</text:user-field-get></text:p>';
                }
                else {
                    pattern = '$$' + key + '$$';
                }
            templateContent = replaceall(pattern, value, templateContent);
        } else if (typeof(value) === 'object' && typeof(value) !== undefined && value !== null) {
            try {
                templateContent = self.fill(value, templateContent);
            } catch (e) {
                log.error('filler', e);
            }
        }

    });


    return templateContent;
};

module.exports = DeclarationFiller;
