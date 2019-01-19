/**
*  Importer
*  a simple loader manager for classes and assets with dependencies for PHP, Python, Node/XPCOM/JS
*
*  @version 1.1.2
*  https://github.com/foo123/Importer
**/
!function( root, name, factory ){
"use strict";
if ( ('undefined'!==typeof Components)&&('object'===typeof Components.classes)&&('object'===typeof Components.classesByID)&&Components.utils&&('function'===typeof Components.utils['import']) ) /* XPCOM */
    (root.$deps = root.$deps||{}) && (root.EXPORTED_SYMBOLS = [name]) && (root[name] = root.$deps[name] = factory.call(root));
else if ( ('object'===typeof module)&&module.exports ) /* CommonJS */
    (module.$deps = module.$deps||{}) && (module.exports = module.$deps[name] = factory.call(root));
else if ( ('undefined'!==typeof System)&&('function'===typeof System.register)&&('function'===typeof System['import']) ) /* ES6 module */
    System.register(name,[],function($__export){$__export(name, factory.call(root));});
else if ( ('function'===typeof define)&&define.amd&&('function'===typeof require)&&('function'===typeof require.specified)&&require.specified(name) /*&& !require.defined(name)*/ ) /* AMD */
    define(name,['module'],function(module){factory.moduleUri = module.uri; return factory.call(root);});
else if ( !(name in root) ) /* Browser/WebWorker/.. */
    (root[name] = factory.call(root)||1)&&('function'===typeof(define))&&define.amd&&define(function(){return root[name];} );
}(  /* current root */          this, 
    /* module name */           "Importer",
    /* module factory */        function ModuleFactory__Importer( undef ){
"use strict";

var PROTO = 'prototype', HAS = Object[PROTO].hasOwnProperty, ATTR = 'setAttribute', LOWER = 'toLowerCase',
    toString = Object[PROTO].toString, map = Array[PROTO].map, KEYS = Object.keys,
    startsWith = String[PROTO].startsWith 
            ? function( s, pre, pos ){return s.startsWith(pre, pos||0);} 
            : function( s, pre, pos ){pos=pos||0; return pre === s.substr(pos, pre.length+pos);},
    NOP = function( ){ },
    
    isXPCOM = ('undefined' !== typeof Components) && ('object' === typeof Components.classes) && ('object' === typeof Components.classesByID) && Components.utils && ('function' === typeof Components.utils['import']),
    isNode = !isXPCOM && ('undefined' !== typeof global) && ('[object global]' === toString.call(global)),
    isWebWorker = !isXPCOM && !isNode && ('undefined' !== typeof WorkerGlobalScope) && ('function' === typeof importScripts) && (navigator instanceof WorkerNavigator),
    isBrowser = !isXPCOM && !isNode && !isWebWorker && ('undefined' !== typeof navigator),
    isAMD = ('function' === typeof define) && define.amd && ('function' === typeof require),
    isESModule = !isXPCOM && !isNode && ('undefined' !== typeof System) && ('function' === typeof System.register) && ('function' === typeof System['import']),
    Cu = isXPCOM ? Components.utils : null,
    Cc = isXPCOM ? Components.classes : null,
    Ci = isXPCOM ? Components.interfaces : null
;
    
/*
  System.import('module').then(function(module) {
    // ..
  });
*/

if ( isXPCOM )
{
    // do some necessary imports
    Cu['import']('resource://gre/modules/NetUtil.jsm');
    Cu['import']('resource://gre/modules/osfile.jsm');
}

var Scope = isXPCOM ? this : (isNode ? global : (isWebWorker ? this : window)),
    
    fs = isNode ? require('fs') : null,
    import_module = isXPCOM
    ? function import_module( name, path, scope ) {
        Cu['import']( path, scope );
        return scope[ name ];
    }
    : (isNode
    ? function import_module( name, path, scope ) {
        return require( path );
    }
    : (isWebWorker
    ? function import_module( name, path, scope ) {
        importScripts( path );
        return scope[ name ];
    }
    : NOP)),
    XHR = function( ) {
    return window.XMLHttpRequest
        // code for IE7+, Firefox, Chrome, Opera, Safari
        ? new XMLHttpRequest( )
        // code for IE6, IE5
        : new ActiveXObject('Microsoft.XMLHTTP') // or ActiveXObject("Msxml2.XMLHTTP"); ??
    ;
    },
    
    DS_RE = /\/|\\/g, PROTOCOL = '://', PROTOCOL_RE = '#PROTOCOL#', ID_RE = /[\-.\/\\:]+/g,
    DS = isXPCOM
    ? (function path_separator( ){
        // http://stackoverflow.com/a/7092596/3591273
        var profil_dir = Cc['@mozilla.org/file/directory_service;1'].getService(Ci.nsIProperties).get('ProfD',Ci.nsIFile);
        profil_dir.append('abc'); profil_dir.append('abc');
        return profil_dir.path.substr(profil_dir.path.length-('abc'.length)-1,1);
    })( )
    : (isNode
    ? require('path').sep /* https://nodejs.org/api/path.html#path_path_sep */
    : '/'),
    
    fileurl_2_nsfile = function( file_uri ) {
        // NetUtil.newURI(file_uri).QueryInterface(Ci.nsIFileURL).file
        // http://stackoverflow.com/q/24817347/3591273
        /*var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService),
            url = ios.newURI(file_uri, null, null), // url is a nsIURI
            // file is a nsIFile    
            file = url.QueryInterface(Ci.nsIFileURL).file;*/
        return Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService).newURI(file_uri, null, null).QueryInterface(Ci.nsIFileURL).file;
    },
    
    read_file = isXPCOM
    ? function read_file( path, enc, defval ) {
        var data, file, stream, len;
        // https://developer.mozilla.org/en-US/Add-ons/Code_snippets/File_I_O
        file = fileurl_2_nsfile( path );
        stream = Cc['@mozilla.org/network/file-input-stream;1'].createInstance(Ci.nsIFileInputStream);
        if ( 'binary' === enc )
        {
            var bstream = Cc['@mozilla.org/binaryinputstream;1'].createInstance(Ci.nsIBinaryInputStream);
            stream.init(file, -1, -1, false);
            len = stream.available( );
            bstream.setInputStream( stream );
            bstream.readByteArray( len, data = new Uint8Array( len ) );
            bstream.close( );
        }
        else
        {
            var cstream = Cc['@mozilla.org/intl/converter-input-stream;1'].createInstance(Ci.nsIConverterInputStream),
                str = {value:''}, read = 0;
            data = null;
            stream.init(file, -1, 0, 0); cstream.init(stream, enc, 0, 0);
            do { 
                // read as much as we can and put it in str.value
                read = cstream.readString(0xffffffff, str);
                if ( null === data ) data = '';
                data += str.value;
            } while (0 != read);
            cstream.close(); // this closes stream
            if ( null === data ) data = null != defval ? defval : '';
        }
        return data;
    }
    : (isNode
    ? function read_file( path, enc, defval ) {
        var data = fs.readFileSync( path, 'binary' === enc ? {} : {encoding:enc} );
        if ( !data ) return 'binary' === enc ? (null != defval ? defval : null) : (null != defval ? defval : '');
        return data;
    }
    : function read_file( path, enc, defval ) {
        var xhr = XHR( );
        
        // plain text with enc encoding format
        xhr.open('GET', path, false);  // 'false' makes the request synchronous
        if ( 'binary' === enc )
        {
            // http://stackoverflow.com/questions/9855127/setting-xmlhttprequest-responsetype-forbidden-all-of-a-sudden
            if ( isWebWorker ) xhr.responseType = 'arraybuffer';
        }
        else
        {
            // http://stackoverflow.com/questions/9855127/setting-xmlhttprequest-responsetype-forbidden-all-of-a-sudden
            if ( isWebWorker ) xhr.responseType = 'text';
            xhr.setRequestHeader('Content-Type', 'text/plain; charset='+enc+'');
            xhr.overrideMimeType('text/plain; charset='+enc+'');
        }
        xhr.send( null );
        if ( 200 === xhr.status )
            return 'binary' === enc ? xhr.response : xhr.responseText;
        else
            return 'binary' === enc ? (null != defval ? defval : null) : (null != defval ? defval : '');
    }),
    read_file_async = isXPCOM
    ? function read_file_async( path, enc, cb, defval ) {
        // https://developer.mozilla.org/en-US/Add-ons/Code_snippets/File_I_O
        NetUtil.asyncFetch(fileurl_2_nsfile( path ), function( stream, status ) {
            var data = null;
            if ( Components.isSuccessCode( status ) )
            {
                if ( 'binary' === enc )
                {
                    var bstream = Cc['@mozilla.org/binaryinputstream;1'].createInstance(Ci.nsIBinaryInputStream),
                        len = stream.available( );
                    bstream.setInputStream( stream );
                    bstream.readByteArray( len, data = new Uint8Array( len ) );
                    bstream.close( );
                }
                else
                {
                    data = NetUtil.readInputStreamToString( stream, stream.available(), {charset:enc} );
                }
            }
            else
            {
                data = 'binary' === enc ? (null != defval ? defval : null) : (null != defval ? defval : '');
            }
            if ( cb ) cb( data );
        });
        return '';
    }
    : (isNode
    ? function read_file_async( path, enc, cb, defval ) {
        if ( 'binary' === enc )
        {
            fs.readFile(path, function( err, data ){
                if ( cb ) cb( !!err ? (null != defval ? defval : null) : data );
            });
        }
        else
        {
            fs.readFile(path, {encoding:enc}, function( err, text ){
                if ( cb ) cb( !!err ? (null != defval ? defval : '') : text );
            });
        }
        return '';
    }
    : function read_file_async( path, enc, cb, defval ) {
        var xhr = XHR( );
        
        // plain text with enc encoding format
        xhr.open('GET', path, true);  // 'true' makes the request asynchronous
        if ( 'binary' === enc )
        {
            xhr.responseType = 'arraybuffer';
            xhr.onload = function( ) {
                if ( cb ) cb( 200 === xhr.status ? xhr.response : (null != defval ? defval : null) );
            };
        }
        else
        {
            xhr.responseType = 'text';
            xhr.setRequestHeader('Content-Type', 'text/plain; charset='+enc+'');
            xhr.overrideMimeType('text/plain; charset='+enc+'');
            xhr.onload = function( ) {
                if ( cb ) cb( 200 === xhr.status ? xhr.responseText : (null != defval ? defval : '') );
            };
        }
        xhr.send( null );
        return '';
    }),
    
    Importer
;

// load javascript(s)/text(s) (a)sync in node, browser, webworker, xpcom/sdk module
function load_deps( importer, scope, cache, ref, complete )
{
    var dl = ref.length, i, t, cached,
        head, load, next, loaded = new Array( dl );
    // xpcom module / nodejs, require / webworker, importScripts
    if ( isXPCOM || isNode || isWebWorker )
    {
        for (i=0; i<dl; i++)
        {
            if ( HAS.call(ref[i],'loaded') )
            {
                loaded[ i ] = ref[i].loaded;
                // hook here
                importer.trigger('import-class', [
                    //          this,     id,        classname,   path,        reference
                    importer, ref[i].id, ref[i].name, ref[i].path, loaded[ i ]
                ], ref[i].ctx).trigger('import-class-'+ref[i].id, [
                    //          this,     id,        classname,   path,        reference
                    importer, ref[i].id, ref[i].name, ref[i].path, loaded[ i ]
                ], ref[i].ctx);
            }
            else if ( HAS.call(cache,ref[i].ctx+'--'+ref[ i ].cache_id) )
            {
                loaded[ i ] = cache[ ref[i].ctx+'--'+ref[ i ].cache_id ];
            }
            else if ( 'class' !== ref[ i ].type )
            {
                loaded[ i ] = cache[ ref[i].ctx+'--'+ref[ i ].cache_id ] = read_file( ref[ i ].path, isXPCOM ? 'UTF-8' : 'utf8' );
            }
            else if ( ref[ i ].name in scope )
            {
                loaded[ i ] = scope[ ref[ i ].name ];
            }
            else
            {                
                loaded[ i ] = import_module( ref[ i ].name, ref[ i ].path, scope ) || null;
                // hook here
                importer.trigger('import-class', [
                    //          this,     id,        classname,   path,        reference
                    importer, ref[i].id, ref[i].name, ref[i].path, loaded[ i ]
                ], ref[i].ctx).trigger('import-class-'+ref[i].id, [
                    //          this,     id,        classname,   path,        reference
                    importer, ref[i].id, ref[i].name, ref[i].path, loaded[ i ]
                ], ref[i].ctx);
            }
        }
        return complete.apply( scope, loaded );
    }
    // browser, <script> tags
    else
    {
        head = $$tag('head', 0); 
        t = 0; i = 0;
        load = function load( id, ctx, type, path, next ) {
            var done, script;
            if ( 'style' === type || 'script' === type )
            {
                if ( (script = $$(id)) && type === script.tagName[LOWER]( ) ) 
                {
                    next( );
                }
                else
                {
                    read_file_async( path, 'utf8', function(data){
                        cache[ ctx+'--'+id ]  = data;
                        $$asset(type, data)[ATTR]('id', id);
                        next( );
                    });
                }
            }
            else if ( 'class' !== type )
            {
                if ( 'template' === type && (script = $$(id)) && 'script' === script.tagName[LOWER]( ) ) 
                {
                    next( );
                }
                else
                {
                    read_file_async( path, 'utf8', function(data){
                        cache[ ctx+'--'+id ]  = data;
                        if ( 'template' === type && !$$(id) )
                            $$asset('tpl', data)[ATTR]('id', id);
                        next( );
                    });
                }
            }
            else
            {
                if ( (script = $$(id)) && 'script' === script.tagName[LOWER]( ) ) 
                {
                    next( );
                }
                else
                {
                    done = 0;
                    script = $$el('script');
                    script[ATTR]('id', id); 
                    script[ATTR]('type', 'text/javascript'); 
                    script[ATTR]('language', 'javascript');
                    script.onload = script.onreadystatechange = function( ) {
                        if (!done && (!script.readyState || 'loaded' == script.readyState  || 'complete' == script.readyState))
                        {
                            done = 1; 
                            script.onload = script.onreadystatechange = null;
                        }
                        next( );
                    }
                    // load it
                    //script.src = path;
                    script[ATTR]('src', path);
                    head.appendChild( script ); 
                }
            }
        };
        next = function next( ) {
            var cached;
            if ( HAS.call(ref[i],'loaded') || (cached=HAS.call(cache,ref[ i ].ctx+'--'+ref[ i ].cache_id)) || (ref[ i ].name in scope) )
            {
                loaded[ i ] = (HAS.call(ref[i],'loaded') ? ref[i].loaded : (cached ? cache[ ref[ i ].ctx+'--'+ref[ i ].cache_id ] : scope[ ref[ i ].name ])) || null;
                
                // hook here
                importer.trigger('import-class', [
                    //          this,     id,        classname,   path,        reference
                    importer, ref[i].id, ref[i].name, ref[i].path, loaded[ i ]
                ], ref[ i ].ctx).trigger('import-class-'+ref[i].id, [
                    //          this,     id,        classname,   path,        reference
                    importer, ref[i].id, ref[i].name, ref[i].path, loaded[ i ]
                ], ref[ i ].ctx);
                
                if ( ++i >= dl ) 
                {
                    complete.apply( scope, loaded );
                }
                else if ( HAS.call(ref[i],'loaded') || (cached=HAS.call(cache,ref[ i ].ctx+'--'+ref[ i ].cache_id)) || (ref[ i ].name in scope) ) 
                {
                    loaded[ i ] = (HAS.call(ref[i],'loaded') ? ref[i].loaded : (cached ? cache[ ref[ i ].ctx+'--'+ref[ i ].cache_id ] : scope[ ref[ i ].name ])) || null;
                    next( ); 
                }
                else
                {                    
                    scope[ ref[ i ].name ] = null;
                    load( ref[ i ].cache_id, ref[ i ].ctx, ref[ i ].type, ref[ i ].path, next );
                }
            }
            else if ( ++t < 4 ) 
            { 
                setTimeout( next, 20 ); 
            }
            else 
            { 
                t = 0; 
                scope[ ref[ i ].name ] = null;
                // hook here
                importer.trigger('import-class', [
                    //          this,     id,        classname,   path,        reference
                    importer, ref[i].id, ref[i].name, ref[i].path, null
                ], ref[ i ].ctx).trigger('import-class-'+ref[i].id, [
                    //          this,     id,        classname,   path,        reference
                    importer, ref[i].id, ref[i].name, ref[i].path, null
                ], ref[ i ].ctx);
                i++; next( ); 
            }
        };
        while ( i < dl && (HAS.call(ref[i],'loaded') || (cached=HAS.call(cache,ref[ i ].ctx+'--'+ref[ i ].cache_id)) || (ref[ i ].name in scope)) ) 
        {
            loaded[ i ] = (HAS.call(ref[i],'loaded') ? ref[i].loaded : (cached ? cache[ ref[ i ].ctx+'--'+ref[ i ].cache_id ] : scope[ ref[ i ].name ])) || null;
            i++;
        }
        if ( i < dl ) load( ref[ i ].cache_id, ref[ i ].ctx, ref[ i ].type, ref[ i ].path, next );
        else complete.apply( scope, loaded );
    }
}

function is_callable( o )
{
    return 'function' === typeof o;
}
function is_string( o )
{
    return o instanceof String || '[object String]' === toString.call(o);
}
function is_array( o )
{
    return o instanceof Array || '[object Array]' === toString.call(o);
}
function is_obj( o )
{
    return o instanceof Object || '[object Object]' === toString.call(o);
}
function empty( o )
{ 
    if ( !o ) return true;
    var to_string = toString.call(o);
    return (o instanceof Array || o instanceof String || '[object Array]' === to_string || '[object String]' === to_string) && !o.length;
}
function array( o )
{
    return is_array( o ) ? o : [o];
}
function merge( o1, o2 )
{
    var k = KEYS(o2), i, l;
    for (i=0,l=k.length; i<l; i++) o1[ k[i] ] = o2[ k[i] ];
    return o1;
}
function attributes( atts, node )
{
    if ( !atts ) return node ? node : '';
    var k = KEYS(atts), i, l;
    if ( node )
    {
        for (i=0,l=k.length; i<l; i++) node[ATTR](k[i], atts[ k[i] ]);
        return node;
    }
    else
    {
        var out = [];
        for (i=0,l=k.length; i<l; i++) out.push( k[i]+'="'+atts[ k[i] ]+'"' );
        return out.join(' ');
    }
}
function $$( id )
{
    return document.getElementById( id );
}
function $$el( element )
{
    return document.createElement( element );
}
function $$tag( tag, index )
{
    var els = document.getElementsByTagName( tag );
    return arguments.length > 1 ? (index < 0 ? els[els.length+index] : els[index]) : els;
}

// http://davidwalsh.name/add-rules-stylesheets
function $$css( style, css ) 
{
    var css_type = typeof css, n, index, declaration, selector, rules;
    
    // css rules object
    if ( 'object' === css_type )
    {
        index = 0;
        for (n in css)
        {
            if ( !HAS.call(css,n) ) continue;
            declaration = css[ n ];
            selector = declaration.selector;
            rules = [].concat(declaration.rules).join('; ');
            if ( 'insertRule' in style.sheet ) 
            {
                style.sheet.insertRule( selector + '{' + rules + '}', index );
                declaration.css = style.sheet.cssRules[ index ];
            }
            else if ( 'addRule' in style.sheet ) 
            {
                style.sheet.addRule( selector, rules, index );
                declaration.css = style.sheet.rules[ index ];
            }
            index++;
        }
    }
    // css literal string
    else if ( 'string' === css_type )
    {
        if ( style.styleSheet ) style.styleSheet.cssText = (style.styleSheet.cssText||'') + css;
        else style.appendChild( document.createTextNode( css ) );
    }
    return css;
}

function $$asset( type, src, unique, atts )
{
    var asset = null, link = null, i, links;
    if ( 'html' === type )
    {
        var wrapper = $$el('div');
        wrapper.innerHTML += src;
        while(wrapper.firstChild)
        {
            if ( "SCRIPT" === asset.firstChild.nodeName ||
                "STYLE" === asset.firstChild.nodeName ||
                "LINK" === asset.firstChild.nodeName ) asset = wrapper.firstChild;
            document.head.appendChild( wrapper.firstChild );
        }
        return asset;
    }
    switch( type )
    {
        // external tpl
        case 'tpl-link':
        // literal tpl
        case 'tpl':
            // Create the <script> tag
            asset = $$el('script');
            if ( atts )
            {
                attributes( atts, asset );
            }
            else
            {
                asset[ATTR]('type', 'text/x-tpl');
            }
            // WebKit hack :(
            asset.appendChild( document.createTextNode(src) );
            // Add the <script> element to the page
            document.head.appendChild( asset );
            break;
            
        // external script
        case 'script-link':
            if ( unique )
            {
                // external script, only if not exists
                links = $$tag('script');
                for (i=links.length-1; i>=0; i--) 
                {
                    if ( links[i].src && src === links[i].src ) 
                    {
                        // found existing link
                        link = links[ i ];
                        break;
                    }
                }
            }
            if ( link )
            {
                // return it, instead
                asset = link;
            }
            else
            {
                // Create the <script> tag
                asset = $$el('script');
                if ( atts )
                {
                    attributes( atts, asset );
                }
                else
                {
                    asset[ATTR]('type', 'text/javascript');
                    asset[ATTR]('language', 'javascript');
                }
                asset[ATTR]('src', src);
                // Add the <script> element to the page
                document.head.appendChild( asset );
            }
            break;
        
        // literal script
        case 'script':
            // Create the <script> tag
            asset = $$el('script');
            if ( atts )
            {
                attributes( atts, asset );
            }
            else
            {
                asset[ATTR]('type', 'text/javascript');
                asset[ATTR]('language', 'javascript');
            }
            // WebKit hack :(
            asset.appendChild( document.createTextNode(src) );
            // Add the <script> element to the page
            document.head.appendChild( asset );
            break;
            
        // external stylesheet
        case 'style-link':
            if ( unique )
            {
                // external stylesheet, only if not exists
                links = $$tag('link');
                for (i=links.length-1; i>=0; i--) 
                {
                    if ( src === links[i].href ) 
                    {
                        // found existing link
                        link = links[ i ];
                        break;
                    }
                }
            }
            if ( link )
            {
                // return it, instead
                asset = link;
            }
            else
            {
                // Create the <link> tag
                asset = $$el('link');
                asset[ATTR]('rel', 'stylesheet');
                if ( atts )
                {
                    attributes( atts, asset );
                }
                else
                {
                    // Add a media (and/or media query) here if you'd like!
                    asset[ATTR]('type', 'text/css');
                    asset[ATTR]('media', 'all');
                }
                asset[ATTR]('href', src);
                // Add the <style> element to the page
                document.head.appendChild( asset );
            }
            break;
        
        // literal stylesheet
        case 'style':
        default:
            // Create the <style> tag
            asset = $$el('style');
            if ( atts )
            {
                attributes( atts, asset );
            }
            else
            {
                // Add a media (and/or media query) here if you'd like!
                asset[ATTR]('type', 'text/css');
                asset[ATTR]('media', 'all');
            }
            // WebKit hack :(
            asset.appendChild( document.createTextNode('') );
            // Add the <style> element to the page
            document.head.appendChild( asset );
            if ( src ) $$css( asset, src );
            break;
    }
    return asset;
}

function dispose_asset( asset ) 
{
    if ( asset ) 
        document.head.removeChild( asset );
}

function remove_protocol( p )
{
    return p.split( PROTOCOL ).join( PROTOCOL_RE );
}

function add_protocol( p )
{
    return p.split( PROTOCOL_RE ).join( PROTOCOL );
}

function path_join( )
{
    var p, args = arguments, full = '.';
    if ( !args.length ) return full;
    if ( isXPCOM )
    {
        full = OS.Path.join.apply( OS.Path, args );
    }
    else if ( isNode )
    {
        p = require('path');
        full = p.join.apply( p, args );
    }
    /*else if ( isBrowser && !isWebWorker )
    {
        if ( !path_join.link ) path_join.link = document.createElement('a');
        path_join.link.href = slice.call( args ).join( '/' );
    }*/
    else
    {
        full = join_path.apply( null, args );
    }
    return full;
}
// adapted from https://github.com/JosephMoniz/php-path
function join_path( ) 
{
    var args = arguments, argslen = args.length,
        ds = DS, path, plen,
        isAbsolute, trailingSlash, peices, new_path, up, i, last;
    
    if ( !argslen )  return '.';
    
    // take care of protocol, if exists
    path = map.call( args, remove_protocol ).join( ds );
    plen = path.length;
    
    if ( !plen ) return '.';
    
    isAbsolute    = path.charAt( 0 );
    trailingSlash = path.charAt( plen - 1 );

    peices = path.split( DS_RE ).filter( Boolean );
    
    new_path = [ ];
    up = 0;
    i = peices.length-1;
    while ( i >= 0 )
    {
        last = peices[ i ];
        if ( '..' === last ) 
        {
            up++;
        } 
        else if ( '.' !== last )
        {
            if ( up )  up--;
            else  new_path.push( peices[ i ] );
        }
        i--;
    }
    
    path = new_path.reverse( ).join( ds );
    
    if ( !path && !isAbsolute ) 
    {
        path = '.';
    }

    if ( path && trailingSlash === ds ) 
    {
        path += ds;
    }

    return (isAbsolute === ds ? ds : '') + add_protocol( path );
}

function join_path_url( )
{
    var _DS = DS, ret;
    DS = '/';
    ret = join_path.apply( null, arguments );
    DS = _DS;
    return ret;
}

Importer = function Importer( base, base_url ) {
    var self = this;
    if ( !(self instanceof Importer) ) return new Importer( base, base_url );
    self.base = '';
    self.base_url = '';
    self.base_path( base, base_url );
    self._classmap = { '__global__':{} };
    self._classes = { '__global__':{} };
    self._assets = { '__global__':{} };
    self._hooks = { '__global__':{} };
    self._cache = { };
};

Importer.VERSION = '1.1.2';
Importer.BASE = './';
Importer.path_join = path_join;
Importer.join_path = join_path;
Importer.join_path_url = join_path_url;
Importer.attributes = attributes;

Importer[PROTO] = {
    constructor: Importer
    
    ,base: null
    ,base_url: null
    ,_classmap: null
    ,_classes: null
    ,_assets: null
    ,_hooks: null
    ,_cache: null
    
    ,dispose: function( ) {
        var self = this;
        self._classmap = null;
        self._classes = null;
        self._assets = null;
        self._hooks = null;
        self._cache = null;
        self.base = null;
        self.base_url = null;
        return self;
    }
    
    ,on: function( hook, handler, ctx, once ) {
        var self = this;
        if ( null == ctx ) ctx = '__global__';
        if ( ctx && !empty(hook) && is_callable(handler) )
        {
            if ( !HAS.call(self._hooks,ctx) ) self._hooks[ctx] = {};
            if ( !HAS.call(self._hooks[ctx],hook) ) self._hooks[ctx][hook] = [];
            self._hooks[ctx][hook].push( [handler, true === once, 0] );
        }
        return self;
    }
    
    ,one: function( hook, handler, ctx ) {
        return this.on( hook, handler, ctx, true );
    }
    
    ,off: function( hook, handler, ctx ) {
        var self = this, hooks, i;
        if ( null == ctx ) ctx = '__global__';
        if ( ctx && HAS.call(self._hooks,ctx) && !empty(hook) && !empty(self._hooks[ctx][hook]) )
        {
            if ( true === handler )
            {
                delete(self._hooks[ctx][hook]);
            }
            else if ( handler )
            {
                hooks = self._hooks[ctx][hook];
                for(i=hooks.length-1; i>=0; i--)
                {
                    if ( handler === hooks[i][0] )
                        hooks.splice( i, 1 );
                }
            }
        }
        return self;
    }
    
    ,trigger: function( hook, args, ctx ) {
        var self = this, hooks, i, h, ret;
        if ( null == ctx ) ctx = '__global__';
        if ( ctx && HAS.call(self._hooks,ctx) && !empty(hook) && !empty(self._hooks[ctx][hook]) )
        {
            hooks = self._hooks[ctx][hook];
            args = args || [];
            for(i=0; i<hooks.length; i++)
            {
                h = hooks[i];
                if ( h[1] && h[2] ) continue;
                h[2] = 1; // called;
                ret = h[0].apply( null, args );
                if ( false === ret ) break;
            }
            // remove called oneoffs
            for(i=hooks.length-1; i>=0; i--)
            {
                if ( hooks[i][1] && hooks[i][2] )
                    hooks.splice( i, 1 );
            }
        }
        return self;
    }
    
    ,base_path: function( base, base_url ) {
        var self = this;
        
        if ( is_string( base ) && base.length ) self.base = base;
        else if ( false === base ) self.base = '';
        
        if ( is_string( base_url ) && base_url.length ) self.base_url = base_url;
        else if ( false === base_url ) self.base_url = '';
        
        return self;
    }
    
    ,get_path: function( path, base, url ) {
        var self = this;
        
        if ( empty(path) ) return base||'';
        
        else if ( !empty(base) && 
            (startsWith(path, './') || 
                startsWith(path, '../') || 
                startsWith(path, '.\\') || 
                startsWith(path, '..\\'))
        )
            return true === url ? join_path_url( base, path ) : join_path( base, path );
        
        else return path;
    }
    
    ,path: function( asset ) {
        var self = this;
        return self.get_path( asset||'', isNode ? self.base : self.base_url );
    }
    
    ,path_url: function( asset ) {
        var self = this;
        return self.get_path( asset||'', self.base_url, true );
    }
    
    ,register: function( what, defs, ctx ) {
        var self = this, classes = self._classes, classmap = self._classmap, assets = self._assets,
            i, l, classname, def, id, path, deps, props, type, asset;
        if ( null == ctx ) ctx = '__global__';
        what = String(what).toLowerCase();
        if ( ctx && is_array( defs ) && defs.length )
        {
            if ( !is_array( defs[0] ) ) defs = [defs]; // make array of arrays
            
            if ( 'classes' === what )
            {
                for (i=0,l=defs.length; i<l; i++)
                {
                    def = defs[ i ];
                    /* 0:class, 1:id, 2:path, 3:deps */
                    classname = def[0]; id = def[1]; path = def[2]; deps = def[3] ? def[3] : [];
                    if ( !empty( classname ) && !empty( id ) && !empty( path ) ) 
                    {
                        if ( !HAS.call(classes,ctx) ) classes[ctx] = {};
                        if ( !HAS.call(classmap,ctx) ) classmap[ctx] = {};
                        path = self.path( path );
                        classes[ctx][ id ] = [
                            /* 0:class, 1:id, 2:path, 3:deps, 4:loaded */
                            classname, 
                            id, 
                            path, 
                            array(deps), 
                            false
                        ];
                        classmap[ctx][ classname ] = [path, id];
                    }
                }
            }
            else if ( 'assets' === what )
            {
                for (i=0,l=defs.length; i<l; i++)
                {
                    def = defs[ i ];
                    /* 0:type, 1:id, 2:asset, 3:deps, 4:props */
                    type = def[0]; id = def[1]; asset = def[2]; deps = def[3] ? def[3] : [];
                    props = def[4] ? def[4] : {};
                    if ( !empty( type ) && !empty( id ) && !empty( asset ) ) 
                    {
                        type = type[LOWER]( );
                        if ( 'scripts-composite' === type || 'styles-composite' === type || 'scripts-alt' === type || 'styles-alt' === type )
                        {
                            asset = array(asset);
                        }
                        // maybe literal asset
                        else if ( is_string( asset ) )
                        {
                            asset = self.path_url( asset );
                        }
                        if ( !HAS.call(assets,ctx) ) assets[ctx] = {};
                        assets[ctx][ id ] = [
                            /* 0:type, 1:id, 2:asset, 3:deps, 4:props, 5:enqueued, 6:loaded */
                            type, id, asset, array(deps), props, false, false
                        ];
                    }
                }
            }
        }
        return self;
    }
    
    ,import_class: function( id, complete, ctx ) {
        var self = this, queue, classes = self._classes,
            cache_id = 'class-'+id, cache = self._cache, exists,
            needs_deps, numdeps, i, dep, deps, to_load, ctx2, ctx3;
        
        if ( null == ctx ) ctx = '__global__';
        if ( HAS.call(cache,ctx+'--'+cache_id) ) 
        {
            if ( is_callable(complete) )
                complete.call( self, cache[ctx+'--'+cache_id] );
        }
        else
        {
            exists = false;
            to_load = [ ];
            queue = [ id ];
            while ( queue.length )
            {
                id = queue[ 0 ];
                ctx2 = HAS.call(classes,ctx) && HAS.call(classes[ctx],id) ? ctx : '__global__';
                if ( HAS.call(classes[ctx2],id) && !classes[ctx2][id][4] )
                {
                    exists = true;
                    if ( !HAS.call(Scope, classes[ctx2][id][0] ) )
                    {
                        deps = classes[ctx2][id][3];
                        if ( !empty(deps) )
                        {
                            needs_deps = false;
                            numdeps = deps.length;
                            for (i=numdeps-1; i>=0; i--)
                            {
                                dep = deps[i];
                                ctx3 = HAS.call(classes,ctx) && HAS.call(classes[ctx],dep) ? ctx : '__global__';
                                if ( HAS.call(classes[ctx3],dep) && !classes[ctx3][dep][4] )
                                {
                                    needs_deps = true;
                                    queue.unshift( dep );
                                }
                            }
                            if ( needs_deps ) continue;
                            else queue.shift( );
                        }
                        else
                        {
                            queue.shift( );
                        }
                        classes[ctx2][id][4] = true; // loaded
                        to_load.push({
                            id: id,
                            type: 'class',
                            cache_id: 'class-' + id,
                            name: classes[ctx2][id][0],
                            path: classes[ctx2][id][2],
                            ctx: ctx
                        });
                    }
                    else
                    {
                        queue.shift( );
                        classes[ctx2][id][4] = true; // loaded
                        // trigger events, even if this class is already loaded somewhere else, but not this instance
                        to_load.push({
                            id: id,
                            type: 'class',
                            cache_id: 'class-' + id,
                            name: classes[ctx2][id][0],
                            path: classes[ctx2][id][2],
                            ctx: ctx,
                            loaded: Scope[ classes[ctx2][id][0] ]
                        });
                    }
                }
                else if ( HAS.call(classes[ctx2],id) )
                {
                    exists = true;
                    queue.shift( );
                }
                else
                {
                    queue.shift( );
                }
            }
            if ( exists && to_load.length )
            {
                load_deps(self, Scope, cache, to_load, function( ){
                    var i, l, args = arguments;
                    for (i=0,l=args.length; i<l; i++) cache[ ctx+'--'+to_load[ i ].cache_id ] = args[ i ];
                    if ( is_callable(complete) ) complete.call( self, cache[ctx+'--'+cache_id] );
                });
            }
            else if ( is_callable(complete) )
            {
                complete.call( self, null );
            }
        }
        return self;
    }
    
    ,import_asset: function( id, ctx ) {
        var self = this, queue = [ id ], assets = self._assets, deps, props, atts,
            needs_deps, numdeps, i, dep, out = [ ], asset_def, type, asset, asset_id,
            is_style, is_script, is_tpl, is_composite, is_alt, is_inlined,
            pi, pl, document_asset, ret, ctx2, ctx3;
        if ( null == ctx ) ctx = '__global__';
        while ( queue.length )
        {
            id = queue[ 0 ];
            ctx2 = HAS.call(assets,ctx) && HAS.call(assets[ctx],id) ? ctx : '__global__';
            if ( HAS.call(assets[ctx2],id) && assets[ctx2][id][5] && !assets[ctx2][id][6] ) // enqueued but not loaded yet
            {
                asset_def = assets[ctx2][id];
                type = asset_def[0]; 
                id = asset_def[1];  
                asset = asset_def[2]; 
                deps = asset_def[3];
                props = asset_def[4];
                if ( deps && deps.length )
                {
                    needs_deps = false;
                    numdeps = deps.length;
                    for (i=numdeps-1; i>=0; i--)
                    {
                        dep = deps[i];
                        ctx3 = HAS.call(assets,ctx) && HAS.call(assets[ctx],dep) ? ctx : '__global__';
                        if ( HAS.call(assets[ctx3],dep) && !assets[ctx3][dep][6] )
                        {
                            assets[ctx3][dep][5] = true; // enqueued
                            needs_deps = true;
                            queue.unshift( dep );
                        }
                    }
                    if ( needs_deps ) continue;
                    else queue.shift( );
                }
                
                asset_def[6] = true; // loaded
                
                // hook here
                ret = {};
                self.trigger('import-asset', [
                    // importer, id,      type,   asset
                    self, id, type, asset, ret
                ], ctx).trigger('import-asset-'+id, [
                    // importer, id,      type,   asset
                    self, id, type, asset, ret
                ], ctx);
                
                if ( null != ret['return'] )
                {
                    out.push( ret['return'] );
                }
                else
                {
                    is_style = 'styles' === type || 'styles-composite' === type;
                    is_script = 'scripts' === type || 'scripts-composite' === type;
                    is_tpl = 'templates' === type;
                    is_composite = 'scripts-composite' === type || 'styles-composite' === type;
                    is_alt = 'scripts-alt' === type || 'styles-alt' === type;
                    is_inlined = !is_composite && !is_alt && is_array( asset );
                    asset_id = id.replace(ID_RE, '_');
                    if ( is_style )
                    {
                        atts = merge({
                            'type'  : 'text/css',
                            'media' : 'all'
                        }, props);
                        
                        if ( isBrowser )
                        {
                            if ( is_inlined )
                            {
                                out.push(
                                document_asset = $$('importer-inline-style-'+asset_id) || $$asset( 'style', asset[0], false, atts )
                                );
                                document_asset[ATTR]('id', 'importer-inline-style-'+asset_id);
                            }
                            else if ( is_composite )
                            {
                                for (pi=0,pl=asset.length; pi<pl; pi++)
                                {
                                    if ( is_array(asset[pi]) )
                                    {
                                        out.push(
                                        document_asset = $$('importer-inline-style-'+asset_id+'-part-'+pi) || $$asset( 'style', asset[pi][0], false, atts )
                                        );
                                        document_asset[ATTR]('id', 'importer-inline-style-'+asset_id+'-part-'+pi);
                                    }
                                    else
                                    {
                                        out.push(
                                        document_asset = $$('importer-style-'+asset_id+'-part-'+pi) || $$asset( 'style-link', self.path_url(asset[pi]), true, atts )
                                        );
                                        document_asset[ATTR]('id', 'importer-style-'+asset_id+'-part-'+pi);
                                    }
                                }
                            }
                            else if ( is_alt )
                            {
                                out.push(
                                document_asset = $$('importer-style-'+asset_id) || $$asset( 'html', asset[0] )
                                );
                                document_asset[ATTR]('id', 'importer-style-'+asset_id);
                            }
                            else
                            {
                                out.push(
                                document_asset = $$('importer-style-'+asset_id) || $$asset( 'style-link', self.path_url(asset), true, atts )
                                );
                                document_asset[ATTR]('id', 'importer-style-'+asset_id);
                            }
                        }
                        else
                        {
                            atts = attributes( atts );
                            if ( is_inlined )
                            {
                                out.push(
                                '<style id="importer-inline-style-'+asset_id+'" '+atts+'>'+asset[0]+'</style>'
                                );
                            }
                            else if ( is_composite )
                            {
                                for (pi=0,pl=asset.length; pi<pl; pi++)
                                {
                                    if ( is_array(asset[pi]) )
                                    {
                                        out.push(
                                        '<style id="importer-inline-style-'+asset_id+'-part-'+pi+'" '+atts+'>'+asset[pi][0]+'</style>'
                                        );
                                    }
                                    else
                                    {
                                        out.push(
                                        '<link id="importer-style-'+asset_id+'-part-'+pi+'" href="'+self.path_url(asset[pi])+'" rel="stylesheet" '+atts+' />'
                                        );
                                    }
                                }
                            }
                            else if ( is_alt )
                            {
                                out.push(
                                asset[0]
                                );
                            }
                            else
                            {
                                out.push(
                                '<link id="importer-style-'+asset_id+'" href="'+self.path_url(asset)+'" rel="stylesheet" '+atts+' />'
                                );
                            }
                        }
                    }
                    else if ( is_script )
                    {
                        atts = merge({
                            'type'  : 'text/javascript'
                        }, props);
                        
                        if ( isBrowser )
                        {
                            if ( is_inlined )
                            {
                                out.push(
                                document_asset = $$('importer-inline-script-'+asset_id) || $$asset( 'script', '/*<![CDATA[*/ '+asset[0]+' /*]]>*/', false, atts )
                                );
                                document_asset[ATTR]('id', 'importer-inline-script-'+asset_id);
                            }
                            else if ( is_composite )
                            {
                                for (pi=0,pl=asset.length; pi<pl; pi++)
                                {
                                    if ( is_array(asset[pi]) )
                                    {
                                        out.push(
                                        document_asset = $$('importer-inline-script-'+asset_id+'-part-'+pi) || $$asset( 'script', '/*<![CDATA[*/ '+asset[pi][0]+' /*]]>*/', false, atts )
                                        );
                                        document_asset[ATTR]('id', 'importer-inline-script-'+asset_id+'-part-'+pi);
                                    }
                                    else
                                    {
                                        out.push(
                                        document_asset = $$('importer-script-'+asset_id+'-part-'+pi) || $$asset( 'script-link', self.path_url(asset[pi]), true, atts )
                                        );
                                        document_asset[ATTR]('id', 'importer-script-'+asset_id+'-part-'+pi);
                                    }
                                }
                            }
                            else if ( is_alt )
                            {
                                out.push(
                                document_asset = $$('importer-script-'+asset_id) || $$asset( 'html', asset[0] )
                                );
                                document_asset[ATTR]('id', 'importer-script-'+asset_id);
                            }
                            else
                            {
                                out.push(
                                document_asset = $$('importer-script-'+asset_id) || $$asset( 'script-link', self.path_url(asset), true, atts )
                                );
                                document_asset[ATTR]('id', 'importer-script-'+asset_id);
                            }
                        }
                        else
                        {
                            atts = attributes( atts );
                            if ( is_inlined )
                            {
                                out.push(
                                '<script id="importer-inline-script-'+asset_id+'" '+atts+'>/*<![CDATA[*/ '+asset[0]+' /*]]>*/</script>'
                                );
                            }
                            else if ( is_composite )
                            {
                                for (pi=0,pl=asset.length; pi<pl; pi++)
                                {
                                    if ( is_array(asset[pi]) )
                                    {
                                        out.push(
                                        '<script id="importer-inline-script-'+asset_id+'-part-'+pi+'" '+atts+'>/*<![CDATA[*/ '+asset[pi][0]+' /*]]>*/</script>'
                                        );
                                    }
                                    else
                                    {
                                        out.push(
                                        '<script id="importer-script-'+asset_id+'-part-'+pi+'" src="'+self.path_url(asset[pi])+'" '+atts+'></script>'
                                        );
                                    }
                                }
                            }
                            else if ( is_alt )
                            {
                                out.push(
                                asset[0]
                                );
                            }
                            else
                            {
                                out.push(
                                '<script id="importer-script-'+asset_id+'" src="'+self.path_url(asset)+'" '+atts+'></script>'
                                );
                            }
                        }
                    }
                    else if ( is_tpl )
                    {
                        atts = merge({
                            'type'  : 'text/x-tpl'
                        }, props);
                        
                        if ( isBrowser )
                        {
                            out.push( document_asset = is_inlined
                                ? $$('importer-inline-tpl-'+asset_id) || $$asset( 'tpl', asset[0], false, atts )
                                : $$('importer-inline-tpl-'+asset_id) || $$asset( 'tpl', self.get(asset), false, atts ) );
                            document_asset[ATTR]('id', is_inlined ? 'importer-inline-tpl-'+asset_id : 'importer-inline-tpl-'+asset_id);
                        }
                        else
                        {
                            atts = attributes( atts );
                            out.push( is_inlined
                                    ? ('<script id="importer-inline-tpl-'+asset_id+'" '+atts+'>'+asset[0]+'</script>')
                                    : ('<script id="importer-inline-tpl-'+asset_id+'" '+atts+'>'+self.get(asset)+'</script>')
                            );
                        }
                    }
                    else
                    {
                        out.push( is_inlined ? asset[0] : self.get(asset) );
                    }
                }
            }
            else
            {
                queue.shift( );
            }
        }
        return out;
    }
    
    ,assets: function( type, ctx ) {
        var self = this, out, assets = self._assets, next,
            id, asset_def, i, l, to_load = [ ], type_composite, type_alt;
        if ( !arguments.length ) {type = 'scripts'; ctx='__global__';}
        if ( null == ctx ) ctx = '__global__';
        if ( !ctx || !HAS.call(assets,ctx) ) return '';
        type = type[LOWER]( );
        type_composite = type + '-composite';
        type_alt = type + '-alt';
        for (id in assets[ctx])
        {
            if ( !HAS.call(assets[ctx],id) ) continue;
            asset_def = assets[ctx][id];
            if ( (type === asset_def[0] || type_composite === asset_def[0] || type_alt === asset_def[0]) && asset_def[5] && !asset_def[6] )
            {
                to_load.push( asset_def[1] );
            }
        }
        if ( isBrowser )
        {
            for (i=0,l=to_load.length; i<l; i++)
                self.import_asset( to_load[i], ctx );
            out = '';
        }
        else //if ( isXPCOM || isNode || isWebWorker )
        {
            out = [ ];
            for (i=0,l=to_load.length; i<l; i++)
                out = out.concat( self.import_asset( to_load[i], ctx ) );
            out = out.join("\n");
        }
        return out;
    }
    
    ,enqueue: function( type, id, asset_def, ctx ) {
        var self = this, assets = self._assets, ctx2, asset = null, deps = null, props = null;
        if ( is_array(asset_def) )
        {
            asset = asset_def[0]||null;
            deps = asset_def[1]||null;
            props = asset_def[2]||null;
        }
        else
        {
            ctx = asset_def;
        }
        if ( null == ctx ) ctx = '__global__';
        if ( ctx && !empty(type) && !empty(id) )
        {
            ctx2 = HAS.call(assets,ctx) && HAS.call(assets[ctx],id) ? ctx : '__global__';
            if ( HAS.call(assets,ctx2) && HAS.call(assets[ctx2],id) ) 
            {
                assets[ctx2][id][5] = true; // enqueued
                // hook here
                self.trigger('enqueue-asset', [
                    // importer, id,      type,   asset
                    self, id, type, assets[ctx2][id][2]
                ], ctx).trigger('enqueue-asset-'+id, [
                    // importer, id,      type,   asset
                    self, id, type, assets[ctx2][id][2]
                ], ctx);
            }
            else if ( !empty(asset) ) 
            {
                self.register('assets', [type, id, asset, deps, props], ctx);
                assets[ctx][id][5] = true; // enqueued
                // hook here
                self.trigger('enqueue-asset', [
                    // importer, id,      type,   asset
                    self, id, type, assets[ctx][id][2]
                ], ctx).trigger('enqueue-asset-'+id, [
                    // importer, id,      type,   asset
                    self, id, type, assets[ctx][id][2]
                ], ctx);
            }
        }
        return self;
    }
    
    ,get: function( path, opts, complete ) {
        var self = this, encoding, file, default_value;
        opts = opts || { };
        default_value = HAS.call(opts,'default') ? opts['default'] : '';
        encoding = opts.encoding || (isXPCOM ? 'UTF-8' : 'utf8');
        if ( !empty(opts.binary) ) encoding = 'binary';
        complete = complete || opts.complete || (is_callable( opts ) && opts);
        if ( isBrowser )
        {
            file = self.path( path );
            return read_file_async(file, encoding, function( data ){
                if ( is_callable( complete ) ) complete( data );
            }, default_value)
        }
        else
        {
            file = self.path( path );
            return is_callable( complete )
            ? read_file_async( file, encoding, complete, default_value )
            : read_file( file, encoding, default_value );
        }
    }
    
    ,load: function( classname, class_def, complete, ctx ) {
        var self = this, argslen = arguments.length, l, c, i, loader, ctx2, path = null, deps = null;
        if ( is_array(classname) )
        {
            if ( is_callable(class_def) )
            {
                ctx = complete;
                complete = class_def;
            }
            else
            {
                ctx = class_def;
            }
            if ( null == ctx ) ctx = '__global__';
            l = classname.length; c = new Array( l ); i = 0;
            loader = function loader( loaded ) {
                if ( arguments.length )
                {
                    c[ i ] = loaded || null;
                    i++;
                }
                if ( i < l ) self.import_class( classname[i],  loader, ctx );
                else if ( is_callable(complete) )
                {
                    setTimeout(function( ){
                        complete.apply( self, c );
                    }, 10);
                }
            };
            loader( );
        }
        else
        {
            if ( is_callable(class_def) ) 
            {
                ctx = complete;
                complete = class_def;
            }
            if ( is_array(class_def) ) 
            {
                path = class_def[0]||null;
                deps = class_def[1]||null;
            }
            else
            {
                ctx = class_def;
            }
            if ( null == ctx ) ctx = '__global__';
            if ( (!HAS.call(self._classes,ctx) || !HAS.call(self._classes[ctx],classname)) && !HAS.call(self._classes['__global__'],classname) && !empty(path) )
                self.register('classes', [classname, classname, self.path(path), deps], ctx);
            ctx2 = HAS.call(self._classes,ctx) && HAS.call(self._classes[ctx],classname) ? ctx : '__global__';
            if ( HAS.call(self._classes[ctx2],classname) && !self._classes[ctx2][classname][4] )
                self.import_class( classname, complete, ctx2 );
            else if ( is_callable(complete) )
                complete.call( self, self._cache[ctx2+'--class-'+classname]||null );
        }
        return self;
    }
}

Importer.BASE = isXPCOM
    ? './'
    : (isNode
    ? __dirname
    : (isWebWorker
    ? this.location.href.split('/').slice(0,-1).join('/')
    : ($$tag('script', -1).src||'./').split('/').slice(0,-1).join('/') // absolute uri
));

// export it
return Importer;
});
