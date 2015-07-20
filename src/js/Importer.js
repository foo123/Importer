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

var PROTO = 'prototype', HAS = 'hasOwnProperty', ATTR = 'setAttribute', toString = Object[PROTO].toString, 
    map = Array[PROTO].map,
    
    isNode = ("undefined" !== typeof global) && ("[object global]" === toString.call(global)),
    isBrowser = !isNode && ("undefined" !== typeof navigator), 
    isWebWorker = !isNode && ("function" === typeof importScripts) && (navigator instanceof WorkerNavigator),
    
    is_string = function( o ){ return o instanceof String || '[object String]' === toString.call(o); },
    is_array = function( o ){ return o instanceof Array || '[object Array]' === toString.call(o); },
    is_obj = function( o ){ return o instanceof Object || '[object Object]' === toString.call(o); },
    empty = function( o ){ !o || ((is_string(o) || is_array(o)) && !o.length); },
    array = function( o ){ return is_array( o ) ? o : [o]; },
    startsWith = String[PROTO].startsWith 
            ? function( s, pre, pos ){return s.startsWith(pre, pos||0);} 
            : function( s, pre, pos ){pos=pos||0; return pre === s.substr(pos, pre.length+pos);},
    DS = '/', DS_RE = /\/|\\/g, PROTOCOL = '://', PROTOCOL_RE = '#PROTOCOL#',
    Importer
;

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

