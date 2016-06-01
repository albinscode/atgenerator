var replaceall = require("replaceall");

/**
 * This allows to fill a template that contains variables surrounded with $$.
 */
function DeclarationFiller() {

    var templateContent = null;
};

/**
 * @param data the object that contains all needed data to format.
 * @param content the content of the template to use for formatting.
 * @return the template content filled with values.
 */
DeclarationFiller.prototype.fill = function(data, content) {

    var templateContent = content;
    // We browse to inject variables in the footer 
    Object.keys(data).forEach(function(key) {
        var value = data[key]; 
        if (typeof(value) === 'string') {
            data.documentFooter = replaceall('$$' + key + '$$', value, data.documentFooter);
        }
    });
    
    
    // We fill all single values automatically
    Object.keys(data).forEach(function(key) {
        var value = data[key]; 
        //console.log(key + ": " + value + " type " + typeof(value));

        // We only have string types to manage
        if (typeof(value) === 'string') {
            templateContent = replaceall('$$' + key + '$$', value, templateContent);
        }
    });


    return templateContent;
}

module.exports = DeclarationFiller;
