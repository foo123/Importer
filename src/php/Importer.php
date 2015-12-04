<?php
/**
*  Importer
*  a simple loader manager for classes and assets with dependencies for PHP, Python, Node/JS
*
*  @version 0.3.2
*  https://github.com/foo123/Importer
**/
if ( !class_exists('Importer') )
{ 
class Importer
{
    const VERSION = '0.3.2';
    
    const DS = '/';
    const DS_RE = '#/|\\#';
    const PROTOCOL = '://';
    const PROTOCOL_RE = '#PROTOCOL#';
    
    public static $BASE = './';
    
    // simulate python's "startswith" string method
    public static function startsWith( $str, $pre, $pos=0 ) 
    { 
        return (bool)($pre === substr($str, $pos, strlen($pre))); 
    }
    
    public static function remove_protocol( $p )
    {
        return str_replace( self::PROTOCOL, self::PROTOCOL_RE, $p );
    }
    
    public static function add_protocol( $p )
    {
        return str_replace( self::PROTOCOL_RE, self::PROTOCOL, $p );
    }
    
    // adapted from https://github.com/JosephMoniz/php-path
    public static function join_path( ) 
    {
        $args = func_get_args( );
        $argslen = count( $args );
        $DS = self::DS; //DIRECTORY_SEPARATOR;
        
        if ( !$argslen )  return ".";
        
        // take care of protocol, if exists
        $path = implode( $DS, array_map( array(__CLASS__, 'remove_protocol'), $args ) );
        $plen = strlen( $path );
        
        if ( !$plen ) return ".";
        
        $isAbsolute    = $path[0];
        $trailingSlash = $path[$plen - 1];

        $peices = array_values( array_filter( preg_split( self::DS_RE, $path ), 'strlen' ) );
        
        $new_path = array( );
        $up = 0;
        $i = count($peices)-1;
        while ( $i >= 0 )
        {
            $last = $peices[ $i ];
            if ( ".." === $last ) 
            {
                $up++;
            } 
            elseif ( "." !== $last )
            {
                if ( $up )  $up--;
                else  array_push( $new_path, $peices[ $i ] );
            }
            $i--;
        }
        
        $path = implode( $DS, array_reverse($new_path) );
        
        if ( !$path && !$isAbsolute ) 
        {
            $path = ".";
        }

        if ( $path && $trailingSlash === $DS ) 
        {
            $path .= $DS;
        }

        return ($isAbsolute === $DS ? $DS : "") . self::add_protocol( $path );
    }
    
    private $base = null;
    private $base_url = null;
    private $_classes = null;
    private $_assets = null;
    private $_hooks = null;
    
    public static function _( $base='', $base_url='' )
    {
        return new self( $base, $base_url );
    }
    
    public function __construct( $base='', $base_url='' )
    {
        $this->_classes = array( );
        $this->_assets = array( );
        $this->_hooks = array( );
        $this->base = '';
        $this->base_url = '';
        $this->base_path( $base, $base_url );
    }
    
    public function __destruct( )
    {
        $this->dispose( );
    }
    
    public function dispose( )
    {
        $this->_classes = null;
        $this->_assets = null;
        $this->_hooks = null;
        $this->base = null;
        $this->base_url = null;
        return $this;
    }
    
    public function on( $hook, $handler, $once=false )
    {
        if ( !empty($hook) && is_callable($handler) )
        {
            if ( !isset($this->_hooks[$hook]) ) $this->_hooks[$hook] = array();
            $this->_hooks[$hook][] = array($handler, true === $once, 0);
        }
        return $this;
    }
    
    public function one( $hook, $handler )
    {
        return $this->on( $hook, $handler, true );
    }
    
    public function off( $hook, $handler )
    {
        if ( !empty($hook) && !empty($this->_hooks[$hook]) )
        {
            if ( true === $handler )
            {
                unset($this->_hooks[$hook]);
            }
            elseif ( $handler )
            {
                $hooks =& $this->_hooks[$hook];
                for($i=count($hooks)-1; $i>=0; $i--)
                {
                    if ( $handler === $hooks[$i][0] )
                        array_splice( $hooks, $i, 1 );
                }
            }
        }
        return $this;
    }
    
    public function trigger( $hook, $args=array() )
    {
        if ( !empty($hook) && !empty($this->_hooks[$hook]) )
        {
            $hooks =& $this->_hooks[$hook];
            $args = (array)$args;
            foreach($hooks as $i=>&$h)
            {
                if ( $h[1] && $h[2] ) continue;
                $h[2] = 1; // called;
                $ret = call_user_func_array( $h[0], $args );
                if ( false === $ret ) break;
            }
            // remove called oneoffs
            for($i=count($hooks)-1; $i>=0; $i--)
            {
                if ( $hooks[$i][1] && $hooks[$i][2] )
                    array_splice( $hooks, $i, 1 );
            }
        }
        return $this;
    }
    
    public function base_path( $base='', $base_url='' )
    {
        if ( is_string( $base ) && !empty( $base ) ) $this->base = $base;
        elseif ( false === $base ) $this->base = '';
        
        if ( is_string( $base_url ) && !empty( $base_url ) ) $this->base_url = $base_url;
        elseif ( false === $base_url ) $this->base_url = '';
        
        return $this;
    }
    
    public function get_path( $path, $base='' )
    {
        if ( empty($path) ) return $base;
        
        elseif ( !empty($base) && 
            (self::startsWith($path, './') || 
                self::startsWith($path, '../') || 
                self::startsWith($path, '.\\') || 
                self::startsWith($path, '..\\'))
        ) 
            return self::join_path( $base, $path ); 
        
        else return $path;
    }
    
    public function path( $asset='' )
    {
        return $this->get_path( $asset, $this->base );
    }
    
    public function path_url( $asset='' )
    {
        return $this->get_path( $asset, $this->base_url );
    }
    
    public function register( $what, $defs )
    {
        if ( is_array( $defs ) && !empty( $defs ) )
        {
            if ( !isset( $defs[0] ) || !is_array( $defs[0] ) ) $defs = array($defs); // make array of arrays
            
            if ( 'classes' === $what )
            {
                foreach ($defs as $def)
                {
                    /* 0:class, 1:id, 2:path, 3:deps */
                    $classname = $def[0]; $id = $def[1]; $path = $def[2]; $deps = isset($def[3]) ? $def[3] : array();
                    if ( !empty( $classname ) && !empty( $id ) && !empty( $path ) ) 
                    {
                        $this->_classes[ $id ] = array(
                            /* 0:class, 1:id, 2:path, 3:deps, 4:loaded */
                            $classname, 
                            $id, 
                            $this->path( $path ), 
                            (array)$deps, 
                            false
                        );
                    }
                }
            }
            elseif ( 'assets' === $what )
            {
                foreach ($defs as $def)
                {
                    /* 0:type, 1:id, 2:asset, 3:deps */
                    $type = $def[0]; $id = $def[1]; $asset = $def[2]; $deps = isset($def[3]) ? $def[3] : array();
                    if ( !empty( $type ) && !empty( $id ) && !empty( $asset ) ) 
                    {
                        $this->_assets[ $id ] = array(
                            /* 0:type,         1:id, 2:asset, 3:deps,   4:enqueued, 5:loaded */
                            strtolower($type), 
                            $id, 
                            // maybe literal asset
                            is_string( $asset ) ? $this->path_url( $asset ) : $asset,
                            (array)$deps, 
                            false, 
                            false
                        );
                    }
                }
            }
        }
        return $this;
    }
    
    private function import_class( $id, $require=true )
    {
        $queue = array( $id );
        while ( !empty( $queue ) )
        {
            $id = $queue[0];
            
            if ( isset( $this->_classes[$id] ) && !$this->_classes[$id][4] )
            {
                if ( !class_exists( $this->_classes[$id][0] ) )
                {
                    $deps = $this->_classes[$id][3];
                    if ( !empty( $deps ) )
                    {
                        $needs_deps = false;
                        $numdeps = count($deps);
                        for ($i=$numdeps-1; $i>=0; $i--)
                        {
                            $dep = $deps[$i];
                            if ( isset( $this->_classes[$dep] ) && !$this->_classes[$dep][4] )
                            {
                                $needs_deps = true;
                                array_unshift( $queue, $dep );
                            }
                        }
                        if ( $needs_deps ) continue;
                        else array_shift( $queue );
                    }
                    $this->_classes[$id][4] = true; // loaded
                    
                    if ( false === $require ) @include( $this->_classes[$id][2] );
                    else require( $this->_classes[$id][2] );
                    
                    // hook here
                    $this->trigger("import-class", array(
                        // $importer, $id,      $classname,   $path
                        $this, $id, $this->_classes[$id][0], $this->_classes[$id][2]
                    ))->trigger("import-class-{$id}", array(
                        // $importer, $id,      $classname,   $path
                        $this, $id, $this->_classes[$id][0], $this->_classes[$id][2]
                    ));
                }
            }
            else
            {
                array_shift( $queue );
            }
        }
        return $this;
    }
    
    private function import_asset( $id )
    {
        $out = array( );
        $queue = array( $id );
        while ( !empty( $queue ) )
        {
            $id = $queue[0];
            if ( isset( $this->_assets[$id] ) && $this->_assets[$id][4] && !$this->_assets[$id][5] ) // enqueued but not loaded yet
            {
                $asset_def =& $this->_assets[$id];
                $type = $asset_def[0]; 
                $id = $asset_def[1];  
                $asset = $asset_def[2]; 
                $deps = $asset_def[3];
                if ( !empty( $deps ) )
                {
                    $needs_deps = false;
                    $numdeps = count($deps);
                    for ($i=$numdeps-1; $i>=0; $i--)
                    {
                        $dep = $deps[$i];
                        if ( isset( $this->_assets[$dep] ) && !$this->_assets[$dep][5] )
                        {
                            $this->_assets[$dep][4] = true; // enqueued
                            $needs_deps = true;
                            array_unshift( $queue, $dep );
                        }
                    }
                    if ( $needs_deps ) continue;
                    else array_shift( $queue );
                }
                $asset_def[5] = true; // loaded
                
                // hook here
                $ret = array();
                $this->trigger("import-asset", array(
                    // $importer, $id,      $type,   $asset
                    $this, $id, $type, $asset, &$ret
                ))->trigger("import-asset-{$id}", array(
                    // $importer, $id,      $type,   $asset
                    $this, $id, $type, $asset, &$ret
                ));
                
                if ( isset($ret['return']) )
                {
                    $out[] = $ret['return'];
                }
                else
                {
                    $is_style = (bool)('styles' === $type);
                    $is_script = (bool)('scripts' === $type);
                    $is_tpl = (bool)('templates' === $type);
                    $is_inlined = is_array($asset);
                    $asset_id = preg_replace( '/[\\-.\\/\\\\:]+/', '_', $id);
                    if ( $is_style )
                    {
                        $out[] = $is_inlined
                                ? ("<style id=\"importer-inline-style-{$asset_id}\" type=\"text/css\" media=\"all\">{$asset[0]}</style>")
                                : ("<link id=\"importer-style-{$asset_id}\" type=\"text/css\" rel=\"stylesheet\" href=\"".$this->path_url($asset)."\" media=\"all\" />");
                    }
                    elseif ( $is_script )
                    {
                        $out[] = $is_inlined
                                ? ("<script id=\"importer-inline-script-{$asset_id}\" type=\"text/javascript\">/*<![CDATA[*/ {$asset[0]} /*]]>*/</script>")
                                : ("<script id=\"importer-script-{$asset_id}\" type=\"text/javascript\" src=\"".$this->path_url($asset)."\"></script>");
                    }
                    elseif ( $is_tpl )
                    {
                        $out[] = $is_inlined
                                ? ("<script id=\"importer-inline-tpl-{$asset_id}\" type=\"text/x-tpl\">{$asset[0]}</script>")
                                : ("<script id=\"importer-inline-tpl-{$asset_id}\" type=\"text/x-tpl\">".$this->get($asset)."</script>");
                    }
                    else
                    {
                        $out[] = $is_inlined ? $asset[0] : $this->get($asset);
                    }
                }
            }
            else
            {
                array_shift( $queue );
            }
        }
        return $out;
    }
    
    public function assets( $type="scripts" )
    {
        $out = array( );
        $type = strtolower($type);
        foreach ($this->_assets as $asset_def)
        {
            if ( $type === $asset_def[0] && $asset_def[4] && !$asset_def[5] )
                $out = array_merge($out, $this->import_asset($asset_def[1]));
        }
        return implode("\n", $out);
    }
    
    public function enqueue( $type, $id, $asset=null, $deps=array() )
    {
        if ( !empty( $type ) && !empty( $id ) )
        {
            if ( isset( $this->_assets[$id] ) ) 
            {
                $this->_assets[$id][4] = true; // enqueued
                // hook here
                $this->trigger("enqueue-asset", array(
                    // $importer, $id,      $type,   $asset
                    $this, $id, $type, $this->_assets[$id][2]
                ))->trigger("enqueue-asset-{$id}", array(
                    // $importer, $id,      $type,   $asset
                    $this, $id, $type, $this->_assets[$id][2]
                ));
            }
            elseif ( !empty( $asset ) ) 
            {
                $this->register("assets", array($type, $id, $asset, $deps));
                $this->_assets[$id][4] = true; // enqueued
                // hook here
                $this->trigger("enqueue-asset", array(
                    // $importer, $id,      $type,   $asset
                    $this, $id, $type, $this->_assets[$id][2]
                ))->trigger("enqueue-asset-{$id}", array(
                    // $importer, $id,      $type,   $asset
                    $this, $id, $type, $this->_assets[$id][2]
                ));
            }
        }
        return $this;
    }
    
    public function get( $path, $opts=array() )
    {
        if ( !empty($opts['binary']) )
        {
            $fp = fopen( $this->path( $path ), "rb" );
            if ( $fp )
            {
                $data = @fread( $fp );
                fclose( $fp );
            }
            else $data = '';
        }
        else
        {
            $data = @file_get_contents( $this->path( $path ) );
        }
        return $data;
    }
    
    public function load( $classname, $path=null, $deps=array() )
    {
        if ( is_array($classname) )
        {
            foreach($classname as $class)
                $this->load( $class );
        }
        else
        {
            if ( !isset( $this->_classes[$classname] ) && !empty($path) )
                $this->register("classes", array($classname, $classname, $this->path($path), $deps));
            if ( isset( $this->_classes[$classname] ) && !$this->_classes[$classname][4] && file_exists( $this->_classes[$classname][2] ) )
                $this->import_class($classname);
        }
        return $this;
    }
}
Importer::$BASE = dirname(__FILE__);
}
