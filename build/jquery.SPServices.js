/*
* SPServices - Work with SharePoint's Web Services using jQuery
* Version 2.0.0
* @requires jQuery v1.8 or greater - jQuery 1.10.x+ recommended
*
* Copyright (c) 2009-2015 Sympraxis Consulting LLC
* Examples and docs at:
* http://spservices.codeplex.com/
* Licensed under the MIT license:
* http://www.opensource.org/licenses/mit-license.php
*/
/*
* @description SPServices is a jQuery library which abstracts SharePoint's Web Services and makes them easier to use. It also includes functions which use the various Web Service operations to provide more useful (and cool) capabilities. It works entirely client side and requires no server install.
* @type jQuery
* @name SPServices
* @category Plugins/SPServices
* @author Sympraxis Consulting LLC/marc.anderson@sympraxisconsulting.com
* @build SPServices 2.0.0 2015-06-21 06:20:40
*/
;(function() {
var src_utils_constants, src_core_SPServicesutilsjs, src_core_SPServicescore, src_SPServices;
(function (factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else {
    factory(jQuery);
  }
}(function ($) {
  var jquery = jQuery;
  src_utils_constants = function () {
    /**
     * Maintains a set of constants for SPServices.
     *
     * @namespace constants
     */
    var constants = {
      // Version info
      VERSION: '2.0.0',
      // update it in package.json... build takes care of the rest
      // Simple strings
      spDelim: ';#',
      SLASH: '/',
      TXTColumnNotFound: 'Column not found on page',
      // String constants
      //   General
      SCHEMASharePoint: 'http://schemas.microsoft.com/sharepoint',
      multiLookupPrefix: 'MultiLookupPicker',
      multiLookupPrefix2013: 'MultiLookup',
      // Set up SOAP envelope
      SOAPEnvelope: {
        header: '<soap:Envelope xmlns:xsi=\'http://www.w3.org/2001/XMLSchema-instance\' xmlns:xsd=\'http://www.w3.org/2001/XMLSchema\' xmlns:soap=\'http://schemas.xmlsoap.org/soap/envelope/\'><soap:Body>',
        footer: '</soap:Body></soap:Envelope>',
        payload: ''
      },
      // Dropdown Types
      dropdownType: {
        simple: 'S',
        complex: 'C',
        multiSelect: 'M'
      },
      // Known list field types - See: http://msdn.microsoft.com/en-us/library/office/microsoft.sharepoint.spfieldtype(v=office.15).aspx
      spListFieldTypes: [
        'Integer',
        'Text',
        'Note',
        'DateTime',
        'Counter',
        'Choice',
        'Lookup',
        'Boolean',
        'Number',
        'Currency',
        'URL',
        //        "Computed", // NEW
        //        "Threading", // NEW
        //        "Guid", // NEW
        'MultiChoice',
        //        "GridChoice", // NEW
        'Calculated',
        'File',
        'Attachments',
        'User',
        'Recurrence',
        // Recurring event indicator (boolean) [0 | 1]
        //        "CrossProjectLink", // NEW
        'ModStat',
        'ContentTypeId',
        //        "PageSeparator", // NEW
        //        "ThreadIndex", // NEW
        'WorkflowStatus',
        // NEW
        'AllDayEvent',
        // All day event indicator (boolean) [0 | 1]
        //      "WorkflowEventType", // NEW
        //        "Geolocation", // NEW
        //        "OutcomeChoice", // NEW
        'RelatedItems',
        // Related Items in a Workflow Tasks list
        // Also seen
        'UserMulti',
        // Multiselect users
        'LookupMulti',
        // Multi-select lookup
        'datetime',
        // Calculated date/time result
        'float',
        // Calculated float
        'Calc'  // General calculated
      ]
    };
    return constants;
  }();
  src_core_SPServicesutilsjs = function ($, constants) {
    var utils = /** @lends spservices.utils */
      {
        // Get the current context (as much as we can) on startup
        // See: http://johnliu.net/blog/2012/2/3/sharepoint-javascript-current-page-context-info.html
        SPServicesContext: function () {
          // The SharePoint variables only give us a relative path. to match the result from WebUrlFromPageUrl, we need to add the protocol, host, and (if present) port.
          var siteRoot = location.protocol + '//' + location.host;
          // + (location.port !== "" ? location.port : "");
          // SharePoint 2010 gives us a context variable
          if (typeof _spPageContextInfo !== 'undefined') {
            this.thisSite = siteRoot + _spPageContextInfo.webServerRelativeUrl;
            this.thisList = _spPageContextInfo.pageListId;
            this.thisUserId = _spPageContextInfo.userId;  // In SharePoint 2007, we know the UserID only
          } else {
            this.thisSite = typeof L_Menu_BaseUrl !== 'undefined' ? siteRoot + L_Menu_BaseUrl : '';
            this.thisList = '';
            this.thisUserId = typeof _spUserId !== 'undefined' ? _spUserId : undefined;
          }
        },
        // End of function SPServicesContext
        // Global variables
        currentContext: new utils.SPServicesContext(),
        // Variable to hold the current context as we figure it out
        /**
         * Wrap an XML node (n) around a value (v)
         *
         */
        wrapNode: function (n, v) {
          var thisValue = typeof v !== 'undefined' ? v : '';
          return '<' + n + '>' + thisValue + '</' + n + '>';
        },
        /**
         * Generate a random number for sorting arrays randomly
         */
        randOrd: function () {
          return Math.round(Math.random()) - 0.5;
        },
        /**
         * If a string is a URL, format it as a link, else return the string as-is
         */
        checkLink: function (s) {
          return s.indexOf('http') === 0 || s.indexOf('/') === 0 ? '<a href=\'' + s + '\'>' + s + '</a>' : s;
        },
        /**
         * Get the filename from the full URL
         */
        fileName: function (s) {
          return s.substring(s.lastIndexOf('/') + 1, s.length);
        },
        /**
         * A map of special characters to XML escaped characters.
         * Taken from {@link http://dracoblue.net/dev/encodedecode-special-xml-characters-in-javascript/155/}
         *
         * @type {Object}
         */
        xml_special_to_escaped_one_map: {
          '&': '&amp;',
          '"': '&quot;',
          '<': '&lt;',
          '>': '&gt;'
        },
        // Paul T., 2015.05.01: Commented out since its not currently used.
        // var escaped_one_to_xml_special_map = {
        // '&amp;': '&',
        // '&quot;': '"',
        // '&lt;': '<',
        // '&gt;': '>'
        // };
        /**
         * Encode XML characters in a string
         *
         * @param {String} string
         */
        encodeXml: function (string) {
          return string.replace(/([\&"<>])/g, function (str, item) {
            return this.xml_special_to_escaped_one_map[item];
          });
        },
        // Paul T., 2015-05-02: Commented out since its not currently used.
        // function decodeXml(string) {
        // return string.replace(/(&quot;|&lt;|&gt;|&amp;)/g,
        // function (str, item) {
        // return escaped_one_to_xml_special_map[item];
        // });
        // }
        /* Taken from http://dracoblue.net/dev/encodedecode-special-xml-characters-in-javascript/155/ */
        /**
         * Escape column values
         */
        escapeColumnValue: function (s) {
          if (typeof s === 'string') {
            return s.replace(/&(?![a-zA-Z]{1,8};)/g, '&amp;');
          } else {
            return s;
          }
        },
        /**
         * Escape Url
         */
        escapeUrl: function (u) {
          return u.replace(/&/g, '%26');
        },
        /**
         * Split values like 1;#value into id and value
         * @type Class
         */
        SplitIndex: function (s) {
          var spl = s.split(constants.spDelim);
          this.id = spl[0];
          this.value = spl[1];
        },
        /**
         * Pad single digits with a zero
         *
         * @param {Number} n
         */
        pad: function (n) {
          return n < 10 ? '0' + n : n;
        },
        // James Padolsey's Regex Selector for jQuery http://james.padolsey.com/javascript/regex-selector-for-jquery/
        /*    $.expr[':'].regex = function (elem, index, match) {
         var matchParams = match[3].split(','),
         validLabels = /^(data|css):/,
         attr = {
         method: matchParams[0].match(validLabels) ?
         matchParams[0].split(':')[0] : 'attr',
         property: matchParams.shift().replace(validLabels, '')
         },
         regexFlags = 'ig',
         regex = new RegExp(matchParams.join('').replace(/^\s+|\s+$/g, ''), regexFlags);
         return regex.test($(elem)[attr.method](attr.property));
         };
         */
        /**
         * Build an error message based on passed parameters
         */
        errBox: function (func, param, msg) {
          var errMsg = '<b>Error in function</b><br/>' + func + '<br/>' + '<b>Parameter</b><br/>' + param + '<br/>' + '<b>Message</b><br/>' + msg + '<br/><br/>' + '<span onmouseover=\'this.style.cursor="hand";\' onmouseout=\'this.style.cursor="inherit";\' style=\'width=100%;text-align:right;\'>Click to continue</span></div>';
          modalBox(errMsg);
        },
        // End of function errBox
        // Finds the td which contains a form field in default forms using the comment which contains:
        //  <!--  FieldName="Title"
        //      FieldInternalName="Title"
        //      FieldType="SPFieldText"
        //  -->
        // as the "anchor" to find it. Necessary because SharePoint doesn't give all field types ids or specific classes.
        findFormField: function (columnName) {
          var thisFormBody;
          // There's no easy way to find one of these columns; we'll look for the comment with the columnName
          var searchText = RegExp('FieldName="' + columnName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '"', 'gi');
          // Loop through all of the ms-formbody table cells
          $('td.ms-formbody, td.ms-formbodysurvey').each(function () {
            // Check for the right comment
            if (searchText.test($(this).html())) {
              thisFormBody = $(this);
              // Found it, so we're done
              return false;
            }
          });
          return thisFormBody;
        },
        // End of function findFormField
        // Show a single attribute of a node, enclosed in a table
        //   node               The XML node
        //   opt                The current set of options
        showAttrs: function (node) {
          var i;
          var out = '<table class=\'ms-vb\' width=\'100%\'>';
          for (i = 0; i < node.attributes.length; i++) {
            out += '<tr><td width=\'10px\' style=\'font-weight:bold;\'>' + i + '</td><td width=\'100px\'>' + node.attributes.item(i).nodeName + '</td><td>' + utils.checkLink(node.attributes.item(i).nodeValue) + '</td></tr>';
          }
          out += '</table>';
          return out;
        },
        // End of function showAttrs
        // Add the option values to the utils.SOAPEnvelope.payload for the operation
        //  opt = options for the call
        //  paramArray = an array of option names to add to the payload
        //      "paramName" if the parameter name and the option name match
        //      ["paramName", "optionName"] if the parameter name and the option name are different (this handles early "wrappings" with inconsistent naming)
        //      {name: "paramName", sendNull: false} indicates the element is marked as "add to payload only if non-null"
        addToPayload: function (opt, paramArray) {
          var i;
          for (i = 0; i < paramArray.length; i++) {
            // the parameter name and the option name match
            if (typeof paramArray[i] === 'string') {
              utils.SOAPEnvelope.payload += utils.wrapNode(paramArray[i], opt[paramArray[i]]);  // the parameter name and the option name are different
            } else if ($.isArray(paramArray[i]) && paramArray[i].length === 2) {
              utils.SOAPEnvelope.payload += utils.wrapNode(paramArray[i][0], opt[paramArray[i][1]]);  // the element not a string or an array and is marked as "add to payload only if non-null"
            } else if (typeof paramArray[i] === 'object' && paramArray[i].sendNull !== undefined) {
              utils.SOAPEnvelope.payload += opt[paramArray[i].name] === undefined || opt[paramArray[i].name].length === 0 ? '' : utils.wrapNode(paramArray[i].name, opt[paramArray[i].name]);  // something isn't right, so report it
            } else {
              utils.errBox(opt.operation, 'paramArray[' + i + ']: ' + paramArray[i], 'Invalid paramArray element passed to addToPayload()');
            }
          }
        },
        // End of function addToPayload
        // The SiteData operations have the same names as other Web Service operations. To make them easy to call and unique, I'm using
        // the SiteData prefix on their names. This function replaces that name with the right name in the utils.SOAPEnvelope.
        siteDataFixSOAPEnvelope: function (SOAPEnvelope, siteDataOperation) {
          var siteDataOp = siteDataOperation.substring(8);
          SOAPEnvelope.opheader = SOAPEnvelope.opheader.replace(siteDataOperation, siteDataOp);
          SOAPEnvelope.opfooter = SOAPEnvelope.opfooter.replace(siteDataOperation, siteDataOp);
          return SOAPEnvelope;
        },
        // End of function siteDataFixSOAPEnvelope
        /**
         * Get the URL for a specified form for a list
         *
         * @param {Object} l
         * @param {Object} f
         */
        getListFormUrl: function (l, f) {
          var u;
          $().SPServices({
            operation: 'GetFormCollection',
            async: false,
            listName: l,
            completefunc: function (xData) {
              u = $(xData.responseXML).find('Form[Type=\'' + f + '\']').attr('Url');
            }
          });
          return u;
        },
        // End of function getListFormUrl
        /**
         * Returns the selected value(s) for a dropdown in an array. Expects a dropdown
         * object as returned by the DropdownCtl function.
         * If matchOnId is true, returns the ids rather than the text values for the
         * selection options(s).
         *
         * @param {Object} columnSelect
         * @param {Object} matchOnId
         */
        getDropdownSelected: function (columnSelect, matchOnId) {
          var columnSelectSelected = [];
          switch (columnSelect.Type) {
          case constants.dropdownType.simple:
            if (matchOnId) {
              columnSelectSelected.push(columnSelect.Obj.find('option:selected').val() || []);
            } else {
              columnSelectSelected.push(columnSelect.Obj.find('option:selected').text() || []);
            }
            break;
          case constants.dropdownType.complex:
            if (matchOnId) {
              columnSelectSelected.push(columnSelect.optHid.val() || []);
            } else {
              columnSelectSelected.push(columnSelect.Obj.val() || []);
            }
            break;
          case constants.dropdownType.multiSelect:
            $(columnSelect.master.resultControl).find('option').each(function () {
              if (matchOnId) {
                columnSelectSelected.push($(this).val());
              } else {
                columnSelectSelected.push($(this).html());
              }
            });
            break;
          default:
            break;
          }
          return columnSelectSelected;
        },
        // End of function getDropdownSelected
        /**
         * Generate a unique id for a containing div using the function name and the column display name.
         *
         * @param {Object} funcname
         * @param {Object} columnName
         * @param {Object} listName
         */
        genContainerId: function (funcname, columnName, listName) {
          var l = listName !== undefined ? listName : $().SPServices.SPListNameFromUrl();
          return funcname + '_' + $().SPServices.SPGetStaticFromDisplay({
            listName: l,
            columnDisplayName: columnName
          });
        }  // End of function genContainerId
      },
      //end: utils
      //-----------[ PRIVATE METHODS BELOW ]---------------------
      // These should all be defined against a local variable so
      // that we get smaller minified files
      /**
       * Call this function to pop up a branded modal msgBox
       * @private
       */
      modalBox = function (msg) {
        var boxCSS = 'position:absolute;width:300px;height:150px;padding:10px;background-color:#000000;color:#ffffff;z-index:30;font-family:\'Arial\';font-size:12px;display:none;';
        $('#aspnetForm').parent().append('<div id=\'SPServices_msgBox\' style=' + boxCSS + '>' + msg);
        var msgBoxObj = $('#SPServices_msgBox');
        var height = msgBoxObj.height();
        var width = msgBoxObj.width();
        var leftVal = $(window).width() / 2 - width / 2 + 'px';
        var topVal = $(window).height() / 2 - height / 2 - 100 + 'px';
        msgBoxObj.css({
          border: '5px #C02000 solid',
          left: leftVal,
          top: topVal
        }).show().fadeTo('slow', 0.75).click(function () {
          $(this).fadeOut('3000', function () {
            $(this).remove();
          });
        });
      };
    // End of function modalBox;
    return utils;
  }(jquery, src_utils_constants);
  src_core_SPServicescore = function ($, utils, constants) {
    // Caching
    var promisesCache = {};
    //   Web Service names
    var webServices = {
      ALERTS: 'Alerts',
      AUTHENTICATION: 'Authentication',
      COPY: 'Copy',
      FORMS: 'Forms',
      LISTS: 'Lists',
      MEETINGS: 'Meetings',
      OFFICIALFILE: 'OfficialFile',
      PEOPLE: 'People',
      PERMISSIONS: 'Permissions',
      PUBLISHEDLINKSSERVICE: 'PublishedLinksService',
      SEARCH: 'Search',
      SHAREPOINTDIAGNOSTICS: 'SharePointDiagnostics',
      SITEDATA: 'SiteData',
      SITES: 'Sites',
      SOCIALDATASERVICE: 'SocialDataService',
      SPELLCHECK: 'SpellCheck',
      TAXONOMYSERVICE: 'TaxonomyClientService',
      USERGROUP: 'usergroup',
      USERPROFILESERVICE: 'UserProfileService',
      VERSIONS: 'Versions',
      VIEWS: 'Views',
      WEBPARTPAGES: 'WebPartPages',
      WEBS: 'Webs',
      WORKFLOW: 'Workflow'
    };
    var encodeOptionList = [
      'listName',
      'description'
    ];
    // Used to encode options which may contain special characters
    // Array to store Web Service information
    //  WSops.OpName = [WebService, needs_SOAPAction];
    //      OpName              The name of the Web Service operation -> These names are unique
    //      WebService          The name of the WebService this operation belongs to
    //      needs_SOAPAction    Boolean indicating whether the operation needs to have the SOAPAction passed in the setRequestHeaderfunction.
    //                          true if the operation does a write, else false
    var WSops = {
      GetAlerts: [
        webServices.ALERTS,
        false
      ]
    };
    WSops.DeleteAlerts = [
      webServices.ALERTS,
      true
    ];
    WSops.Mode = [
      webServices.AUTHENTICATION,
      false
    ];
    WSops.Login = [
      webServices.AUTHENTICATION,
      false
    ];
    WSops.CopyIntoItems = [
      webServices.COPY,
      true
    ];
    WSops.CopyIntoItemsLocal = [
      webServices.COPY,
      true
    ];
    WSops.GetItem = [
      webServices.COPY,
      false
    ];
    WSops.GetForm = [
      webServices.FORMS,
      false
    ];
    WSops.GetFormCollection = [
      webServices.FORMS,
      false
    ];
    WSops.AddAttachment = [
      webServices.LISTS,
      true
    ];
    WSops.AddDiscussionBoardItem = [
      webServices.LISTS,
      true
    ];
    WSops.AddList = [
      webServices.LISTS,
      true
    ];
    WSops.AddListFromFeature = [
      webServices.LISTS,
      true
    ];
    WSops.ApplyContentTypeToList = [
      webServices.LISTS,
      true
    ];
    WSops.CheckInFile = [
      webServices.LISTS,
      true
    ];
    WSops.CheckOutFile = [
      webServices.LISTS,
      true
    ];
    WSops.CreateContentType = [
      webServices.LISTS,
      true
    ];
    WSops.DeleteAttachment = [
      webServices.LISTS,
      true
    ];
    WSops.DeleteContentType = [
      webServices.LISTS,
      true
    ];
    WSops.DeleteContentTypeXmlDocument = [
      webServices.LISTS,
      true
    ];
    WSops.DeleteList = [
      webServices.LISTS,
      true
    ];
    WSops.GetAttachmentCollection = [
      webServices.LISTS,
      false
    ];
    WSops.GetList = [
      webServices.LISTS,
      false
    ];
    WSops.GetListAndView = [
      webServices.LISTS,
      false
    ];
    WSops.GetListCollection = [
      webServices.LISTS,
      false
    ];
    WSops.GetListContentType = [
      webServices.LISTS,
      false
    ];
    WSops.GetListContentTypes = [
      webServices.LISTS,
      false
    ];
    WSops.GetListItemChanges = [
      webServices.LISTS,
      false
    ];
    WSops.GetListItemChangesSinceToken = [
      webServices.LISTS,
      false
    ];
    WSops.GetListItems = [
      webServices.LISTS,
      false
    ];
    WSops.GetVersionCollection = [
      webServices.LISTS,
      false
    ];
    WSops.UndoCheckOut = [
      webServices.LISTS,
      true
    ];
    WSops.UpdateContentType = [
      webServices.LISTS,
      true
    ];
    WSops.UpdateContentTypesXmlDocument = [
      webServices.LISTS,
      true
    ];
    WSops.UpdateContentTypeXmlDocument = [
      webServices.LISTS,
      true
    ];
    WSops.UpdateList = [
      webServices.LISTS,
      true
    ];
    WSops.UpdateListItems = [
      webServices.LISTS,
      true
    ];
    WSops.AddMeeting = [
      webServices.MEETINGS,
      true
    ];
    WSops.CreateWorkspace = [
      webServices.MEETINGS,
      true
    ];
    WSops.RemoveMeeting = [
      webServices.MEETINGS,
      true
    ];
    WSops.SetWorkSpaceTitle = [
      webServices.MEETINGS,
      true
    ];
    WSops.GetRecordRouting = [
      webServices.OFFICIALFILE,
      false
    ];
    WSops.GetRecordRoutingCollection = [
      webServices.OFFICIALFILE,
      false
    ];
    WSops.GetServerInfo = [
      webServices.OFFICIALFILE,
      false
    ];
    WSops.SubmitFile = [
      webServices.OFFICIALFILE,
      true
    ];
    WSops.ResolvePrincipals = [
      webServices.PEOPLE,
      true
    ];
    WSops.SearchPrincipals = [
      webServices.PEOPLE,
      false
    ];
    WSops.AddPermission = [
      webServices.PERMISSIONS,
      true
    ];
    WSops.AddPermissionCollection = [
      webServices.PERMISSIONS,
      true
    ];
    WSops.GetPermissionCollection = [
      webServices.PERMISSIONS,
      true
    ];
    WSops.RemovePermission = [
      webServices.PERMISSIONS,
      true
    ];
    WSops.RemovePermissionCollection = [
      webServices.PERMISSIONS,
      true
    ];
    WSops.UpdatePermission = [
      webServices.PERMISSIONS,
      true
    ];
    WSops.GetLinks = [
      webServices.PUBLISHEDLINKSSERVICE,
      true
    ];
    WSops.GetPortalSearchInfo = [
      webServices.SEARCH,
      false
    ];
    WSops.GetQuerySuggestions = [
      webServices.SEARCH,
      false
    ];
    WSops.GetSearchMetadata = [
      webServices.SEARCH,
      false
    ];
    WSops.Query = [
      webServices.SEARCH,
      false
    ];
    WSops.QueryEx = [
      webServices.SEARCH,
      false
    ];
    WSops.Registration = [
      webServices.SEARCH,
      false
    ];
    WSops.Status = [
      webServices.SEARCH,
      false
    ];
    WSops.SendClientScriptErrorReport = [
      webServices.SHAREPOINTDIAGNOSTICS,
      true
    ];
    WSops.GetAttachments = [
      webServices.SITEDATA,
      false
    ];
    WSops.EnumerateFolder = [
      webServices.SITEDATA,
      false
    ];
    WSops.SiteDataGetList = [
      webServices.SITEDATA,
      false
    ];
    WSops.SiteDataGetListCollection = [
      webServices.SITEDATA,
      false
    ];
    WSops.SiteDataGetSite = [
      webServices.SITEDATA,
      false
    ];
    WSops.SiteDataGetSiteUrl = [
      webServices.SITEDATA,
      false
    ];
    WSops.SiteDataGetWeb = [
      webServices.SITEDATA,
      false
    ];
    WSops.CreateWeb = [
      webServices.SITES,
      true
    ];
    WSops.DeleteWeb = [
      webServices.SITES,
      true
    ];
    WSops.GetSite = [
      webServices.SITES,
      false
    ];
    WSops.GetSiteTemplates = [
      webServices.SITES,
      false
    ];
    WSops.AddComment = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.AddTag = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.AddTagByKeyword = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.CountCommentsOfUser = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.CountCommentsOfUserOnUrl = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.CountCommentsOnUrl = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.CountRatingsOnUrl = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.CountTagsOfUser = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.DeleteComment = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.DeleteRating = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.DeleteTag = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.DeleteTagByKeyword = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.DeleteTags = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.GetAllTagTerms = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.GetAllTagTermsForUrlFolder = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.GetAllTagUrls = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.GetAllTagUrlsByKeyword = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.GetCommentsOfUser = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.GetCommentsOfUserOnUrl = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.GetCommentsOnUrl = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.GetRatingAverageOnUrl = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.GetRatingOfUserOnUrl = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.GetRatingOnUrl = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.GetRatingsOfUser = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.GetRatingsOnUrl = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.GetSocialDataForFullReplication = [
      webServices.SOCIALDATASERVICE,
      false
    ];
    WSops.GetTags = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.GetTagsOfUser = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.GetTagTerms = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.GetTagTermsOfUser = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.GetTagTermsOnUrl = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.GetTagUrlsOfUser = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.GetTagUrlsOfUserByKeyword = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.GetTagUrls = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.GetTagUrlsByKeyword = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.SetRating = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.UpdateComment = [
      webServices.SOCIALDATASERVICE,
      true
    ];
    WSops.SpellCheck = [
      webServices.SPELLCHECK,
      false
    ];
    // Taxonomy Service Calls
    // Updated 2011.01.27 by Thomas McMillan
    WSops.AddTerms = [
      webServices.TAXONOMYSERVICE,
      true
    ];
    WSops.GetChildTermsInTerm = [
      webServices.TAXONOMYSERVICE,
      false
    ];
    WSops.GetChildTermsInTermSet = [
      webServices.TAXONOMYSERVICE,
      false
    ];
    WSops.GetKeywordTermsByGuids = [
      webServices.TAXONOMYSERVICE,
      false
    ];
    WSops.GetTermsByLabel = [
      webServices.TAXONOMYSERVICE,
      false
    ];
    WSops.GetTermSets = [
      webServices.TAXONOMYSERVICE,
      false
    ];
    WSops.AddGroup = [
      webServices.USERGROUP,
      true
    ];
    WSops.AddGroupToRole = [
      webServices.USERGROUP,
      true
    ];
    WSops.AddRole = [
      webServices.USERGROUP,
      true
    ];
    WSops.AddRoleDef = [
      webServices.USERGROUP,
      true
    ];
    WSops.AddUserCollectionToGroup = [
      webServices.USERGROUP,
      true
    ];
    WSops.AddUserCollectionToRole = [
      webServices.USERGROUP,
      true
    ];
    WSops.AddUserToGroup = [
      webServices.USERGROUP,
      true
    ];
    WSops.AddUserToRole = [
      webServices.USERGROUP,
      true
    ];
    WSops.GetAllUserCollectionFromWeb = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetGroupCollection = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetGroupCollectionFromRole = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetGroupCollectionFromSite = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetGroupCollectionFromUser = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetGroupCollectionFromWeb = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetGroupInfo = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetRoleCollection = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetRoleCollectionFromGroup = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetRoleCollectionFromUser = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetRoleCollectionFromWeb = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetRoleInfo = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetRolesAndPermissionsForCurrentUser = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetRolesAndPermissionsForSite = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetUserCollection = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetUserCollectionFromGroup = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetUserCollectionFromRole = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetUserCollectionFromSite = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetUserCollectionFromWeb = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetUserInfo = [
      webServices.USERGROUP,
      false
    ];
    WSops.GetUserLoginFromEmail = [
      webServices.USERGROUP,
      false
    ];
    WSops.RemoveGroup = [
      webServices.USERGROUP,
      true
    ];
    WSops.RemoveGroupFromRole = [
      webServices.USERGROUP,
      true
    ];
    WSops.RemoveRole = [
      webServices.USERGROUP,
      true
    ];
    WSops.RemoveUserCollectionFromGroup = [
      webServices.USERGROUP,
      true
    ];
    WSops.RemoveUserCollectionFromRole = [
      webServices.USERGROUP,
      true
    ];
    WSops.RemoveUserCollectionFromSite = [
      webServices.USERGROUP,
      true
    ];
    WSops.RemoveUserFromGroup = [
      webServices.USERGROUP,
      true
    ];
    WSops.RemoveUserFromRole = [
      webServices.USERGROUP,
      true
    ];
    WSops.RemoveUserFromSite = [
      webServices.USERGROUP,
      true
    ];
    WSops.RemoveUserFromWeb = [
      webServices.USERGROUP,
      true
    ];
    WSops.UpdateGroupInfo = [
      webServices.USERGROUP,
      true
    ];
    WSops.UpdateRoleDefInfo = [
      webServices.USERGROUP,
      true
    ];
    WSops.UpdateRoleInfo = [
      webServices.USERGROUP,
      true
    ];
    WSops.UpdateUserInfo = [
      webServices.USERGROUP,
      true
    ];
    WSops.AddColleague = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.AddLink = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.AddMembership = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.AddPinnedLink = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.CreateMemberGroup = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.CreateUserProfileByAccountName = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.GetCommonColleagues = [
      webServices.USERPROFILESERVICE,
      false
    ];
    WSops.GetCommonManager = [
      webServices.USERPROFILESERVICE,
      false
    ];
    WSops.GetCommonMemberships = [
      webServices.USERPROFILESERVICE,
      false
    ];
    WSops.GetInCommon = [
      webServices.USERPROFILESERVICE,
      false
    ];
    WSops.GetPropertyChoiceList = [
      webServices.USERPROFILESERVICE,
      false
    ];
    WSops.GetUserColleagues = [
      webServices.USERPROFILESERVICE,
      false
    ];
    WSops.GetUserLinks = [
      webServices.USERPROFILESERVICE,
      false
    ];
    WSops.GetUserMemberships = [
      webServices.USERPROFILESERVICE,
      false
    ];
    WSops.GetUserPinnedLinks = [
      webServices.USERPROFILESERVICE,
      false
    ];
    WSops.GetUserProfileByGuid = [
      webServices.USERPROFILESERVICE,
      false
    ];
    WSops.GetUserProfileByIndex = [
      webServices.USERPROFILESERVICE,
      false
    ];
    WSops.GetUserProfileByName = [
      webServices.USERPROFILESERVICE,
      false
    ];
    WSops.GetUserProfileCount = [
      webServices.USERPROFILESERVICE,
      false
    ];
    WSops.GetUserProfileSchema = [
      webServices.USERPROFILESERVICE,
      false
    ];
    WSops.GetUserPropertyByAccountName = [
      webServices.USERPROFILESERVICE,
      false
    ];
    WSops.ModifyUserPropertyByAccountName = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.RemoveAllColleagues = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.RemoveAllLinks = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.RemoveAllMemberships = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.RemoveAllPinnedLinks = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.RemoveColleague = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.RemoveLink = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.RemoveMembership = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.RemovePinnedLink = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.UpdateColleaguePrivacy = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.UpdateLink = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.UpdateMembershipPrivacy = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.UpdatePinnedLink = [
      webServices.USERPROFILESERVICE,
      true
    ];
    WSops.DeleteAllVersions = [
      webServices.VERSIONS,
      true
    ];
    WSops.DeleteVersion = [
      webServices.VERSIONS,
      true
    ];
    WSops.GetVersions = [
      webServices.VERSIONS,
      false
    ];
    WSops.RestoreVersion = [
      webServices.VERSIONS,
      true
    ];
    WSops.AddView = [
      webServices.VIEWS,
      true
    ];
    WSops.DeleteView = [
      webServices.VIEWS,
      true
    ];
    WSops.GetView = [
      webServices.VIEWS,
      false
    ];
    WSops.GetViewHtml = [
      webServices.VIEWS,
      false
    ];
    WSops.GetViewCollection = [
      webServices.VIEWS,
      false
    ];
    WSops.UpdateView = [
      webServices.VIEWS,
      true
    ];
    WSops.UpdateViewHtml = [
      webServices.VIEWS,
      true
    ];
    WSops.AddWebPart = [
      webServices.WEBPARTPAGES,
      true
    ];
    WSops.AddWebPartToZone = [
      webServices.WEBPARTPAGES,
      true
    ];
    WSops.DeleteWebPart = [
      webServices.WEBPARTPAGES,
      true
    ];
    WSops.GetWebPart2 = [
      webServices.WEBPARTPAGES,
      false
    ];
    WSops.GetWebPartPage = [
      webServices.WEBPARTPAGES,
      false
    ];
    WSops.GetWebPartProperties = [
      webServices.WEBPARTPAGES,
      false
    ];
    WSops.GetWebPartProperties2 = [
      webServices.WEBPARTPAGES,
      false
    ];
    WSops.SaveWebPart2 = [
      webServices.WEBPARTPAGES,
      true
    ];
    WSops.CreateContentType = [
      webServices.WEBS,
      true
    ];
    WSops.GetColumns = [
      webServices.WEBS,
      false
    ];
    WSops.GetContentType = [
      webServices.WEBS,
      false
    ];
    WSops.GetContentTypes = [
      webServices.WEBS,
      false
    ];
    WSops.GetCustomizedPageStatus = [
      webServices.WEBS,
      false
    ];
    WSops.GetListTemplates = [
      webServices.WEBS,
      false
    ];
    WSops.GetObjectIdFromUrl = [
      webServices.WEBS,
      false
    ];
    // 2010
    WSops.GetWeb = [
      webServices.WEBS,
      false
    ];
    WSops.GetWebCollection = [
      webServices.WEBS,
      false
    ];
    WSops.GetAllSubWebCollection = [
      webServices.WEBS,
      false
    ];
    WSops.UpdateColumns = [
      webServices.WEBS,
      true
    ];
    WSops.UpdateContentType = [
      webServices.WEBS,
      true
    ];
    WSops.WebUrlFromPageUrl = [
      webServices.WEBS,
      false
    ];
    WSops.AlterToDo = [
      webServices.WORKFLOW,
      true
    ];
    WSops.ClaimReleaseTask = [
      webServices.WORKFLOW,
      true
    ];
    WSops.GetTemplatesForItem = [
      webServices.WORKFLOW,
      false
    ];
    WSops.GetToDosForItem = [
      webServices.WORKFLOW,
      false
    ];
    WSops.GetWorkflowDataForItem = [
      webServices.WORKFLOW,
      false
    ];
    WSops.GetWorkflowTaskData = [
      webServices.WORKFLOW,
      false
    ];
    WSops.StartWorkflow = [
      webServices.WORKFLOW,
      true
    ];
    var SOAPAction;
    // Main function, which calls SharePoint's Web Services directly.
    $.fn.SPServices = function (options) {
      // If there are no options passed in, use the defaults.  Extend replaces each default with the passed option.
      var opt = $.extend({}, $.fn.SPServices.defaults, options);
      // Encode options which may contain special character, esp. ampersand
      for (var i = 0; i < encodeOptionList.length; i++) {
        if (typeof opt[encodeOptionList[i]] === 'string') {
          opt[encodeOptionList[i]] = utils.encodeXml(opt[encodeOptionList[i]]);
        }
      }
      // Put together operation header and SOAPAction for the SOAP call based on which Web Service we're calling
      utils.SOAPEnvelope.opheader = '<' + opt.operation + ' ';
      switch (WSops[opt.operation][0]) {
      case webServices.ALERTS:
        utils.utils.SOAPEnvelope.opheader += 'xmlns=\'' + constants.SCHEMASharePoint + '/soap/2002/1/alerts/\' >';
        SOAPAction = constants.SCHEMASharePoint + '/soap/2002/1/alerts/';
        break;
      case webServices.MEETINGS:
        utils.utils.SOAPEnvelope.opheader += 'xmlns=\'' + constants.SCHEMASharePoint + '/soap/meetings/\' >';
        SOAPAction = constants.SCHEMASharePoint + '/soap/meetings/';
        break;
      case webServices.OFFICIALFILE:
        utils.utils.SOAPEnvelope.opheader += 'xmlns=\'' + constants.SCHEMASharePoint + '/soap/recordsrepository/\' >';
        SOAPAction = constants.SCHEMASharePoint + '/soap/recordsrepository/';
        break;
      case webServices.PERMISSIONS:
        utils.utils.SOAPEnvelope.opheader += 'xmlns=\'' + constants.SCHEMASharePoint + '/soap/directory/\' >';
        SOAPAction = constants.SCHEMASharePoint + '/soap/directory/';
        break;
      case webServices.PUBLISHEDLINKSSERVICE:
        utils.utils.SOAPEnvelope.opheader += 'xmlns=\'http://microsoft.com/webservices/SharePointPortalServer/PublishedLinksService/\' >';
        SOAPAction = 'http://microsoft.com/webservices/SharePointPortalServer/PublishedLinksService/';
        break;
      case webServices.SEARCH:
        utils.utils.SOAPEnvelope.opheader += 'xmlns=\'urn:Microsoft.Search\' >';
        SOAPAction = 'urn:Microsoft.Search/';
        break;
      case webServices.SHAREPOINTDIAGNOSTICS:
        utils.utils.SOAPEnvelope.opheader += 'xmlns=\'' + constants.SCHEMASharePoint + '/diagnostics/\' >';
        SOAPAction = 'http://schemas.microsoft.com/sharepoint/diagnostics/';
        break;
      case webServices.SOCIALDATASERVICE:
        utils.utils.SOAPEnvelope.opheader += 'xmlns=\'http://microsoft.com/webservices/SharePointPortalServer/SocialDataService\' >';
        SOAPAction = 'http://microsoft.com/webservices/SharePointPortalServer/SocialDataService/';
        break;
      case webServices.SPELLCHECK:
        utils.utils.SOAPEnvelope.opheader += 'xmlns=\'http://schemas.microsoft.com/sharepoint/publishing/spelling/\' >';
        SOAPAction = 'http://schemas.microsoft.com/sharepoint/publishing/spelling/SpellCheck';
        break;
      case webServices.TAXONOMYSERVICE:
        utils.utils.SOAPEnvelope.opheader += 'xmlns=\'' + constants.SCHEMASharePoint + '/taxonomy/soap/\' >';
        SOAPAction = constants.SCHEMASharePoint + '/taxonomy/soap/';
        break;
      case webServices.USERGROUP:
        utils.utils.SOAPEnvelope.opheader += 'xmlns=\'' + constants.SCHEMASharePoint + '/soap/directory/\' >';
        SOAPAction = constants.SCHEMASharePoint + '/soap/directory/';
        break;
      case webServices.USERPROFILESERVICE:
        utils.utils.SOAPEnvelope.opheader += 'xmlns=\'http://microsoft.com/webservices/SharePointPortalServer/UserProfileService\' >';
        SOAPAction = 'http://microsoft.com/webservices/SharePointPortalServer/UserProfileService/';
        break;
      case webServices.WEBPARTPAGES:
        utils.utils.SOAPEnvelope.opheader += 'xmlns=\'http://microsoft.com/sharepoint/webpartpages\' >';
        SOAPAction = 'http://microsoft.com/sharepoint/webpartpages/';
        break;
      case webServices.WORKFLOW:
        utils.utils.SOAPEnvelope.opheader += 'xmlns=\'' + constants.SCHEMASharePoint + '/soap/workflow/\' >';
        SOAPAction = constants.SCHEMASharePoint + '/soap/workflow/';
        break;
      default:
        utils.utils.SOAPEnvelope.opheader += 'xmlns=\'' + constants.SCHEMASharePoint + '/soap/\'>';
        SOAPAction = constants.SCHEMASharePoint + '/soap/';
        break;
      }
      // Add the operation to the SOAPAction and opfooter
      SOAPAction += opt.operation;
      utils.utils.SOAPEnvelope.opfooter = '</' + opt.operation + '>';
      // Build the URL for the Ajax call based on which operation we're calling
      // If the webURL has been provided, then use it, else use the current site
      var ajaxURL = '_vti_bin/' + WSops[opt.operation][0] + '.asmx';
      var webURL = opt.webURL !== undefined ? opt.webURL : opt.webUrl;
      if (webURL.charAt(webURL.length - 1) === constants.SLASH) {
        ajaxURL = webURL + ajaxURL;
      } else if (webURL.length > 0) {
        ajaxURL = webURL + constants.SLASH + ajaxURL;
      } else {
        var thisSite = $().SPServices.SPGetCurrentSite();
        ajaxURL = thisSite + (thisSite.charAt(thisSite.length - 1) === constants.SLASH ? ajaxURL : constants.SLASH + ajaxURL);
      }
      utils.utils.SOAPEnvelope.payload = '';
      // Each operation requires a different set of values.  This switch statement sets them up in the utils.utils.SOAPEnvelope.payload.
      switch (opt.operation) {
      // ALERT OPERATIONS
      case 'GetAlerts':
        break;
      case 'DeleteAlerts':
        utils.utils.SOAPEnvelope.payload += '<IDs>';
        for (i = 0; i < opt.IDs.length; i++) {
          utils.utils.SOAPEnvelope.payload += utils.wrapNode('string', opt.IDs[i]);
        }
        utils.utils.SOAPEnvelope.payload += '</IDs>';
        break;
      // AUTHENTICATION OPERATIONS
      case 'Mode':
        break;
      case 'Login':
        utils.utils.addToPayload(opt, [
          'username',
          'password'
        ]);
        break;
      // COPY OPERATIONS
      case 'CopyIntoItems':
        utils.utils.addToPayload(opt, ['SourceUrl']);
        utils.utils.SOAPEnvelope.payload += '<DestinationUrls>';
        for (i = 0; i < opt.DestinationUrls.length; i++) {
          utils.utils.SOAPEnvelope.payload += utils.wrapNode('string', opt.DestinationUrls[i]);
        }
        utils.utils.SOAPEnvelope.payload += '</DestinationUrls>';
        utils.utils.addToPayload(opt, [
          'Fields',
          'Stream',
          'Results'
        ]);
        break;
      case 'CopyIntoItemsLocal':
        utils.utils.addToPayload(opt, ['SourceUrl']);
        utils.utils.SOAPEnvelope.payload += '<DestinationUrls>';
        for (i = 0; i < opt.DestinationUrls.length; i++) {
          utils.utils.SOAPEnvelope.payload += utils.wrapNode('string', opt.DestinationUrls[i]);
        }
        utils.utils.SOAPEnvelope.payload += '</DestinationUrls>';
        break;
      case 'GetItem':
        utils.utils.addToPayload(opt, [
          'Url',
          'Fields',
          'Stream'
        ]);
        break;
      // FORM OPERATIONS
      case 'GetForm':
        utils.utils.addToPayload(opt, [
          'listName',
          'formUrl'
        ]);
        break;
      case 'GetFormCollection':
        utils.utils.addToPayload(opt, ['listName']);
        break;
      // LIST OPERATIONS
      case 'AddAttachment':
        utils.utils.addToPayload(opt, [
          'listName',
          'listItemID',
          'fileName',
          'attachment'
        ]);
        break;
      case 'AddDiscussionBoardItem':
        utils.utils.addToPayload(opt, [
          'listName',
          'message'
        ]);
        break;
      case 'AddList':
        utils.addToPayload(opt, [
          'listName',
          'description',
          'templateID'
        ]);
        break;
      case 'AddListFromFeature':
        utils.addToPayload(opt, [
          'listName',
          'description',
          'featureID',
          'templateID'
        ]);
        break;
      case 'ApplyContentTypeToList':
        utils.addToPayload(opt, [
          'webUrl',
          'contentTypeId',
          'listName'
        ]);
        break;
      case 'CheckInFile':
        utils.addToPayload(opt, [
          'pageUrl',
          'comment',
          'CheckinType'
        ]);
        break;
      case 'CheckOutFile':
        utils.addToPayload(opt, [
          'pageUrl',
          'checkoutToLocal',
          'lastmodified'
        ]);
        break;
      case 'CreateContentType':
        utils.addToPayload(opt, [
          'listName',
          'displayName',
          'parentType',
          'fields',
          'contentTypeProperties',
          'addToView'
        ]);
        break;
      case 'DeleteAttachment':
        utils.addToPayload(opt, [
          'listName',
          'listItemID',
          'url'
        ]);
        break;
      case 'DeleteContentType':
        utils.addToPayload(opt, [
          'listName',
          'contentTypeId'
        ]);
        break;
      case 'DeleteContentTypeXmlDocument':
        utils.addToPayload(opt, [
          'listName',
          'contentTypeId',
          'documentUri'
        ]);
        break;
      case 'DeleteList':
        utils.addToPayload(opt, ['listName']);
        break;
      case 'GetAttachmentCollection':
        utils.addToPayload(opt, [
          'listName',
          [
            'listItemID',
            'ID'
          ]
        ]);
        break;
      case 'GetList':
        utils.addToPayload(opt, ['listName']);
        break;
      case 'GetListAndView':
        utils.addToPayload(opt, [
          'listName',
          'viewName'
        ]);
        break;
      case 'GetListCollection':
        break;
      case 'GetListContentType':
        utils.addToPayload(opt, [
          'listName',
          'contentTypeId'
        ]);
        break;
      case 'GetListContentTypes':
        utils.addToPayload(opt, ['listName']);
        break;
      case 'GetListItems':
        utils.addToPayload(opt, [
          'listName',
          'viewName',
          [
            'query',
            'CAMLQuery'
          ],
          [
            'viewFields',
            'CAMLViewFields'
          ],
          [
            'rowLimit',
            'CAMLRowLimit'
          ],
          [
            'queryOptions',
            'CAMLQueryOptions'
          ]
        ]);
        break;
      case 'GetListItemChanges':
        utils.addToPayload(opt, [
          'listName',
          'viewFields',
          'since',
          'contains'
        ]);
        break;
      case 'GetListItemChangesSinceToken':
        utils.addToPayload(opt, [
          'listName',
          'viewName',
          [
            'query',
            'CAMLQuery'
          ],
          [
            'viewFields',
            'CAMLViewFields'
          ],
          [
            'rowLimit',
            'CAMLRowLimit'
          ],
          [
            'queryOptions',
            'CAMLQueryOptions'
          ],
          {
            name: 'changeToken',
            sendNull: false
          },
          {
            name: 'contains',
            sendNull: false
          }
        ]);
        break;
      case 'GetVersionCollection':
        utils.addToPayload(opt, [
          'strlistID',
          'strlistItemID',
          'strFieldName'
        ]);
        break;
      case 'UndoCheckOut':
        utils.addToPayload(opt, ['pageUrl']);
        break;
      case 'UpdateContentType':
        utils.addToPayload(opt, [
          'listName',
          'contentTypeId',
          'contentTypeProperties',
          'newFields',
          'updateFields',
          'deleteFields',
          'addToView'
        ]);
        break;
      case 'UpdateContentTypesXmlDocument':
        utils.addToPayload(opt, [
          'listName',
          'newDocument'
        ]);
        break;
      case 'UpdateContentTypeXmlDocument':
        utils.addToPayload(opt, [
          'listName',
          'contentTypeId',
          'newDocument'
        ]);
        break;
      case 'UpdateList':
        utils.addToPayload(opt, [
          'listName',
          'listProperties',
          'newFields',
          'updateFields',
          'deleteFields',
          'listVersion'
        ]);
        break;
      case 'UpdateListItems':
        utils.addToPayload(opt, ['listName']);
        if (typeof opt.updates !== 'undefined' && opt.updates.length > 0) {
          utils.addToPayload(opt, ['updates']);
        } else {
          utils.utils.SOAPEnvelope.payload += '<updates><Batch OnError=\'Continue\'><Method ID=\'1\' Cmd=\'' + opt.batchCmd + '\'>';
          for (i = 0; i < opt.valuepairs.length; i++) {
            utils.utils.SOAPEnvelope.payload += '<Field Name=\'' + opt.valuepairs[i][0] + '\'>' + utils.escapeColumnValue(opt.valuepairs[i][1]) + '</Field>';
          }
          if (opt.batchCmd !== 'New') {
            utils.utils.SOAPEnvelope.payload += '<Field Name=\'ID\'>' + opt.ID + '</Field>';
          }
          utils.utils.SOAPEnvelope.payload += '</Method></Batch></updates>';
        }
        break;
      // MEETINGS OPERATIONS
      case 'AddMeeting':
        utils.addToPayload(opt, [
          'organizerEmail',
          'uid',
          'sequence',
          'utcDateStamp',
          'title',
          'location',
          'utcDateStart',
          'utcDateEnd',
          'nonGregorian'
        ]);
        break;
      case 'CreateWorkspace':
        utils.addToPayload(opt, [
          'title',
          'templateName',
          'lcid',
          'timeZoneInformation'
        ]);
        break;
      case 'RemoveMeeting':
        utils.addToPayload(opt, [
          'recurrenceId',
          'uid',
          'sequence',
          'utcDateStamp',
          'cancelMeeting'
        ]);
        break;
      case 'SetWorkspaceTitle':
        utils.addToPayload(opt, ['title']);
        break;
      // OFFICIALFILE OPERATIONS
      case 'GetRecordRouting':
        utils.addToPayload(opt, ['recordRouting']);
        break;
      case 'GetRecordRoutingCollection':
        break;
      case 'GetServerInfo':
        break;
      case 'SubmitFile':
        utils.addToPayload(opt, ['fileToSubmit'], ['properties'], ['recordRouting'], ['sourceUrl'], ['userName']);
        break;
      // PEOPLE OPERATIONS
      case 'ResolvePrincipals':
        utils.addToPayload(opt, [
          'principalKeys',
          'principalType',
          'addToUserInfoList'
        ]);
        break;
      case 'SearchPrincipals':
        utils.addToPayload(opt, [
          'searchText',
          'maxResults',
          'principalType'
        ]);
        break;
      // PERMISSION OPERATIONS
      case 'AddPermission':
        utils.addToPayload(opt, [
          'objectName',
          'objectType',
          'permissionIdentifier',
          'permissionType',
          'permissionMask'
        ]);
        break;
      case 'AddPermissionCollection':
        utils.addToPayload(opt, [
          'objectName',
          'objectType',
          'permissionsInfoXml'
        ]);
        break;
      case 'GetPermissionCollection':
        utils.addToPayload(opt, [
          'objectName',
          'objectType'
        ]);
        break;
      case 'RemovePermission':
        utils.addToPayload(opt, [
          'objectName',
          'objectType',
          'permissionIdentifier',
          'permissionType'
        ]);
        break;
      case 'RemovePermissionCollection':
        utils.addToPayload(opt, [
          'objectName',
          'objectType',
          'memberIdsXml'
        ]);
        break;
      case 'UpdatePermission':
        utils.addToPayload(opt, [
          'objectName',
          'objectType',
          'permissionIdentifier',
          'permissionType',
          'permissionMask'
        ]);
        break;
      // PUBLISHEDLINKSSERVICE OPERATIONS
      case 'GetLinks':
        break;
      // SEARCH OPERATIONS
      case 'GetPortalSearchInfo':
        utils.utils.SOAPEnvelope.opheader = '<' + opt.operation + ' xmlns=\'http://microsoft.com/webservices/OfficeServer/QueryService\'>';
        SOAPAction = 'http://microsoft.com/webservices/OfficeServer/QueryService/' + opt.operation;
        break;
      case 'GetQuerySuggestions':
        utils.utils.SOAPEnvelope.opheader = '<' + opt.operation + ' xmlns=\'http://microsoft.com/webservices/OfficeServer/QueryService\'>';
        SOAPAction = 'http://microsoft.com/webservices/OfficeServer/QueryService/' + opt.operation;
        utils.utils.SOAPEnvelope.payload += utils.wrapNode('queryXml', utils.encodeXml(opt.queryXml));
        break;
      case 'GetSearchMetadata':
        utils.SOAPEnvelope.opheader = '<' + opt.operation + ' xmlns=\'http://microsoft.com/webservices/OfficeServer/QueryService\'>';
        SOAPAction = 'http://microsoft.com/webservices/OfficeServer/QueryService/' + opt.operation;
        break;
      case 'Query':
        utils.SOAPEnvelope.payload += utils.wrapNode('queryXml', utils.encodeXml(opt.queryXml));
        break;
      case 'QueryEx':
        utils.SOAPEnvelope.opheader = '<' + opt.operation + ' xmlns=\'http://microsoft.com/webservices/OfficeServer/QueryService\'>';
        SOAPAction = 'http://microsoft.com/webservices/OfficeServer/QueryService/' + opt.operation;
        utils.SOAPEnvelope.payload += utils.wrapNode('queryXml', utils.encodeXml(opt.queryXml));
        break;
      case 'Registration':
        utils.SOAPEnvelope.payload += utils.wrapNode('registrationXml', utils.encodeXml(opt.registrationXml));
        break;
      case 'Status':
        break;
      // SHAREPOINTDIAGNOSTICS OPERATIONS
      case 'SendClientScriptErrorReport':
        utils.addToPayload(opt, [
          'message',
          'file',
          'line',
          'client',
          'stack',
          'team',
          'originalFile'
        ]);
        break;
      // SITEDATA OPERATIONS
      case 'EnumerateFolder':
        utils.addToPayload(opt, ['strFolderUrl']);
        break;
      case 'GetAttachments':
        utils.addToPayload(opt, [
          'strListName',
          'strItemId'
        ]);
        break;
      case 'SiteDataGetList':
        utils.addToPayload(opt, ['strListName']);
        // Because this operation has a name which duplicates the Lists WS, need to handle
        utils.SOAPEnvelope = utils.siteDataFixSOAPEnvelope(utils.SOAPEnvelope, opt.operation);
        break;
      case 'SiteDataGetListCollection':
        // Because this operation has a name which duplicates the Lists WS, need to handle
        utils.SOAPEnvelope = utils.siteDataFixSOAPEnvelope(utils.SOAPEnvelope, opt.operation);
        break;
      case 'SiteDataGetSite':
        // Because this operation has a name which duplicates the Lists WS, need to handle
        utils.SOAPEnvelope = utils.siteDataFixSOAPEnvelope(utils.SOAPEnvelope, opt.operation);
        break;
      case 'SiteDataGetSiteUrl':
        utils.addToPayload(opt, ['Url']);
        // Because this operation has a name which duplicates the Lists WS, need to handle
        utils.SOAPEnvelope = utils.siteDataFixSOAPEnvelope(utils.SOAPEnvelope, opt.operation);
        break;
      case 'SiteDataGetWeb':
        // Because this operation has a name which duplicates the Lists WS, need to handle
        utils.SOAPEnvelope = utils.siteDataFixSOAPEnvelope(utils.SOAPEnvelope, opt.operation);
        break;
      // SITES OPERATIONS
      case 'CreateWeb':
        utils.addToPayload(opt, [
          'url',
          'title',
          'description',
          'templateName',
          'language',
          'languageSpecified',
          'locale',
          'localeSpecified',
          'collationLocale',
          'collationLocaleSpecified',
          'uniquePermissions',
          'uniquePermissionsSpecified',
          'anonymous',
          'anonymousSpecified',
          'presence',
          'presenceSpecified'
        ]);
        break;
      case 'DeleteWeb':
        utils.addToPayload(opt, ['url']);
        break;
      case 'GetSite':
        utils.addToPayload(opt, ['SiteUrl']);
        break;
      case 'GetSiteTemplates':
        utils.addToPayload(opt, [
          'LCID',
          'TemplateList'
        ]);
        break;
      // SOCIALDATASERVICE OPERATIONS
      case 'AddComment':
        utils.addToPayload(opt, [
          'url',
          'comment',
          'isHighPriority',
          'title'
        ]);
        break;
      case 'AddTag':
        utils.addToPayload(opt, [
          'url',
          'termID',
          'title',
          'isPrivate'
        ]);
        break;
      case 'AddTagByKeyword':
        utils.addToPayload(opt, [
          'url',
          'keyword',
          'title',
          'isPrivate'
        ]);
        break;
      case 'CountCommentsOfUser':
        utils.addToPayload(opt, ['userAccountName']);
        break;
      case 'CountCommentsOfUserOnUrl':
        utils.addToPayload(opt, [
          'userAccountName',
          'url'
        ]);
        break;
      case 'CountCommentsOnUrl':
        utils.addToPayload(opt, ['url']);
        break;
      case 'CountRatingsOnUrl':
        utils.addToPayload(opt, ['url']);
        break;
      case 'CountTagsOfUser':
        utils.addToPayload(opt, ['userAccountName']);
        break;
      case 'DeleteComment':
        utils.addToPayload(opt, [
          'url',
          'lastModifiedTime'
        ]);
        break;
      case 'DeleteRating':
        utils.addToPayload(opt, ['url']);
        break;
      case 'DeleteTag':
        utils.addToPayload(opt, [
          'url',
          'termID'
        ]);
        break;
      case 'DeleteTagByKeyword':
        utils.addToPayload(opt, [
          'url',
          'keyword'
        ]);
        break;
      case 'DeleteTags':
        utils.addToPayload(opt, ['url']);
        break;
      case 'GetAllTagTerms':
        utils.addToPayload(opt, ['maximumItemsToReturn']);
        break;
      case 'GetAllTagTermsForUrlFolder':
        utils.addToPayload(opt, [
          'urlFolder',
          'maximumItemsToReturn'
        ]);
        break;
      case 'GetAllTagUrls':
        utils.addToPayload(opt, ['termID']);
        break;
      case 'GetAllTagUrlsByKeyword':
        utils.addToPayload(opt, ['keyword']);
        break;
      case 'GetCommentsOfUser':
        utils.addToPayload(opt, [
          'userAccountName',
          'maximumItemsToReturn',
          'startIndex'
        ]);
        break;
      case 'GetCommentsOfUserOnUrl':
        utils.addToPayload(opt, [
          'userAccountName',
          'url'
        ]);
        break;
      case 'GetCommentsOnUrl':
        utils.addToPayload(opt, [
          'url',
          'maximumItemsToReturn',
          'startIndex'
        ]);
        if (typeof opt.excludeItemsTime !== 'undefined' && opt.excludeItemsTime.length > 0) {
          utils.SOAPEnvelope.payload += utils.wrapNode('excludeItemsTime', opt.excludeItemsTime);
        }
        break;
      case 'GetRatingAverageOnUrl':
        utils.addToPayload(opt, ['url']);
        break;
      case 'GetRatingOfUserOnUrl':
        utils.addToPayload(opt, [
          'userAccountName',
          'url'
        ]);
        break;
      case 'GetRatingOnUrl':
        utils.addToPayload(opt, ['url']);
        break;
      case 'GetRatingsOfUser':
        utils.addToPayload(opt, ['userAccountName']);
        break;
      case 'GetRatingsOnUrl':
        utils.addToPayload(opt, ['url']);
        break;
      case 'GetSocialDataForFullReplication':
        utils.addToPayload(opt, ['userAccountName']);
        break;
      case 'GetTags':
        utils.addToPayload(opt, ['url']);
        break;
      case 'GetTagsOfUser':
        utils.addToPayload(opt, [
          'userAccountName',
          'maximumItemsToReturn',
          'startIndex'
        ]);
        break;
      case 'GetTagTerms':
        utils.addToPayload(opt, ['maximumItemsToReturn']);
        break;
      case 'GetTagTermsOfUser':
        utils.addToPayload(opt, [
          'userAccountName',
          'maximumItemsToReturn'
        ]);
        break;
      case 'GetTagTermsOnUrl':
        utils.addToPayload(opt, [
          'url',
          'maximumItemsToReturn'
        ]);
        break;
      case 'GetTagUrls':
        utils.addToPayload(opt, ['termID']);
        break;
      case 'GetTagUrlsByKeyword':
        utils.addToPayload(opt, ['keyword']);
        break;
      case 'GetTagUrlsOfUser':
        utils.addToPayload(opt, [
          'termID',
          'userAccountName'
        ]);
        break;
      case 'GetTagUrlsOfUserByKeyword':
        utils.addToPayload(opt, [
          'keyword',
          'userAccountName'
        ]);
        break;
      case 'SetRating':
        utils.addToPayload(opt, [
          'url',
          'rating',
          'title',
          'analysisDataEntry'
        ]);
        break;
      case 'UpdateComment':
        utils.addToPayload(opt, [
          'url',
          'lastModifiedTime',
          'comment',
          'isHighPriority'
        ]);
        break;
      // SPELLCHECK OPERATIONS
      case 'SpellCheck':
        utils.addToPayload(opt, [
          'chunksToSpell',
          'declaredLanguage',
          'useLad'
        ]);
        break;
      // TAXONOMY OPERATIONS
      case 'AddTerms':
        utils.addToPayload(opt, [
          'sharedServiceId',
          'termSetId',
          'lcid',
          'newTerms'
        ]);
        break;
      case 'GetChildTermsInTerm':
        utils.addToPayload(opt, [
          'sspId',
          'lcid',
          'termId',
          'termSetId'
        ]);
        break;
      case 'GetChildTermsInTermSet':
        utils.addToPayload(opt, [
          'sspId',
          'lcid',
          'termSetId'
        ]);
        break;
      case 'GetKeywordTermsByGuids':
        utils.addToPayload(opt, [
          'termIds',
          'lcid'
        ]);
        break;
      case 'GetTermsByLabel':
        utils.addToPayload(opt, [
          'label',
          'lcid',
          'matchOption',
          'resultCollectionSize',
          'termIds',
          'addIfNotFound'
        ]);
        break;
      case 'GetTermSets':
        utils.addToPayload(opt, [
          'sharedServiceIds',
          'termSetIds',
          'lcid',
          'clientTimeStamps',
          'clientVersions'
        ]);
        break;
      // USERS AND GROUPS OPERATIONS
      case 'AddGroup':
        utils.addToPayload(opt, [
          'groupName',
          'ownerIdentifier',
          'ownerType',
          'defaultUserLoginName',
          'description'
        ]);
        break;
      case 'AddGroupToRole':
        utils.addToPayload(opt, [
          'groupName',
          'roleName'
        ]);
        break;
      case 'AddRole':
        utils.addToPayload(opt, [
          'roleName',
          'description',
          'permissionMask'
        ]);
        break;
      case 'AddRoleDef':
        utils.addToPayload(opt, [
          'roleName',
          'description',
          'permissionMask'
        ]);
        break;
      case 'AddUserCollectionToGroup':
        utils.addToPayload(opt, [
          'groupName',
          'usersInfoXml'
        ]);
        break;
      case 'AddUserCollectionToRole':
        utils.addToPayload(opt, [
          'roleName',
          'usersInfoXml'
        ]);
        break;
      case 'AddUserToGroup':
        utils.addToPayload(opt, [
          'groupName',
          'userName',
          'userLoginName',
          'userEmail',
          'userNotes'
        ]);
        break;
      case 'AddUserToRole':
        utils.addToPayload(opt, [
          'roleName',
          'userName',
          'userLoginName',
          'userEmail',
          'userNotes'
        ]);
        break;
      case 'GetAllUserCollectionFromWeb':
        break;
      case 'GetGroupCollection':
        utils.addToPayload(opt, ['groupNamesXml']);
        break;
      case 'GetGroupCollectionFromRole':
        utils.addToPayload(opt, ['roleName']);
        break;
      case 'GetGroupCollectionFromSite':
        break;
      case 'GetGroupCollectionFromUser':
        utils.addToPayload(opt, ['userLoginName']);
        break;
      case 'GetGroupCollectionFromWeb':
        break;
      case 'GetGroupInfo':
        utils.addToPayload(opt, ['groupName']);
        break;
      case 'GetRoleCollection':
        utils.addToPayload(opt, ['roleNamesXml']);
        break;
      case 'GetRoleCollectionFromGroup':
        utils.addToPayload(opt, ['groupName']);
        break;
      case 'GetRoleCollectionFromUser':
        utils.addToPayload(opt, ['userLoginName']);
        break;
      case 'GetRoleCollectionFromWeb':
        break;
      case 'GetRoleInfo':
        utils.addToPayload(opt, ['roleName']);
        break;
      case 'GetRolesAndPermissionsForCurrentUser':
        break;
      case 'GetRolesAndPermissionsForSite':
        break;
      case 'GetUserCollection':
        utils.addToPayload(opt, ['userLoginNamesXml']);
        break;
      case 'GetUserCollectionFromGroup':
        utils.addToPayload(opt, ['groupName']);
        break;
      case 'GetUserCollectionFromRole':
        utils.addToPayload(opt, ['roleName']);
        break;
      case 'GetUserCollectionFromSite':
        break;
      case 'GetUserCollectionFromWeb':
        break;
      case 'GetUserInfo':
        utils.addToPayload(opt, ['userLoginName']);
        break;
      case 'GetUserLoginFromEmail':
        utils.addToPayload(opt, ['emailXml']);
        break;
      case 'RemoveGroup':
        utils.addToPayload(opt, ['groupName']);
        break;
      case 'RemoveGroupFromRole':
        utils.addToPayload(opt, [
          'roleName',
          'groupName'
        ]);
        break;
      case 'RemoveRole':
        utils.addToPayload(opt, ['roleName']);
        break;
      case 'RemoveUserCollectionFromGroup':
        utils.addToPayload(opt, [
          'groupName',
          'userLoginNamesXml'
        ]);
        break;
      case 'RemoveUserCollectionFromRole':
        utils.addToPayload(opt, [
          'roleName',
          'userLoginNamesXml'
        ]);
        break;
      case 'RemoveUserCollectionFromSite':
        utils.addToPayload(opt, ['userLoginNamesXml']);
        break;
      case 'RemoveUserFromGroup':
        utils.addToPayload(opt, [
          'groupName',
          'userLoginName'
        ]);
        break;
      case 'RemoveUserFromRole':
        utils.addToPayload(opt, [
          'roleName',
          'userLoginName'
        ]);
        break;
      case 'RemoveUserFromSite':
        utils.addToPayload(opt, ['userLoginName']);
        break;
      case 'RemoveUserFromWeb':
        utils.addToPayload(opt, ['userLoginName']);
        break;
      case 'UpdateGroupInfo':
        utils.addToPayload(opt, [
          'oldGroupName',
          'groupName',
          'ownerIdentifier',
          'ownerType',
          'description'
        ]);
        break;
      case 'UpdateRoleDefInfo':
        utils.addToPayload(opt, [
          'oldRoleName',
          'roleName',
          'description',
          'permissionMask'
        ]);
        break;
      case 'UpdateRoleInfo':
        utils.addToPayload(opt, [
          'oldRoleName',
          'roleName',
          'description',
          'permissionMask'
        ]);
        break;
      case 'UpdateUserInfo':
        utils.addToPayload(opt, [
          'userLoginName',
          'userName',
          'userEmail',
          'userNotes'
        ]);
        break;
      // USERPROFILESERVICE OPERATIONS
      case 'AddColleague':
        utils.addToPayload(opt, [
          'accountName',
          'colleagueAccountName',
          'group',
          'privacy',
          'isInWorkGroup'
        ]);
        break;
      case 'AddLink':
        utils.addToPayload(opt, [
          'accountName',
          'name',
          'url',
          'group',
          'privacy'
        ]);
        break;
      case 'AddMembership':
        utils.addToPayload(opt, [
          'accountName',
          'membershipInfo',
          'group',
          'privacy'
        ]);
        break;
      case 'AddPinnedLink':
        utils.addToPayload(opt, [
          'accountName',
          'name',
          'url'
        ]);
        break;
      case 'CreateMemberGroup':
        utils.addToPayload(opt, ['membershipInfo']);
        break;
      case 'CreateUserProfileByAccountName':
        utils.addToPayload(opt, ['accountName']);
        break;
      case 'GetCommonColleagues':
        utils.addToPayload(opt, ['accountName']);
        break;
      case 'GetCommonManager':
        utils.addToPayload(opt, ['accountName']);
        break;
      case 'GetCommonMemberships':
        utils.addToPayload(opt, ['accountName']);
        break;
      case 'GetInCommon':
        utils.addToPayload(opt, ['accountName']);
        break;
      case 'GetPropertyChoiceList':
        utils.addToPayload(opt, ['propertyName']);
        break;
      case 'GetUserColleagues':
        utils.addToPayload(opt, ['accountName']);
        break;
      case 'GetUserLinks':
        utils.addToPayload(opt, ['accountName']);
        break;
      case 'GetUserMemberships':
        utils.addToPayload(opt, ['accountName']);
        break;
      case 'GetUserPinnedLinks':
        utils.addToPayload(opt, ['accountName']);
        break;
      case 'GetUserProfileByGuid':
        utils.addToPayload(opt, ['guid']);
        break;
      case 'GetUserProfileByIndex':
        utils.addToPayload(opt, ['index']);
        break;
      case 'GetUserProfileByName':
        // Note that this operation is inconsistent with the others, using AccountName rather than accountName
        if (typeof opt.accountName !== 'undefined' && opt.accountName.length > 0) {
          utils.addToPayload(opt, [[
              'AccountName',
              'accountName'
            ]]);
        } else {
          utils.addToPayload(opt, ['AccountName']);
        }
        break;
      case 'GetUserProfileCount':
        break;
      case 'GetUserProfileSchema':
        break;
      case 'GetUserPropertyByAccountName':
        utils.addToPayload(opt, [
          'accountName',
          'propertyName'
        ]);
        break;
      case 'ModifyUserPropertyByAccountName':
        utils.addToPayload(opt, [
          'accountName',
          'newData'
        ]);
        break;
      case 'RemoveAllColleagues':
        utils.addToPayload(opt, ['accountName']);
        break;
      case 'RemoveAllLinks':
        utils.addToPayload(opt, ['accountName']);
        break;
      case 'RemoveAllMemberships':
        utils.addToPayload(opt, ['accountName']);
        break;
      case 'RemoveAllPinnedLinks':
        utils.addToPayload(opt, ['accountName']);
        break;
      case 'RemoveColleague':
        utils.addToPayload(opt, [
          'accountName',
          'colleagueAccountName'
        ]);
        break;
      case 'RemoveLink':
        utils.addToPayload(opt, [
          'accountName',
          'id'
        ]);
        break;
      case 'RemoveMembership':
        utils.addToPayload(opt, [
          'accountName',
          'sourceInternal',
          'sourceReference'
        ]);
        break;
      case 'RemovePinnedLink':
        utils.addToPayload(opt, [
          'accountName',
          'id'
        ]);
        break;
      case 'UpdateColleaguePrivacy':
        utils.addToPayload(opt, [
          'accountName',
          'colleagueAccountName',
          'newPrivacy'
        ]);
        break;
      case 'UpdateLink':
        utils.addToPayload(opt, [
          'accountName',
          'data'
        ]);
        break;
      case 'UpdateMembershipPrivacy':
        utils.addToPayload(opt, [
          'accountName',
          'sourceInternal',
          'sourceReference',
          'newPrivacy'
        ]);
        break;
      case 'UpdatePinnedLink ':
        utils.addToPayload(opt, [
          'accountName',
          'data'
        ]);
        break;
      // VERSIONS OPERATIONS
      case 'DeleteAllVersions':
        utils.addToPayload(opt, ['fileName']);
        break;
      case 'DeleteVersion':
        utils.addToPayload(opt, [
          'fileName',
          'fileVersion'
        ]);
        break;
      case 'GetVersions':
        utils.addToPayload(opt, ['fileName']);
        break;
      case 'RestoreVersion':
        utils.addToPayload(opt, [
          'fileName',
          'fileVersion'
        ]);
        break;
      // VIEW OPERATIONS
      case 'AddView':
        utils.addToPayload(opt, [
          'listName',
          'viewName',
          'viewFields',
          'query',
          'rowLimit',
          'rowLimit',
          'type',
          'makeViewDefault'
        ]);
        break;
      case 'DeleteView':
        utils.addToPayload(opt, [
          'listName',
          'viewName'
        ]);
        break;
      case 'GetView':
        utils.addToPayload(opt, [
          'listName',
          'viewName'
        ]);
        break;
      case 'GetViewCollection':
        utils.addToPayload(opt, ['listName']);
        break;
      case 'GetViewHtml':
        utils.addToPayload(opt, [
          'listName',
          'viewName'
        ]);
        break;
      case 'UpdateView':
        utils.addToPayload(opt, [
          'listName',
          'viewName',
          'viewProperties',
          'query',
          'viewFields',
          'aggregations',
          'formats',
          'rowLimit'
        ]);
        break;
      case 'UpdateViewHtml':
        utils.addToPayload(opt, [
          'listName',
          'viewName',
          'viewProperties',
          'toolbar',
          'viewHeader',
          'viewBody',
          'viewFooter',
          'viewEmpty',
          'rowLimitExceeded',
          'query',
          'viewFields',
          'aggregations',
          'formats',
          'rowLimit'
        ]);
        break;
      // WEBPARTPAGES OPERATIONS
      case 'AddWebPart':
        utils.addToPayload(opt, [
          'pageUrl',
          'webPartXml',
          'storage'
        ]);
        break;
      case 'AddWebPartToZone':
        utils.addToPayload(opt, [
          'pageUrl',
          'webPartXml',
          'storage',
          'zoneId',
          'zoneIndex'
        ]);
        break;
      case 'DeleteWebPart':
        utils.addToPayload(opt, [
          'pageUrl',
          'storageKey',
          'storage'
        ]);
        break;
      case 'GetWebPart2':
        utils.addToPayload(opt, [
          'pageUrl',
          'storageKey',
          'storage',
          'behavior'
        ]);
        break;
      case 'GetWebPartPage':
        utils.addToPayload(opt, [
          'documentName',
          'behavior'
        ]);
        break;
      case 'GetWebPartProperties':
        utils.addToPayload(opt, [
          'pageUrl',
          'storage'
        ]);
        break;
      case 'GetWebPartProperties2':
        utils.addToPayload(opt, [
          'pageUrl',
          'storage',
          'behavior'
        ]);
        break;
      case 'SaveWebPart2':
        utils.addToPayload(opt, [
          'pageUrl',
          'storageKey',
          'webPartXml',
          'storage',
          'allowTypeChange'
        ]);
        break;
      // WEBS OPERATIONS
      case 'Webs.CreateContentType':
        utils.addToPayload(opt, [
          'displayName',
          'parentType',
          'newFields',
          'contentTypeProperties'
        ]);
        break;
      case 'GetColumns':
        utils.addToPayload(opt, ['webUrl']);
        break;
      case 'GetContentType':
        utils.addToPayload(opt, ['contentTypeId']);
        break;
      case 'GetContentTypes':
        break;
      case 'GetCustomizedPageStatus':
        utils.addToPayload(opt, ['fileUrl']);
        break;
      case 'GetListTemplates':
        break;
      case 'GetObjectIdFromUrl':
        utils.addToPayload(opt, ['objectUrl']);
        break;
      case 'GetWeb':
        utils.addToPayload(opt, [[
            'webUrl',
            'webURL'
          ]]);
        break;
      case 'GetWebCollection':
        break;
      case 'GetAllSubWebCollection':
        break;
      case 'UpdateColumns':
        utils.addToPayload(opt, [
          'newFields',
          'updateFields',
          'deleteFields'
        ]);
        break;
      case 'Webs.UpdateContentType':
        utils.addToPayload(opt, [
          'contentTypeId',
          'contentTypeProperties',
          'newFields',
          'updateFields',
          'deleteFields'
        ]);
        break;
      case 'WebUrlFromPageUrl':
        utils.addToPayload(opt, [[
            'pageUrl',
            'pageURL'
          ]]);
        break;
      // WORKFLOW OPERATIONS
      case 'AlterToDo':
        utils.addToPayload(opt, [
          'item',
          'todoId',
          'todoListId',
          'taskData'
        ]);
        break;
      case 'ClaimReleaseTask':
        utils.addToPayload(opt, [
          'item',
          'taskId',
          'listId',
          'fClaim'
        ]);
        break;
      case 'GetTemplatesForItem':
        utils.addToPayload(opt, ['item']);
        break;
      case 'GetToDosForItem':
        utils.addToPayload(opt, ['item']);
        break;
      case 'GetWorkflowDataForItem':
        utils.addToPayload(opt, ['item']);
        break;
      case 'GetWorkflowTaskData':
        utils.addToPayload(opt, [
          'item',
          'listId',
          'taskId'
        ]);
        break;
      case 'StartWorkflow':
        utils.addToPayload(opt, [
          'item',
          'templateId',
          'workflowParameters'
        ]);
        break;
      default:
        break;
      }
      // Glue together the pieces of the SOAP message
      var msg = utils.SOAPEnvelope.header + utils.SOAPEnvelope.opheader + utils.SOAPEnvelope.payload + utils.SOAPEnvelope.opfooter + utils.SOAPEnvelope.footer;
      // Check to see if we've already cached the results
      var cachedPromise;
      if (opt.cacheXML) {
        cachedPromise = promisesCache[msg];
      }
      if (typeof cachedPromise === 'undefined') {
        // Finally, make the Ajax call
        var p = $.ajax({
          // The relative URL for the AJAX call
          url: ajaxURL,
          // By default, the AJAX calls are asynchronous.  You can specify false to require a synchronous call.
          async: opt.async,
          // Before sending the msg, need to send the request header
          beforeSend: function (xhr) {
            // If we need to pass the SOAPAction, do so
            if (WSops[opt.operation][1]) {
              xhr.setRequestHeader('SOAPAction', SOAPAction);
            }
          },
          // Always a POST
          type: 'POST',
          // Here is the SOAP request we've built above
          data: msg,
          // We're getting XML; tell jQuery so that it doesn't need to do a best guess
          dataType: 'xml',
          // and this is its content type
          contentType: 'text/xml;charset=\'utf-8\'',
          complete: function (xData, Status) {
            // When the call is complete, call the completefunc if there is one
            if ($.isFunction(opt.completefunc)) {
              opt.completefunc(xData, Status);
            }
          }
        });
        if (opt.cacheXML) {
          promisesCache[msg] = p;
        }
        // Return the promise
        return p;
      } else {
        // Call the completefunc if there is one
        if ($.isFunction(opt.completefunc)) {
          cachedPromise.done(function (data, status, jqXHR) {
            opt.completefunc(jqXHR, status);
          });
        }
        // Return the cached promise
        return cachedPromise;
      }
    };
    // End $.fn.SPServices
    // Defaults added as a function in our library means that the caller can override the defaults
    // for their session by calling this function.  Each operation requires a different set of options;
    // we allow for all in a standardized way.
    $.fn.SPServices.defaults = {
      cacheXML: false,
      // If true, we'll cache the XML results with jQuery's .data() function
      operation: '',
      // The Web Service operation
      webURL: '',
      // URL of the target Web
      makeViewDefault: false,
      // true to make the view the default view for the list
      // For operations requiring CAML, these options will override any abstractions
      viewName: '',
      // View name in CAML format.
      CAMLQuery: '',
      // Query in CAML format
      CAMLViewFields: '',
      // View fields in CAML format
      CAMLRowLimit: 0,
      // Row limit as a string representation of an integer
      CAMLQueryOptions: '<QueryOptions></QueryOptions>',
      // Query options in CAML format
      // Abstractions for CAML syntax
      batchCmd: 'Update',
      // Method Cmd for UpdateListItems
      valuepairs: [],
      // Fieldname / Fieldvalue pairs for UpdateListItems
      // As of v0.7.1, removed all options which were assigned an empty string ("")
      DestinationUrls: [],
      // Array of destination URLs for copy operations
      behavior: 'Version3',
      // An SPWebServiceBehavior indicating whether the client supports Windows SharePoint Services 2.0 or Windows SharePoint Services 3.0: {Version2 | Version3 }
      storage: 'Shared',
      // A Storage value indicating how the Web Part is stored: {None | Personal | Shared}
      objectType: 'List',
      // objectType for operations which require it
      cancelMeeting: true,
      // true to delete a meeting;false to remove its association with a Meeting Workspace site
      nonGregorian: false,
      // true if the calendar is set to a format other than Gregorian;otherwise, false.
      fClaim: false,
      // Specifies if the action is a claim or a release. Specifies true for a claim and false for a release.
      recurrenceId: 0,
      // The recurrence ID for the meeting that needs its association removed. This parameter can be set to 0 for single-instance meetings.
      sequence: 0,
      // An integer that is used to determine the ordering of updates in case they arrive out of sequence. Updates with a lower-than-current sequence are discarded. If the sequence is equal to the current sequence, the latest update are applied.
      maximumItemsToReturn: 0,
      // SocialDataService maximumItemsToReturn
      startIndex: 0,
      // SocialDataService startIndex
      isHighPriority: false,
      // SocialDataService isHighPriority
      isPrivate: false,
      // SocialDataService isPrivate
      rating: 1,
      // SocialDataService rating
      maxResults: 10,
      // Unless otherwise specified, the maximum number of principals that can be returned from a provider is 10.
      principalType: 'User',
      // Specifies user scope and other information: [None | User | DistributionList | SecurityGroup | SharePointGroup | All]
      async: true,
      // Allow the user to force async
      completefunc: null  // Function to call on completion
    };  // End $.fn.SPServices.defaults
  }(jquery, src_core_SPServicesutilsjs, src_utils_constants);
  src_SPServices = function ($) {
    return $;
  }(jquery);
}));
}());