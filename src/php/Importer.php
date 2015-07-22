<?php
/**
*  Importer
*  a simple loader manager for classes and assets with dependencies for PHP, Python, Node/JS
*
*  @version 0.1
*  https://github.com/foo123/Importer
**/
if ( !class_exists('Importer') )
{ 
class Importer
{
    const VERSION = '0.1';
    
    const DS = '/';
    const DS_RE = '/\\/|\\\\/';
    const PROTOCOL = '://';
    const PROTOCOL_RE = '#PROTOCOL#';
    
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
    
    private $classes = null;
    private $assets = null;
    private $base = null;
    private $base_url = null;
    
    public static function _( $base='', $base_url='' )
    {
        return new self( $base, $base_url );
    }
    
    public function __construct( $base='', $base_url='' )
    {
        $this->classes = array( );
        $this->assets = array( );
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
        $this->classes = null;
        $this->assets = null;
        $this->base = null;
        $this->base_url = null;
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
                    if ( !empty( $class ) && !empty( $id ) && !empty( $path ) ) 
                    {
                        $this->classes[ $id ] = array(
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
                        $this->assets[ $id ] = array(
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
            elseif ( 'templates' === $what )
            {
                // support Contemplate templates functionality
                if ( class_exists('Contemplate') )
                {
                    foreach ($defs as $def)
                    {
                        /* 0:id, 1:path, 2:deps */
                        $id = $def[0]; $path = $def[1]; $deps = isset($def[2]) ? $def[2] : array();
                        if ( !empty( $id ) && !empty( $path ) ) 
                        {
                            /*if ( !empty( $deps ) )
                            {
                                foreach((array)$deps as $dep)
                                {
                                    if ( !Contemplate::hasTpl($dep) ) 
                                        Contemplate::add($dep, $this->path("$dep.tpl.html"));
                                }
                            }*/
                            if ( !Contemplate::hasTpl( $id ) ) 
                                Contemplate::add( $id, $this->path( $path ) );
                        }
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
            
            if ( isset( $this->classes[$id] ) && !$this->classes[$id][4] )
            {
                if ( !class_exists( $this->classes[$id][0] ) )
                {
                    $deps = $this->classes[$id][3];
                    if ( !empty( $deps ) )
                    {
                        $needs_deps = false;
                        $numdeps = count($deps);
                        for ($i=$numdeps-1; $i>=0; $i--)
                        {
                            $dep = $deps[$i];
                            if ( isset( $this->classes[$dep] ) && !$this->classes[$dep][4] )
                            {
                                $needs_deps = true;
                                array_unshift( $queue, $dep );
                            }
                        }
                        if ( $needs_deps ) continue;
                        else array_shift( $queue );
                    }
                    $this->classes[$id][4] = true;
                    if ( false === $require ) @include( $this->classes[$id][2] );
                    else require( $this->classes[$id][2] );
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
            if ( isset( $this->assets[$id] ) && $this->assets[$id][4] && !$this->assets[$id][5] ) // enqueued but not loaded yet
            {
                $asset_def =& $this->assets[$id];
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
                        if ( isset( $this->assets[$dep] ) && !$this->assets[$dep][5] )
                        {
                            $this->assets[$dep][4] = true; // enqueued
                            $needs_deps = true;
                            array_unshift( $queue, $dep );
                        }
                    }
                    if ( $needs_deps ) continue;
                    else array_shift( $queue );
                }
                $isStyle = (bool)('styles' === $type);
                $isScript = (bool)('scripts' === $type);
                $isLiteral = is_array($asset);
                if ( $isStyle )
                {
                    $out[] = $isLiteral 
                            ? ("<style id=\"importer-inline-style-{$id}\" type=\"text/css\" media=\"all\">{$asset[0]}</style>")
                            : ("<link id=\"importer-style-{$id}\" type=\"text/css\" rel=\"stylesheet\" href=\"$asset\" media=\"all\" />");
                }
                elseif ( $isScript )
                {
                    $out[] = $isLiteral 
                            ? ("<script id=\"importer-inline-script-{$id}\" type=\"text/javascript\">/*<![CDATA[*/ {$asset[0]} /*]]>*/</script>")
                            : ("<script id=\"importer-script-{$id}\" type=\"text/javascript\" src=\"$asset\"></script>");
                }
                else
                {
                    $out[] = $isLiteral 
                            ? $asset[0]
                            : $asset;
                }
                $asset_def[5] = true; // loaded
            }
            else
            {
                array_shift( $queue );
            }
        }
        return $out;
    }
    
    public function enqueue( $type, $id, $asset=null, $deps=array() )
    {
        if ( !empty( $type ) && !empty( $id ) )
        {
            if ( isset( $this->assets[$id] ) ) 
            {
                $this->assets[$id][4] = true; // enqueued
            }
            elseif ( !empty( $asset ) ) 
            {
                $this->register("assets", array($type, $id, $asset, $deps));
                $this->assets[$id][4] = true; // enqueued
            }
        }
        return $this;
    }
    
    public function assets( $type="scripts" )
    {
        $out = array( );
        $type = strtolower($type);
        foreach ($this->assets as $asset_def)
        {
            if ( $type === $asset_def[0] && $asset_def[4] && !$asset_def[5] )
                $out = array_merge($out, $this->import_asset($asset_def[1]));
        }
        return implode("\n", $out);
    }
    
    public function tpl( $tpl, $path=null, $deps=array() )
    {
        // support Contemplate templates functionality
        if ( class_exists('Contemplate') )
        {
            if ( !empty( $path ) ) 
                $this->register( "templates", array($tpl, $path, $deps) );
            return Contemplate::tpl( $tpl );
        }
        return null;
    }
    
    public function import( $classname, $path=null, $deps=array() )
    {
        if ( !isset( $this->classes[$classname] ) && !empty($path) )
            $this->register("classes", array($classname, $classname, $this->path("$path.php"), $deps));
        if ( isset( $this->classes[$classname] ) && !$this->classes[$classname][4] && file_exists( $this->classes[$classname][2] ) )
            $this->import_class($classname);
        return $this;
    }
    
    public function importAll( $classnames )
    {
        if ( empty($classnames) ) return $this;
        foreach((array)$classnames as $classname) $this->import( $classname );
        return $this;
    }
}
}
