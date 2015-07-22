/**
*  Importer
*  a simple loader manager for classes and assets with dependencies for PHP, Python, Node/JS
*
*  @version 0.1
*  https://github.com/foo123/Importer
**/
!function( root, name, factory ) {
"use strict";

// export the module, umd-style (no other dependencies)
var isCommonJS = ("object" === typeof(module)) && module.exports, 
    isAMD = ("function" === typeof(define)) && define.amd, m;

// CommonJS, node, etc..
if ( isCommonJS ) 
    module.exports = (module.$deps = module.$deps || {})[ name ] = module.$deps[ name ] || (factory.call( root, {NODE:module} ) || 1);

// AMD, requireJS, etc..
else if ( isAMD && ("function" === typeof(require)) && ("function" === typeof(require.specified)) && require.specified(name) ) 
    define( name, ['require', 'exports', 'module'], function( require, exports, module ){ return factory.call( root, {AMD:module} ); } );

// browser, web worker, etc.. + AMD, other loaders
else if ( !(name in root) ) 
    (root[ name ] = (m=factory.call( root, {} ) || 1)) && isAMD && define( name, [], function( ){ return m; } );

}(  /* current root */          this, 
    /* module name */           "Importer",
    /* module factory */        function( exports, undef ) {
"use strict";

var scope = isNode ? global : this,
    PROTO = 'prototype', HAS = 'hasOwnProperty', ATTR = 'setAttribute', toString = Object[PROTO].toString, 
    map = Array[PROTO].map,
    
    isNode = ("undefined" !== typeof global) && ("[object global]" === toString.call(global)),
    isBrowser = !isNode && ("undefined" !== typeof navigator), 
    isWebWorker = !isNode && ("function" === typeof importScripts) && (navigator instanceof WorkerNavigator),
    
    is_callable = function( o ){ return "function" === typeof o; },
    is_string = function( o ){ return o instanceof String || '[object String]' === toString.call(o); },
    is_array = function( o ){ return o instanceof Array || '[object Array]' === toString.call(o); },
    is_obj = function( o ){ return o instanceof Object || '[object Object]' === toString.call(o); },
    empty = function( o ){ 
        if ( !o ) return true;
        var to_string = toString.call(o);
        return (o instanceof Array || o instanceof String || '[object Array]' === to_string || '[object String]' === to_string) && !o.length;
    },
    array = function( o ){ return is_array( o ) ? o : [o]; },
    startsWith = String[PROTO].startsWith 
            ? function( s, pre, pos ){return s.startsWith(pre, pos||0);} 
            : function( s, pre, pos ){pos=pos||0; return pre === s.substr(pos, pre.length+pos);},
    DS = '/', DS_RE = /\/|\\/g, PROTOCOL = '://', PROTOCOL_RE = '#PROTOCOL#',
    Importer
;

/*
// adapted from http://davidwalsh.name/add-rules-stylesheets
function addCSSRule( style, selector, rules, index ) 
{
    if ( "insertRule" in style.sheet ) 
    {
        style.sheet.insertRule( selector + "{" + rules + "}", index );
        return style.sheet.cssRules[ index ];
    }
    else if ( "addRule" in style.sheet ) 
    {
        style.sheet.addRule( selector, rules, index );
        return style.sheet.rules[ index ];
    }
}

function addCSS( style, css ) 
{
    var css_type = typeof css;
    
    // css rules object
    if ( "object" === css_type )
    {
        var n, declaration, i = 0;
        for (n in css)
        {
            if ( !css[HAS](n) ) continue;
            declaration = css[ n ];
            declaration.css = addCSSRule( style, declaration.selector, [].concat(declaration.rules).join('; '), i++ );
        }
    }
    // css literal string
    else if ( "string" === css_type )
    {
        if ( style.styleSheet ) style.styleSheet.cssText = (style.styleSheet.cssText||'') + "\n" + css;
        else style.appendChild( document.createTextNode( "\n" + css ) );
    }
    return css;
}
*/

function createAsset( type, src ) 
{
    var asset = null;
    switch( type )
    {
        // external script
        case "script-link":
            // Create the <script> tag
            asset = document.createElement('script');
            asset[ATTR]("type", "text/javascript");
            asset[ATTR]("language", "javascript");
            // Add the <script> element to the page
            document.head.appendChild( asset );
            asset[ATTR]("src", src);
            break;
        
        // inline script
        case "script":
            // Create the <script> tag
            asset = document.createElement("script");
            asset[ATTR]("type", "text/javascript");
            asset[ATTR]("language", "javascript");
            // WebKit hack :(
            asset.appendChild( document.createTextNode( src ) );
            // Add the <script> element to the page
            document.head.appendChild( asset );
            break;
            
        // external stylesheet
        case "style-link":
            // Create the <link> tag
            asset = document.createElement('link');
            // Add a media (and/or media query) here if you'd like!
            asset[ATTR]("type", "text/css");
            asset[ATTR]("rel", "stylesheet");
            asset[ATTR]("media", "all");
            asset[ATTR]("href", src);
            // Add the <style> element to the page
            document.head.appendChild( asset );
            break;
        
        // inline stylesheet
        case "style":
        default:
            // Create the <style> tag
            asset = document.createElement("style");
            // Add a media (and/or media query) here if you'd like!
            asset[ATTR]("type", "text/css");
            asset[ATTR]("media", "all");
            // WebKit hack :(
            asset.appendChild( document.createTextNode("") );
            // Add the <style> element to the page
            if ( asset.styleSheet ) asset.styleSheet.cssText = (asset.styleSheet.cssText||'') + "\n" + src;
            else asset.appendChild( document.createTextNode( "\n" + src ) );
            document.head.appendChild( asset );
            break;
    }
    return asset;
}

function disposeAsset( asset ) 
{
    if ( asset ) 
        document.head.removeChild( asset );
}

function loadAssets( scope, names, paths, complete )
{
}

// load javascript(s) (a)sync in node, browser, webworker
function loadClasses( scope, cache, ids, names, paths, complete )
{
    var dl = names.length, i, t, cached,
        head, load, next, loaded = new Array( dl );
    // nodejs, require
    if ( isNode )
    {
        for (i=0; i<dl; i++) 
        {
            if ( cache[HAS](ids[ i ]) ) loaded[ i ] = cache[ ids[ i ] ];
            else if ( names[ i ] in scope ) loaded[ i ] = scope[ names[ i ] ];
            else loaded[ i ] = require( paths[ i ] ) || null;;
        }
        return complete.apply( scope, loaded );
    }
    // webworker, importScripts
    else if ( isWebWorker )
    {
        for (i=0; i<dl; i++) 
        {
            if ( cache[HAS](ids[ i ]) ) loaded[ i ] = cache[ ids[ i ] ];
            else if ( names[ i ] in scope ) loaded[ i ] = scope[ names[ i ] ];
            else { importScripts( paths[ i ] ); loaded[ i ] = scope[ names[ i ] ] || null; }
        }
        return complete.apply( scope, loaded );
    }
    // browser, <script> tags
    else
    {
        head = document.getElementsByTagName("head")[ 0 ]; 
        t = 0; i = 0;
        load = function load( id, path, next ) {
            var done, script;
            if ( (script = document.getElementById(id)) && 'script' === script.tagName.toLowerCase( ) ) 
            {
                next( );
            }
            else
            {
                done = 0;
                script = document.createElement('script');
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
                head.appendChild( script ); 
                script.src = path;
            }
        };
        next = function next( ) {
            var cached;
            if ( (cached=cache[HAS](ids[ i ])) || (names[ i ] in scope) )
            {
                loaded[ i ] = (cached ? cache[ ids[ i ] ] : scope[ names[ i ] ]) || null;
                if ( ++i >= dl ) 
                {
                    complete.apply( scope, loaded );
                }
                else if ( (cached=cache[HAS](ids[ i ])) || (names[ i ] in scope) ) 
                {
                    loaded[ i ] = (cached ? cache[ ids[ i ] ] : scope[ names[ i ] ]) || null;
                    next( ); 
                }
                else
                {                    
                    scope[ names[ i ] ] = null;
                    load( ids[ i ], paths[ i ], next );
                }
            }
            else if ( ++t < 10 ) 
            { 
                setTimeout( next, 30 ); 
            }
            else 
            { 
                t = 0; 
                scope[ names[ i++ ] ] = null;
                next( ); 
            }
        };
        while ( i < dl && ((cached=cache[HAS](ids[ i ])) || (names[ i ] in scope)) ) 
        {
            loaded[ i ] = (cached ? cache[ ids[ i ] ] : scope[ names[ i ] ]) || null;
            i++;
        }
        if ( i < dl ) load( ids[ i ], paths[ i ], next );
        else complete.apply( scope, loaded );
    }
}

function remove_protocol( p )
{
    return p.split( PROTOCOL ).join( PROTOCOL_RE );
}

function add_protocol( $p )
{
    return p.split( PROTOCOL_RE ).join( PROTOCOL );
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
    self.classes = { };
    self.assets = { };
    self.base = '';
    self.base_url = '';
    self.base_path( base, base_url );
    self._cache = { };
};

Importer.VERSION = '0.1';
Importer.join_path = join_path;

Importer[PROTO] = {
    constructor: Importer
    
    ,classes: null
    ,assets: null
    ,base: null
    ,base_url: null
    ,_cache: null
    
    ,dispose: function( ) {
        var self = this;
        self.classes = null;
        self.assets = null;
        self.base = null;
        self.base_url = null;
        self._cache = null;
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
        return this.get_path( asset||'', isNode ? this.base : this.base_url );
    }
    
    ,path_url: function( asset ) {
        return this.get_path( asset||'', this.base_url );
    }
    
    ,register: function( what, defs ) {
        var self = this, classes = self.classes, assets = self.assets,
            i, l,
            classname, def, id, path, deps, type, asset;
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
                    if ( !empty( classname ) && empty( id ) && empty( path ) ) 
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
                        assets[ id ] = array(
                            /* 0:type,         1:id, 2:asset, 3:deps,   4:enqueued, 5:loaded */
                            type.toLowerCase( ), 
                            id, 
                            is_string( asset ) ? self.path_url( asset ) : asset, 
                            array(deps), 
                            false, 
                            false
                        );
                    }
                }
            }
        }
        return self;
    }
    
    ,import_class: function( id, complete ) {
        var self = this, queue, classes = self.classes,
            cache_id = 'importer-script-'+id, cache = self._cache, exists,
            needs_deps, numdeps, i, dep, deps,
            to_load_ids, to_load_names, to_load_paths;
        
        if ( cache[HAS](cache_id) ) 
        {
            if ( is_callable(complete) )
                complete.call( self, cache[cache_id] );
        }
        else
        {
            exists = false;
            to_load_ids = [ ]; to_load_names = [ ]; to_load_paths = [ ];
            queue = [ id ];
            while ( queue.length )
            {
                id = queue[ 0 ];
                
                if ( classes[HAS](id) && !classes[id][4] )
                {
                    exists = true;
                    if ( !scope[HAS]( classes[id][0] ) )
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
                        classes[id][4] = true;
                        to_load_ids.unshift( 'importer-script-' + id );
                        to_load_names.unshift( classes[id][0] );
                        to_load_paths.unshift( classes[id][2] );
                    }
                    else
                    {
                        cache[ 'importer-script-' + id ] = scope[ classes[id][0] ];
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
            if ( exists && to_load_ids.length )
            {
                loadClasses(scope, cache, ids, names, paths, function( ){
                    var i, l;
                    for (i=0,l=arguments.length; i<l; i++) cache[ ids[ i ] ] = arguments[ i ];
                    if ( is_callable(complete) )
                        complete.call( self, cache[cache_id] );
                });
            }
            else if ( is_callable(complete) )
            {
                complete.call( self, null );
            }
        }
        return self;
    }
    
    ,import_asset: function( id, complete ) {
        var self = this, queue = [ id ], assets = self.assets, deps,
            needs_deps, numdeps, i, dep, out = [ ], asset_def, type, asset,
            isStyle, isScript, isLiteral;
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
                        if ( assets[HAS](dep) ) && !assets[dep][5] )
                        {
                            assets[dep][4] = true; // enqueued
                            needs_deps = true;
                            queue.unshift( dep );
                        }
                    }
                    if ( needs_deps ) continue;
                    else queue.shift( );
                }
                isStyle = 'styles' === type;
                isScript = 'scripts' === type;
                isLiteral = is_array( asset );
                if ( isStyle )
                {
                    out.push( isLiteral 
                            ? ("<style id=\"importer-inline-style-"+id+"\" type=\"text/css\" media=\"all\">"+asset[0]+"</style>")
                            : ("<link id=\"importer-style-"+id+"\" type=\"text/css\" rel=\"stylesheet\" href=\""+asset+"\" media=\"all\" />")
                    );
                }
                else if ( isScript )
                {
                    out.push( isLiteral 
                            ? ("<script id=\"importer-inline-script-"+id+"\" type=\"text/javascript\">/*<![CDATA[*/ "+asset[0]+" /*]]>*/</script>")
                            : ("<script id=\"importer-script-"+id+"\" type=\"text/javascript\" src=\""+asset+"\"></script>")
                    );
                }
                else
                {
                    out.push( isLiteral 
                            ? asset[0]
                            : asset
                    );
                }
                asset_def[5] = true; // loaded
            }
            else
            {
                queue.shift( );
            }
        }
        return out;
    }
    
    ,enqueue: function( type, id, asset, deps ) {
        var self = this, assets = self.assets;
        if ( !empty(type) && !empty(id) )
        {
            if ( assets[HAS](id) ) 
            {
                assets[id][4] = true; // enqueued
            }
            else if ( !empty(asset) ) 
            {
                self.register("assets", [type, id, asset, deps]);
                self.assets[id][4] = true; // enqueued
            }
        }
        return self;
    }
    
    ,assets: function( type, complete ) {
        var self = this, out, assets = self.assets, next,
            id, asset_def, i, l, to_load = [ ];
        if ( undef === type ) type = "scripts";
        type = type.toLowerCase( );
        for (id in assets)
        {
            if ( !assets[HAS](id) ) continue;
            assets_def = assets[id];
            if ( type === asset_def[0] && asset_def[4] && !asset_def[5] )
            {
                to_load.push( asset_def[1] );
            }
        }
        if ( isNode )
        {
            out = [ ];
            for (i=0,l=to_load.length; i<l; i++)
                out = out.concat( self.import_asset(asset_def[1]) );
            out = out.join("\n");
            if ( is_callable(complete) ) complete.call( self );
            return out;
        }
        else if ( isBrowser && !isWebWorker )
        {
            i = 0; l = to_load.length;
            next = function( ) {
                if ( ++i < l ) self.import_asset( to_load[ i ], next );
                else if ( is_callable(complete) ) complete.call( self );
            };
            if ( i < l ) self.import_asset( to_load[ i ], next );
            else if ( is_callable(complete) ) complete.call( self );
        }
        else if ( is_callable(complete) ) complete.call( self );
        return '';
    }
    
    ,import: function( classname, path, deps, complete ) {
        var self = this;
        if ( !complete && is_callable(deps) ) 
        {
            complete = deps;
            deps = null;
        }
        else if ( !complete && is_callable(path) ) 
        {
            complete = path;
            path = null;
        }
        if ( !self.classes[HAS](classname) && !empty(path) )
            self.register("classes", [classname, classname, self.path(path+".js"), deps));
        if ( self.classes[HAS](classname) && !self.classes[classname][4] /*&& file_exists( $this->classes[$class][2] )*/ )
            self.import_class(classname);
        return self;
    }
    
    ,importAll: function( classnames, complete ) {
        var self = this, i, l;
        if ( empty(classnames) ) return self;
        classnames = array(classnames);
        if ( isNode || isWebWorker )
        {
            for (i=0,l=classnames.length; i<l; i++) self.import( classnames[i] );
            if ( is_callable(complete) ) complete.call( self );
        }
        else
        {
        }
        return self;
    }
}

// export it
return Importer;
});
