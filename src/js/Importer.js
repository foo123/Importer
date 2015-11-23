/**
*  Importer
*  a simple loader manager for classes and assets with dependencies for PHP, Python, Node/JS
*
*  @version 0.3.1
*  https://github.com/foo123/Importer
**/
!function( root, name, factory ) {
"use strict";
var m;
if ( ('undefined'!==typeof Components)&&('object'===typeof Components.classes)&&('object'===typeof Components.classesByID)&&Components.utils&&('function'===typeof Components.utils['import']) ) /* XPCOM */
    (root.EXPORTED_SYMBOLS = [ name ]) && (root[ name ] = factory.call( root ));
else if ( ('object'===typeof module)&&module.exports ) /* CommonJS */
    module.exports = factory.call( root );
else if ( ('function'===typeof(define))&&define.amd&&('function'===typeof(require))&&('function'===typeof(require.specified))&&require.specified(name) ) /* AMD */
    define(name,['require','exports','module'],function( ){return factory.call( root );});
else if ( !(name in root) ) /* Browser/WebWorker/.. */
    (root[ name ] = (m=factory.call( root )))&&('function'===typeof(define))&&define.amd&&define(function( ){return m;} );
}(  /* current root */          this, 
    /* module name */           "Importer",
    /* module factory */        function( undef ) {
"use strict";

var PROTO = 'prototype', HAS = 'hasOwnProperty', ATTR = 'setAttribute', LOWER = 'toLowerCase',
    toString = Object[PROTO].toString, map = Array[PROTO].map,
    NOP = function( ){ },
    
    startsWith = String[PROTO].startsWith 
            ? function( s, pre, pos ){return s.startsWith(pre, pos||0);} 
            : function( s, pre, pos ){pos=pos||0; return pre === s.substr(pos, pre.length+pos);},
    
    isXPCOM = ("undefined" !== typeof Components) && ("object" === typeof Components.classes) && ("object" === typeof Components.classesByID) && Components.utils && ("function" === typeof Components.utils['import']),
    isNode = !isXPCOM && ("undefined" !== typeof global) && ("[object global]" === toString.call(global)),
    isWebWorker = !isXPCOM && !isNode && ('undefined' !== typeof WorkerGlobalScope) && ("function" === typeof importScripts) && (navigator instanceof WorkerNavigator),
    isBrowser = !iisXPCOM && !isNode && !isWebWorker && ("undefined" !== typeof navigator), 
    
    Scope = isXPCOM ? this : (isNode ? global : (isWebWorker ? this : window)),
    
    Cu = isXPCOM ? Components.utils : {},
    Cc = isXPCOM ? Components.classes : {},
    Ci = isXPCOM ? Components.interfaces : {},
    import_ = isXPCOM ? Cu['import'] : (isNode ? require : NOP),
    fs = isNode ? import_('fs') : {},
    import_module = isXPCOM
    ? function import_module( name, path, scope ) {
        import_( path, scope );
        return scope[ name ];
    }
    : (isNode
    ? function import_module( name, path, scope ) {
        return import_( path );
    }
    : (isWebWorker
    ? function import_module( name, path, scope ) {
        import_( path );
        return scope[ name ];
    }
    : NOP)),
    XHR = function( ) {
    return window.XMLHttpRequest
        // code for IE7+, Firefox, Chrome, Opera, Safari
        ? new XMLHttpRequest( )
        // code for IE6, IE5
        : new ActiveXObject("Microsoft.XMLHTTP") // or ActiveXObject("Msxml2.XMLHTTP"); ??
    ;
    },
    
    DS_RE = /\/|\\/g, PROTOCOL = '://', PROTOCOL_RE = '#PROTOCOL#', ID_RE = /[\-.\/\\:]+/g,
    DS = isXPCOM
    ? (function path_separator( ){
        // http://stackoverflow.com/a/7092596/3591273
        var profil_dir = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD",Ci.nsIFile);
        profil_dir.append("abc"); profil_dir.append("abc");
        return profil_dir.path.substr(profil_dir.path.length-("abc".length)-1,1);
    })( )
    : (isNode
    ? import_('path').sep /* https://nodejs.org/api/path.html#path_path_sep */
    : '/'),
    
    read_file = isXPCOM
    ? function read_file( path, enc ) {
        var data, file, stream, len;
        // https://developer.mozilla.org/en-US/Add-ons/Code_snippets/File_I_O
        import_("resource://gre/modules/FileUtils.jsm");
        file = new FileUtils.File( path );
        stream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
        if ( 'binary' === enc )
        {
            var bstream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
            stream.init(file, -1, -1, false);
            len = stream.available( );
            bstream.setInputStream( stream );
            bstream.readByteArray( len, data = new Uint8Array( len ) );
            bstream.close( );
        }
        else
        {
            var cstream = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream),
                str = {}, read = 0;
            stream.init(file, -1, 0, 0); cstream.init(stream, enc, 0, 0);
            do { 
                // read as much as we can and put it in str.value
                read = cstream.readString(0xffffffff, str);
                data += str.value;
            } while (0 != read);
            cstream.close(); // this closes stream
        }
        return data;
    }
    : (isNode
    ? function read_file( path, enc ) {
        return fs.readFileSync( path, 'binary' === enc ? {} : {encoding:enc} );
    }
    : function read_file( path, enc ) {
        var xhr = XHR( );
        
        // plain text with enc encoding format
        xhr.open('GET', path, false);  // 'false' makes the request synchronous
        if ( 'binary' === enc )
        {
            // http://stackoverflow.com/questions/9855127/setting-xmlhttprequest-responsetype-forbidden-all-of-a-sudden
            if ( isWebWorker ) xhr.responseType = "arraybuffer";
        }
        else
        {
            // http://stackoverflow.com/questions/9855127/setting-xmlhttprequest-responsetype-forbidden-all-of-a-sudden
            if ( isWebWorker ) xhr.responseType = "text";
            xhr.setRequestHeader("Content-Type", "text/plain; charset="+enc+"");
            xhr.overrideMimeType("text/plain; charset="+enc+"");
        }
        xhr.send( null );
        if ( 200 === xhr.status )
            return 'binary' === enc ? xhr.response : xhr.responseText;
        else
            return 'binary' === enc ? null : '';
    }),
    read_file_async = isXPCOM
    ? function read_file_async( path, enc, cb ) {
        // https://developer.mozilla.org/en-US/Add-ons/Code_snippets/File_I_O
        import_("resource://gre/modules/NetUtil.jsm");
        NetUtil.asyncFetch(path, function( stream, status ) {
            var data;
            if ( Components.isSuccessCode( status ) )
            {
                if ( 'binary' === enc )
                {
                    var bstream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream),
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
                data = 'binary' === enc ? null : '';
            }
            if ( cb ) cb( data );
        });
    }
    : (isNode
    ? function read_file_async( path, enc, cb ) {
        if ( 'binary' === enc )
        {
            fs.readFile(path, function( err, data ){
                if ( cb ) cb( !!err ? null : data );
            });
        }
        else
        {
            fs.readFile(path, {encoding:enc}, function( err, text ){
                if ( cb ) cb( !!err ? '' : text );
            });
        }
        return '';
    }
    : function read_file_async( path, enc, cb ) {
        var xhr = XHR( );
        
        // plain text with enc encoding format
        xhr.open('GET', path, true);  // 'true' makes the request asynchronous
        if ( 'binary' === enc )
        {
            xhr.responseType = "arraybuffer";
            xhr.onload = function( ) {
                if ( cb )
                    cb( 200 === xhr.status ? xhr.response : null );
            };
        }
        else
        {
            xhr.responseType = "text";
            xhr.setRequestHeader("Content-Type", "text/plain; charset="+enc+"");
            xhr.overrideMimeType("text/plain; charset="+enc+"");
            xhr.onload = function( ) {
                if ( cb )
                    cb( 200 === xhr.status ? xhr.responseText : '' );
            };
        }
        xhr.send( null );
        return '';
    }),
    
    Importer
;

// load javascript(s)/text(s) (a)sync in node, browser, webworker, xpcom module
function load_deps( importer, scope, cache, ref, complete )
{
    var dl = ref.length, i, t, cached,
        head, load, next, loaded = new Array( dl );
    // xpcom module / nodejs, require / webworker, importScripts
    if ( isXPCOM || isNode || isWebWorker )
    {
        for (i=0; i<dl; i++)
        {
            if ( cache[HAS](ref[ i ].cache_id) ) loaded[ i ] = cache[ ref[ i ].cache_id ];
            else if ( 'class' !== ref[ i ].type ) loaded[ i ] = cache[ ref[ i ].cache_id ] = read_file( ref[ i ].path, isXPCOM ? 'UTF-8' : 'utf8' );
            else if ( ref[ i ].name in scope ) loaded[ i ] = scope[ ref[ i ].name ];
            else
            {                
                loaded[ i ] = import_module( scope[ ref[ i ].name, ref[ i ].path, scope ] ) || null;
                // hook here
                importer.trigger("import-class", [
                    //          this,     id,        classname,   path,        reference
                    importer, ref[i].id, ref[i].name, ref[i].path, loaded[ i ]
                ]).trigger("import-class-"+ref[i].id, [
                    //          this,     id,        classname,   path,        reference
                    importer, ref[i].id, ref[i].name, ref[i].path, loaded[ i ]
                ]);
            }
        }
        return complete.apply( scope, loaded );
    }
    // browser, <script> tags
    else
    {
        head = $$tag("head", 0); 
        t = 0; i = 0;
        load = function load( id, type, path, next ) {
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
                        cache[ id ]  = data;
                        $$asset(type, data)[ATTR]("id", id);
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
                        cache[ id ]  = data;
                        if ( 'template' === type && !$$(id) )
                            $$asset('tpl', data)[ATTR]("id", id);
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
                        if (!done && (!script.readyState || script.readyState == 'loaded' || script.readyState == 'complete'))
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
            if ( (cached=cache[HAS](ref[ i ].cache_id)) || (ref[ i ].name in scope) )
            {
                loaded[ i ] = (cached ? cache[ ref[ i ].cache_id ] : scope[ ref[ i ].name ]) || null;
                
                // hook here
                importer.trigger("import-class", [
                    //          this,     id,        classname,   path,        reference
                    importer, ref[i].id, ref[i].name, ref[i].path, loaded[ i ]
                ]).trigger("import-class-"+ref[i].id, [
                    //          this,     id,        classname,   path,        reference
                    importer, ref[i].id, ref[i].name, ref[i].path, loaded[ i ]
                ]);
                
                if ( ++i >= dl ) 
                {
                    complete.apply( scope, loaded );
                }
                else if ( (cached=cache[HAS](ref[ i ].cache_id)) || (ref[ i ].name in scope) ) 
                {
                    loaded[ i ] = (cached ? cache[ ref[ i ].cache_id ] : scope[ ref[ i ].name ]) || null;
                    next( ); 
                }
                else
                {                    
                    scope[ ref[ i ].name ] = null;
                    load( ref[ i ].cache_id, ref[ i ].type, ref[ i ].path, next );
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
                importer.trigger("import-class", [
                    //          this,     id,        classname,   path,        reference
                    importer, ref[i].id, ref[i].name, ref[i].path, null
                ]).trigger("import-class-"+ref[i].id, [
                    //          this,     id,        classname,   path,        reference
                    importer, ref[i].id, ref[i].name, ref[i].path, null
                ]);
                i++; next( ); 
            }
        };
        while ( i < dl && ((cached=cache[HAS](ref[ i ].cache_id)) || (ref[ i ].name in scope)) ) 
        {
            loaded[ i ] = (cached ? cache[ ref[ i ].cache_id ] : scope[ ref[ i ].name ]) || null;
            i++;
        }
        if ( i < dl ) load( ref[ i ].cache_id, ref[ i ].type, ref[ i ].path, next );
        else complete.apply( scope, loaded );
    }
}

function is_callable( o )
{
    return "function" === typeof o;
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
    if ( "object" === css_type )
    {
        index = 0;
        for (n in css)
        {
            if ( !css[HAS](n) ) continue;
            declaration = css[ n ];
            selector = declaration.selector;
            rules = [].concat(declaration.rules).join('; ');
            if ( "insertRule" in style.sheet ) 
            {
                style.sheet.insertRule( selector + "{" + rules + "}", index );
                declaration.css = style.sheet.cssRules[ index ];
            }
            else if ( "addRule" in style.sheet ) 
            {
                style.sheet.addRule( selector, rules, index );
                declaration.css = style.sheet.rules[ index ];
            }
            index++;
        }
    }
    // css literal string
    else if ( "string" === css_type )
    {
        if ( style.styleSheet ) style.styleSheet.cssText = (style.styleSheet.cssText||'') + css;
        else style.appendChild( document.createTextNode( css ) );
    }
    return css;
}

function $$asset( type, src, unique )
{
    var asset = null, link = null, i, links;
    switch( type )
    {
        // external tpl
        case "tpl-link":
        // literal tpl
        case "tpl":
            // Create the <script> tag
            asset = $$el("script");
            asset[ATTR]("type", "text/x-tpl");
            // WebKit hack :(
            asset.appendChild( document.createTextNode(src) );
            // Add the <script> element to the page
            document.head.appendChild( asset );
            break;
            
        // external script
        case "script-link":
            if ( unique )
            {
                // external script, only if not exists
                links = $$tag("script");
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
                asset[ATTR]("type", "text/javascript");
                asset[ATTR]("language", "javascript");
                asset[ATTR]("src", src);
                // Add the <script> element to the page
                document.head.appendChild( asset );
            }
            break;
        
        // literal script
        case "script":
            // Create the <script> tag
            asset = $$el("script");
            asset[ATTR]("type", "text/javascript");
            asset[ATTR]("language", "javascript");
            // WebKit hack :(
            asset.appendChild( document.createTextNode(src) );
            // Add the <script> element to the page
            document.head.appendChild( asset );
            break;
            
        // external stylesheet
        case "style-link":
            if ( unique )
            {
                // external stylesheet, only if not exists
                links = $$tag("link");
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
                // Add a media (and/or media query) here if you'd like!
                asset[ATTR]("type", "text/css");
                asset[ATTR]("rel", "stylesheet");
                asset[ATTR]("media", "all");
                asset[ATTR]("href", src);
                // Add the <style> element to the page
                document.head.appendChild( asset );
            }
            break;
        
        // literal stylesheet
        case "style":
        default:
            // Create the <style> tag
            asset = $$el("style");
            // Add a media (and/or media query) here if you'd like!
            asset[ATTR]("type", "text/css");
            asset[ATTR]("media", "all");
            // WebKit hack :(
            asset.appendChild( document.createTextNode("") );
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
    !args.length && (return full);
    if ( isXPCOM )
    {
        import_("resource://gre/modules/osfile.jsm");
        full = OS.Path.join.apply( OS.Path, args );
    }
    else if ( isNode )
    {
        p = import_('path');
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
    var args = arguments, argslen = args.length, ds = DS, path, plen,
        isAbsolute, trailingSlash, peices, new_path, up, i, last;
    
    if ( !argslen )  return ".";
    
    // take care of protocol, if exists
    path = map.call( args, remove_protocol ).join( ds );
    plen = path.length;
    
    if ( !plen ) return ".";
    
    isAbsolute    = path.charAt( 0 );
    trailingSlash = path.charAt( plen - 1 );

    peices = path.split( DS_RE ).filter( Boolean );
    
    new_path = [ ];
    up = 0;
    i = peices.length-1;
    while ( i >= 0 )
    {
        last = peices[ i ];
        if ( ".." === last ) 
        {
            up++;
        } 
        else if ( "." !== last )
        {
            if ( up )  up--;
            else  new_path.push( peices[ i ] );
        }
        i--;
    }
    
    path = new_path.reverse( ).join( ds );
    
    if ( !path && !isAbsolute ) 
    {
        path = ".";
    }

    if ( path && trailingSlash === ds ) 
    {
        path += ds;
    }

    return (isAbsolute === ds ? ds : "") + add_protocol( path );
}

Importer = function Importer( base, base_url ) {
    var self = this;
    if ( !(self instanceof Importer) ) return new Importer( base, base_url );
    self.base = '';
    self.base_url = '';
    self.base_path( base, base_url );
    self._classes = { };
    self._assets = { };
    self._hooks = { };
    self._cache = { };
};

Importer.VERSION = '0.3.1';
Importer.BASE = './';
Importer.path_join = path_join;
Importer.join_path = join_path;

Importer[PROTO] = {
    constructor: Importer
    
    ,base: null
    ,base_url: null
    ,_classes: null
    ,_assets: null
    ,_hooks: null
    ,_cache: null
    
    ,dispose: function( ) {
        var self = this;
        self._classes = null;
        self._assets = null;
        self._hooks = null;
        self._cache = null;
        self.base = null;
        self.base_url = null;
        return self;
    }
    
    ,on: function( hook, handler, once ) {
        var self = this;
        if ( !empty(hook) && is_callable(handler) )
        {
            if ( !self._hooks[HAS](hook) ) self._hooks[hook] = [];
            self._hooks[hook].push( [handler, true === once, 0] );
        }
        return self;
    }
    
    ,one: function( hook, handler ) {
        return this.on( hook, handler, true );
    }
    
    ,off: function( hook, handler ) {
        var self = this, hooks, i;
        if ( !empty(hook) && !empty(self._hooks[hook]) )
        {
            if ( true === handler )
            {
                delete(self._hooks[hook]);
            }
            else if ( handler )
            {
                hooks = self._hooks[hook];
                for(i=hooks.length-1; i>=0; i--)
                {
                    if ( handler === hooks[i][0] )
                        hooks.splice( i, 1 );
                }
            }
        }
        return self;
    }
    
    ,trigger: function( hook, args ) {
        var self = this, hooks, i, h, ret;
        if ( !empty(hook) && !empty(self._hooks[hook]) )
        {
            hooks = self._hooks[hook];
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
    
    ,get_path: function( path, base ) {
        var self = this;
        
        if ( empty(path) ) return base||'';
        
        else if ( !empty(base) && 
            (startsWith(path, './') || 
                startsWith(path, '../') || 
                startsWith(path, '.\\') || 
                startsWith(path, '..\\'))
        ) 
            return join_path( base, path ); 
        
        else return path;
    }
    
    ,path: function( asset ) {
        var self = this;
        return self.get_path( asset||'', isNode ? self.base : self.base_url );
    }
    
    ,path_url: function( asset ) {
        var self = this;
        return self.get_path( asset||'', self.base_url );
    }
    
    ,register: function( what, defs ) {
        var self = this, classes = self._classes, assets = self._assets,
            i, l, classname, def, id, path, deps, type, asset;
        if ( is_array( defs ) && defs.length )
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
                        classes[ id ] = [
                            /* 0:class, 1:id, 2:path, 3:deps, 4:loaded */
                            classname, 
                            id, 
                            self.path( path ), 
                            array(deps), 
                            false
                        ];
                    }
                }
            }
            else if ( 'assets' === what )
            {
                for (i=0,l=defs.length; i<l; i++)
                {
                    def = defs[ i ];
                    /* 0:type, 1:id, 2:asset, 3:deps */
                    type = def[0]; id = def[1]; asset = def[2]; deps = def[3] ? def[3] : [];
                    if ( !empty( type ) && !empty( id ) && !empty( asset ) ) 
                    {
                        assets[ id ] = [
                            /* 0:type,         1:id, 2:asset, 3:deps,   4:enqueued, 5:loaded */
                            type[LOWER]( ), 
                            id, 
                            is_string( asset ) ? self.path_url( asset ) : asset, 
                            array(deps), 
                            false, 
                            false
                        ];
                    }
                }
            }
        }
        return self;
    }
    
    ,import_class: function( id, complete ) {
        var self = this, queue, classes = self._classes,
            cache_id = 'class-'+id, cache = self._cache, exists,
            needs_deps, numdeps, i, dep, deps, to_load;
        
        if ( cache[HAS](cache_id) ) 
        {
            if ( is_callable(complete) )
                complete.call( self, cache[cache_id] );
        }
        else
        {
            exists = false;
            to_load = [ ];
            queue = [ id ];
            while ( queue.length )
            {
                id = queue[ 0 ];
                
                if ( classes[HAS](id) && !classes[id][4] )
                {
                    exists = true;
                    if ( !Scope[HAS]( classes[id][0] ) )
                    {
                        deps = classes[id][3];
                        if ( !empty(deps) )
                        {
                            needs_deps = false;
                            numdeps = deps.length;
                            for (i=numdeps-1; i>=0; i--)
                            {
                                dep = deps[i];
                                if ( classes[HAS](dep) && !classes[dep][4] )
                                {
                                    needs_deps = true;
                                    queue.unshift( dep );
                                }
                            }
                            if ( needs_deps ) continue;
                            else queue.shift( );
                        }
                        classes[id][4] = true; // loaded
                        to_load.push({
                            id: id,
                            type: 'class',
                            cache_id: 'class-' + id,
                            name: classes[id][0],
                            path: classes[id][2]
                        });
                    }
                    else
                    {
                        classes[id][4] = true; // loaded
                        cache[ 'class-' + id ] = Scope[ classes[id][0] ];
                    }
                }
                else if ( classes[HAS](id) )
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
                    for (i=0,l=args.length; i<l; i++) cache[ to_load[ i ].cache_id ] = args[ i ];
                    if ( is_callable(complete) ) complete.call( self, cache[cache_id] );
                });
            }
            else if ( is_callable(complete) )
            {
                complete.call( self, null );
            }
        }
        return self;
    }
    
    ,import_asset: function( id ) {
        var self = this, queue = [ id ], assets = self._assets, deps,
            needs_deps, numdeps, i, dep, out = [ ], asset_def, type, asset, asset_id,
            is_style, is_script, is_tpl, is_inlined, document_asset, ret;
        while ( queue.length )
        {
            id = queue[ 0 ];
            if ( assets[HAS](id) && assets[id][4] && !assets[id][5] ) // enqueued but not loaded yet
            {
                asset_def = assets[id];
                type = asset_def[0]; 
                id = asset_def[1];  
                asset = asset_def[2]; 
                deps = asset_def[3];
                if ( deps && deps.length )
                {
                    needs_deps = false;
                    numdeps = deps.length;
                    for (i=numdeps-1; i>=0; i--)
                    {
                        dep = deps[i];
                        if ( assets[HAS](dep) && !assets[dep][5] )
                        {
                            assets[dep][4] = true; // enqueued
                            needs_deps = true;
                            queue.unshift( dep );
                        }
                    }
                    if ( needs_deps ) continue;
                    else queue.shift( );
                }
                
                asset_def[5] = true; // loaded
                
                // hook here
                ret = {};
                self.trigger("import-asset", [
                    // importer, id,      type,   asset
                    self, id, type, asset, ret
                ]).trigger("import-asset-"+id, [
                    // importer, id,      type,   asset
                    self, id, type, asset, ret
                ]);
                
                if ( null != ret['return'] )
                {
                    out.push( ret['return'] );
                }
                else
                {
                    is_style = 'styles' === type;
                    is_script = 'scripts' === type;
                    is_tpl = 'templates' === type;
                    is_inlined = is_array( asset );
                    asset_id = id.replace(ID_RE, '_');
                    if ( is_style )
                    {
                        if ( isBrowser )
                        {
                            out.push( document_asset = is_inlined
                                ? $$("importer-inline-style-"+asset_id) || $$asset( 'style', asset[0] )
                                : $$("importer-style-"+asset_id) || $$asset( 'style-link', self.path_url(asset), true ) );
                            document_asset[ATTR]('id', is_inlined ? "importer-inline-style-"+asset_id : "importer-style-"+asset_id);
                        }
                        else
                        {
                            out.push( is_inlined
                                    ? ("<style id=\"importer-inline-style-"+asset_id+"\" type=\"text/css\" media=\"all\">"+asset[0]+"</style>")
                                    : ("<link id=\"importer-style-"+asset_id+"\" type=\"text/css\" rel=\"stylesheet\" href=\""+self.path_url(asset)+"\" media=\"all\" />")
                            );
                        }
                    }
                    else if ( is_script )
                    {
                        if ( isBrowser )
                        {
                            out.push( document_asset = is_inlined
                                ? $$("importer-inline-script-"+asset_id) || $$asset( 'script', "/*<![CDATA[*/ "+asset[0]+" /*]]>*/" )
                                : $$("importer-script-"+asset_id) || $$asset( 'script-link', self.path_url(asset), true ) );
                            document_asset[ATTR]('id', is_inlined ? "importer-inline-script-"+asset_id : "importer-script-"+asset_id);
                        }
                        else
                        {
                            out.push( is_inlined
                                    ? ("<script id=\"importer-inline-script-"+asset_id+"\" type=\"text/javascript\">/*<![CDATA[*/ "+asset[0]+" /*]]>*/</script>")
                                    : ("<script id=\"importer-script-"+asset_id+"\" type=\"text/javascript\" src=\""+self.path_url(asset)+"\"></script>")
                            );
                        }
                    }
                    else if ( is_tpl )
                    {
                        if ( isBrowser )
                        {
                            out.push( document_asset = is_inlined
                                ? $$("importer-inline-tpl-"+asset_id) || $$asset( 'tpl', asset[0] )
                                : $$("importer-inline-tpl-"+asset_id) || $$asset( 'tpl', self.get(asset) ) );
                            document_asset[ATTR]('id', is_inlined ? "importer-inline-tpl-"+asset_id : "importer-inline-tpl-"+asset_id);
                        }
                        else
                        {
                            out.push( is_inlined
                                    ? ("<script id=\"importer-inline-tpl-"+asset_id+"\" type=\"text/x-tpl\">"+asset[0]+"</script>")
                                    : ("<script id=\"importer-inline-tpl-"+asset_id+"\" type=\"text/x-tpl\">"+self.get(asset)+"</script>")
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
    
    ,assets: function( type ) {
        var self = this, out, assets = self._assets, next,
            id, asset_def, i, l, to_load = [ ];
        if ( !arguments.length ) type = "scripts";
        type = type[LOWER]( );
        for (id in assets)
        {
            if ( !assets[HAS](id) ) continue;
            asset_def = assets[id];
            if ( type === asset_def[0] && asset_def[4] && !asset_def[5] )
            {
                to_load.push( asset_def[1] );
            }
        }
        if ( isBrowser )
        {
            for (i=0,l=to_load.length; i<l; i++)
                self.import_asset( to_load[i] );
            out = '';
        }
        else //if ( isNode || isWebWorker )
        {
            out = [ ];
            for (i=0,l=to_load.length; i<l; i++)
                out = out.concat( self.import_asset( to_load[i] ) );
            out = out.join("\n");
        }
        return out;
    }
    
    ,enqueue: function( type, id, asset, deps ) {
        var self = this, assets = self._assets;
        if ( !empty(type) && !empty(id) )
        {
            if ( assets[HAS](id) ) 
            {
                assets[id][4] = true; // enqueued
                // hook here
                self.trigger("enqueue-asset", [
                    // importer, id,      type,   asset
                    self, id, type, assets[id][2]
                ]).trigger("enqueue-asset-"+id, [
                    // importer, id,      type,   asset
                    self, id, type, assets[id][2]
                ]);
            }
            else if ( !empty(asset) ) 
            {
                self.register("assets", [type, id, asset, deps]);
                assets[id][4] = true; // enqueued
                // hook here
                self.trigger("enqueue-asset", [
                    // importer, id,      type,   asset
                    self, id, type, assets[id][2]
                ]).trigger("enqueue-asset-"+id, [
                    // importer, id,      type,   asset
                    self, id, type, assets[id][2]
                ]);
            }
        }
        return self;
    }
    
    ,get: function( path, opts, complete ) {
        var self = this, encoding;
        path = self.path( path );
        opts = opts || { };
        encoding = opts.encoding || 'utf8';
        if ( !empty(opts.binary) ) encoding = 'binary';
        complete = complete || opts.complete || (is_callable( opts ) && opts);
        if ( isBrowser )
        {
            return read_file_async(path, encoding, function( data ){
                if ( is_callable( complete ) ) complete( data );
            })
        }
        else
        {
            return is_callable( complete )
            ? read_file_async( path, encoding, complete )
            : read_file( path, encoding );
        }
    }
    
    ,load: function( classname, path, deps, complete ) {
        var self = this, argslen = arguments.length, l, c, i, loader;
        if ( is_array(classname) )
        {
            complete = path;
            l = classname.length; c = new Array( l ); i = 0;
            loader = function loader( loaded ) {
                if ( arguments.length )
                {
                    c[ i ] = loaded || null;
                    i++;
                }
                if ( i < l ) self.import_class( classname[i], loader );
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
            if ( argslen < 4 && is_callable(deps) ) 
            {
                complete = deps;
                deps = null;
            }
            else if ( argslen < 3 && is_callable(path) ) 
            {
                complete = path;
                path = null;
                deps = null;
            }
            if ( !self._classes[HAS](classname) && !empty(path) )
                self.register("classes", [classname, classname, self.path(path), deps]);
            if ( self._classes[HAS](classname) && !self._classes[classname][4] )
                self.import_class( classname, complete );
            else if ( is_callable(complete) )
                complete.call( self, self._cache['class-'+classname]||null );
        }
        return self;
    }
}

Importer.BASE = isNode
    ? __dirname
    : (isWebWorker
    ? this.location.href.split('/').slice(0,-1).join('/')
    : ($$tag('script', -1).src||'./').split('/').slice(0,-1).join('/') // absolute uri
);

// export it
return Importer;
});
