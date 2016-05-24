/**
 * This allows to fill a template that contains variables surrounded with $$.
 */
function DeclarationFiller() {

    var templateContent = null;
};

function replaceAll(find, replace, str) {
      return str.replace(find, replace, str);
}

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
        data.documentFooter = replaceAll('$$' + key + '$$', value, data.documentFooter);
    });
    
    // We fill all single values automatically
    Object.keys(data).forEach(function(key) {
        var value = data[key]; 
        console.log(key + ": " + value + " type " + typeof(value));

        // We only have string types to manage
        if (typeof(value) === 'string') {
            templateContent = replaceAll('$$' + key + '$$', value, templateContent);
        }
    });

    // We display the computed footer
    console.log(data['documentFooter']);
    
    return templateContent;
}

module.exports = DeclarationFiller;