function createAsset( type, src ) 
{
    var asset = null;
    switch( type )
    {
        // external script, only if not exists
        case "script-link-unique":
            var i, links = document.head.getElementsByTagName("script"), link = null;
            for (i=links.length-1; i>=0; i--) 
            {
                if ( links[i].src && src === links[i].src ) 
                {
                    // found existing link
                    link = links[ i ];
                    break;
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
                asset = document.createElement('script');
                asset[ATTR]("type", "text/javascript");
                asset[ATTR]("language", "javascript");
                // Add the <script> element to the page
                document.head.appendChild( asset );
                asset[ATTR]("src", src);
            }
            break;
        
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
        
        // literal script
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
            
        // external stylesheet, only if not exists
        case "style-link-unique":
            var i, links = document.head.getElementsByTagName("link"), link = null;
            for (i=links.length-1; i>=0; i--) 
            {
                if ( src === links[i].href ) 
                {
                    // found existing link
                    link = links[ i ];
                    break;
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
                asset = document.createElement('link');
                // Add a media (and/or media query) here if you'd like!
                asset[ATTR]("type", "text/css");
                asset[ATTR]("rel", "stylesheet");
                asset[ATTR]("media", "all");
                asset[ATTR]("href", src);
                // Add the <style> element to the page
                document.head.appendChild( asset );
            }
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
        
        // literal stylesheet
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
            document.head.appendChild( asset );
            if ( src ) addCSS( asset, src );
            break;
    }
    return asset;
}

function disposeAsset( asset ) 
{
    if ( asset ) 
        document.head.removeChild( asset );
}

// load javascript(s) (a)sync in node, browser, webworker
function loadClasses( scope, names, paths, callback )
{
    var dl = names.length, i, t, head, load, next, classes = new Array( dl );
    if ( isNode )
    {
        for (i=0; i<dl; i++) 
        {
            if ( !(names[ i ] in scope) ) scope[ names[ i ] ] = require( paths[ i ] );
            classes[ i ] = scope[ names[ i ] ];
        }
        return callback.apply( null, classes );
    }
    else if ( isWebWorker )
    {
        for (i=0; i<dl; i++) 
        {
            if ( !(names[ i ] in scope) ) importScripts( paths[ i ] );
            classes[ i ] = scope[ names[ i ] ];
        }
        return callback.apply( null, classes );
    }
    else
    {
        head = document.getElementsByTagName("head")[ 0 ]; 
        t = 0; i = 0;
        load = function( url, cb ) {
            var done = 0, script = document.createElement('script');
            script.setAttribute('type','text/javascript'); 
            script.setAttribute('language','javascript');
            script.onload = script.onreadystatechange = function( ) {
                if (!done && (!script.readyState || script.readyState == 'loaded' || script.readyState == 'complete'))
                {
                    done = 1; script.onload = script.onreadystatechange = null;
                    /*head.removeChild( script );*/ script = null;
                    cb( );
                }
            }
            // load it
            head.appendChild( script ); 
            script.src = url;
        };
        next = function( ) {
            if ( names[ i ] in scope )
            {
                classes[ i ] = scope[ names[ i ] ];
                if ( ++i >= dl ) 
                {
                    callback.apply( null, classes );
                }
                else if ( names[ i ] in scope ) 
                {
                    classes[ i ] = scope[ names[ i ] ];
                    next( ); 
                }
                else
                {                    
                    load( paths[ i ], next );
                }
            }
            else if ( ++t < 30 ) 
            { 
                setTimeout( next, 30 ); 
            }
            else 
            { 
                t = 0; 
                i++; 
                next( ); 
            }
        };
        while ( i < dl && (names[ i ] in scope) ) 
        {
            classes[ i ] = scope[ names[ i ] ];
            i++;
        }
        if ( i < dl ) load( paths[ i ], next );
        else callback.apply( null, classes );
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
};

Importer.VERSION = '0.1';
Importer.join_path = join_path;

Importer[PROTO] = {
    constructor: Importer
    
    ,classes: null
    ,assets: null
    ,base: null
    ,base_url: null
    
    ,dispose: function( ) {
        var self = this;
        self.classes = null;
        self.assets = null;
        self.base = null;
        self.base_url = null;
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
        
        if ( !path ) return base||'';
        
        else if ( base && base.length && 
            (startsWith(path, './') || 
                startsWith(path, '../') || 
                startsWith(path, '.\\') || 
                startsWith(path, '..\\'))
        ) 
            return join_path( base, path ); 
        
        else return path;
    }
    
    ,path: function( asset ) {
        return this.get_path( asset||'', this.base );
    }
    
    ,path_url: function( asset ) {
        return this.get_path( asset||'', this.base_url );
    }
    
    ,register: function( what, defs ) {
        var self = this;
        if ( is_array( defs ) && defs.length )
        {
            if ( !is_array( defs[0] ) ) defs = [defs]; // make array of arrays
            
            if ( 'classes' === what )
            {
                for ($defs as $def)
                {
                    /* 0:class, 1:id, 2:path, 3:deps */
                    $class = $def[0]; $id = $def[1]; $path = $def[2]; deps = def[3] ? def[3] : [];
                    if ( !empty( $class ) && !empty( $id ) && !empty( $path ) ) 
                    {
                        $this->classes[ $id ] = array(
                            /* 0:class, 1:id, 2:path, 3:deps, 4:loaded */
                            classname, 
                            id, 
                            self.path( path ), 
                            array(deps), 
                            false
                        );
                    }
                }
            }
            else if ( 'assets' === what )
            {
                foreach ($defs as $def)
                {
                    /* 0:type, 1:id, 2:asset, 3:deps */
                    $type = $def[0]; $id = $def[1]; $asset = $def[2]; deps = def[3] ? def[3] : [];
                    if ( !empty( $type ) && !empty( $id ) && !empty( $asset ) ) 
                    {
                        $this->assets[ $id ] = array(
                            /* 0:type,         1:id, 2:asset, 3:deps,   4:enqueued, 5:loaded */
                            type.toLowerCase( ), 
                            id, 
                            self.path_url( asset ), 
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
    
    ,import_class: function( id, callback ) {
        var self = this, queue = [ id ], classes = self.classes, deps,
            needs_deps, numdeps, i, dep;
        while ( queue.length )
        {
            id = queue[ 0 ];
            
            if ( classes[HAS](id) && !classes[id][4] )
            {
                if ( !class_exists( classes[id][0] ) )
                {
                    deps = classes[id][3];
                    if ( deps && deps.length )
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
                    if ( false === require ) @include( classes[id][2] );
                    else require( classes[id][2] );
                }
            }
            else
            {
                queue.shift( );
            }
        }
        return self;
    }
    
    ,import_asset: function( id, callback ) {
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
                            ? ("<style id=\""+id+"\" type=\"text/css\" media=\"all\">"+asset[0]+"</style>")
                            : ("<link id=\""+id+"\" type=\"text/css\" rel=\"stylesheet\" href=\""+asset+"\" media=\"all\" />")
                    );
                }
                else if ( isScript )
                {
                    out.push( isLiteral 
                            ? ("<script id=\""+id+"\" type=\"text/javascript\">/*<![CDATA[*/ "+asset[0]+" /*]]>*/</script>")
                            : ("<script id=\""+id+"\" type=\"text/javascript\" src=\""+asset+"\"></script>")
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
        var self = this;
        if ( is_string(type) && type.length && is_string(id) && id.length )
        {
            if ( self.assets[HAS](id) ) 
            {
                self.assets[id][4] = true; // enqueued
            }
            else if ( is_string(asset) && asset.length ) 
            {
                if ( !deps ) deps = [ ];
                self.register("assets", [type, id, asset, deps]);
                self.assets[id][4] = true; // enqueued
            }
        }
        return self;
    }
    
    ,assets: function( type ) {
        var self = this, out = [ ], assets = self.assets, id, asset_def;
        if ( undef === type ) type = "scripts";
        type = type.toLowerCase( );
        for (id in assets)
        {
            if ( !assets[HAS](id) ) continue;
            assets_def = assets[id];
            if ( type === asset_def[0] && asset_def[4] && !asset_def[5] )
                out = out.concat( self.import_asset(asset_def[1]) );
        }
        return out.join("\n");
    }
    
    ,import: function( class, path=null, deps=array() ) {
        var self = this;
        if ( !isset( $this->classes[$class] ) && !empty($path) )
            $this->register("classes", array($class, $class, $this->path("$path.php"), $deps));
        if ( isset( $this->classes[$class] ) && !$this->classes[$class][4] && file_exists( $this->classes[$class][2] ) )
            $this->import_class($class);
        return self;
    }
}

// export it
return Importer;
});
