/**
 * SPServices main module. Simply loads all other modules. Those modules should
 * all add themselves to the jQuery object (likely $.fn namespace)... This module
 * only needs to reference those modules as dependencies.
 *
 * @namespace spservices
 *
 * @example
 *
 * require(['jquery', "src/SPServices"], function($){
 *      // $.fn.SPServices() should now be available here.
 *      // Notice how there is no need to define a second function parameter
 *      // for the `SPServices` module - that's because all SPSerivces methods
 *      // utilities add them selves to the jQuery namespace.
 * })
 *
 */
define([
    "jquery",
    "./core/SPServices.core"
], function($){
    return $;
});
