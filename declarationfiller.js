/**
 * @param data the object that contains all needed data to format.
 * @param template the file name of the template to use for formatting.
 * @param output the folder where to put generated file(s).
 */
function DeclarationFiller (data, template, outputFolder) {

    this.data = data;
    this.template = template;
    this.outputFolder = outputFolder;
}

DeclarationFiller.prototype.fill = function() {
/*
    for (attr in this.data) {

        console.log('Attribut: ' + this.data.attr);
    }
*/
    Object.keys(this.data).forEach(function(key) {
        console.log(key);
    });
}
module.exports = DeclarationFiller;
