define([
    'jquery',

    //---------------------------
    // We don't need local variables for these dependencies
    // because they are added to the jQuery namespace.
    '../core/SPServices.core.js'
], function (
    $
) {


    // This method for finding specific nodes in the returned XML was developed by Steve Workman. See his blog post
    // http://www.steveworkman.com/html5-2/javascript/2011/improving-javascript-xml-node-finding-performance-by-2000/
    // for performance details.
    $.fn.SPFilterNode = function (name) {
        return this.find('*').filter(function () {
            return this.nodeName === name;
        });
    }; // End $.fn.SPFilterNode

    return $;

});