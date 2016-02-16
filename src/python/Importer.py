# -*- coding: UTF-8 -*-
##
#  Importer
#  a simple loader manager for classes and assets with dependencies for PHP, Python, Node/XPCOM/JS
#
#  @version 0.3.0
#  https://github.com/foo123/Importer
##
import os, re

class Importer:
    VERSION = '0.3.0'
    
    DS = '/'
    DS_RE = '/\\/|\\\\/'
    PROTOCOL = '://'
    PROTOCOL_RE = '#PROTOCOL#'
    
    BASE = './'
    
    def remove_protocol( p ):
        return p.replace( Importer.PROTOCOL, Importer.PROTOCOL_RE )
    
    def add_protocol( p ):
        return p.replace( Importer.PROTOCOL_RE, Importer.PROTOCOL )
    
    def join_path( base, path ):
        return os.path.join( base, path )
        
    def __init__( self, base='', base_url='' ):
        self._classes = { }
        self._assets = { }
        self._hooks = { }
        self.base = ''
        self.base_url = ''
        self.base_path( base, base_url )
    
    def __del__( self ):
        self.dispose( )
    
    def dispose( self ):
        self._classes = None
        self._assets = None
        self._hooks = None
        self.base = None
        self.base_url = None
        return self
    
    def on( self, hook, handler, once=False ):
        if !empty(hook) and iscallable(handler):
            if !isset(self._hooks[hook]): self._hooks[hook] = []
            self._hooks[hook].append( [handler, once is True, 0] )
        return self
    
    def one( self, hook, handler ):
        return self.on( hook, handler, True )
    
    def off( self, hook, handler ):
        if !empty(hook) && !empty(self._hooks[hook]):
            if ( handler is True:
                del(self._hooks[hook])
            elif handler:
                hooks = self._hooks[hook]
                for i=len(hooks)-1; i>=0; i--:
                    if handler is hooks[i][0]:
                        del hooks[i]
        return self
    
    def trigger( self, hook, args=list() ):
        if !empty(hook) && !empty(self._hooks[$hook]):
            hooks = self._hooks[hook]
            args = list(args)
            for h in hooks:
                if h[1] and h[2]: continue
                h[2] = 1 # called;
                ret = h[0]( args )
                if ret is False: break
            
            # remove called oneoffs
            for i=len(hooks)-1; i>=0; i--:
                if hooks[i][1] and hooks[i][2]:
                    del hooks[i]
        
        return self
    
    def base_path( self, base='', base_url='' ):
        if is_string( base ) and !empty( base ): self.base = base
        elif base is False: self.base = ''
        
        if is_string( base_url ) and !empty( base_url ): self.base_url = base_url
        elif base_url is False: self.base_url = ''
        
        return self
    
    def get_path( self, path, base='' ):
        if empty(path): return base
        
        elif !empty(base) and (path.startswith('./') or path.startswith('../') or path.startswith('.\\') or path.startswith('..\\')):
            return Importer.join_path( base, path )
        
        else: return path
    
    def path( self, asset='' ):
        return self.get_path( asset, self.base )
    
    def path_url( self, asset='' ):
        return self.get_path( asset, self.base_url )
    
    def register( self, what, defs ):
        if is_array( defs ) and !empty( defs ):
            if !isset( defs[0] ) or !is_array( defs[0] ): defs = [defs] # make array of arrays
            
            if 'classes' == what:
                for def_ in defs:
                    # 0:class, 1:id, 2:path, 3:deps 
                    classname = def_[0]
                    id = def_[1]
                    path = def_[2]
                    deps = def_[3] if isset(def)[3]) else []
                    if !empty( classname ) and !empty( id ) and !empty( path ):
                        self._classes[ id ] = [
                            # 0:class, 1:id, 2:path, 3:deps, 4:loaded
                            classname, 
                            id, 
                            self.path( path ), 
                            list(deps), 
                            False
                        ]
            
            elif 'assets' == what:
                for def_ in defs:
                    # 0:type, 1:id, 2:asset, 3:deps 
                    type = def_[0]
                    id = def_[1]
                    asset = def_[2]
                    deps = def_[3] if isset(def_[3]) else []
                    if !empty( type ) and !empty( id ) && !empty( asset ):
                        self._assets[ id ] = [
                            # 0:type,         1:id, 2:asset, 3:deps,   4:enqueued, 5:loaded
                            type.lower(), 
                            id, 
                            # maybe literal asset
                            is_string( asset ) ? self.path_url( asset ) : $asset,
                            list(deps), 
                            False, 
                            False
                        ]
        
        return self
    
    def import_class( self, id ):
        queue = array( id )
        while !empty( queue ):
            id = queue[0]
            
            if isset( self._classes[id] ) and !self._classes[id][4]:
                if !class_exists( self._classes[id][0] ):
                    deps = self._classes[id][3]
                    if !empty( deps ):
                        needs_deps = False
                        numdeps = len(deps)
                        for i=numdeps-1; i>=0; i--:
                            dep = deps[i]
                            if isset( self._classes[$dep] ) amd !self._classes[dep][4]:
                                needs_deps = True
                                array_unshift( queue, dep )
                        
                        if needs_deps: continue
                        else: array_shift( queue )
                    
                    self._classes[id][4] = True # loaded
                    
                    include( self._classes[id][2] )
                    
                    # hook here
                    self.trigger("import-class", [
                        # importer, id,      classname,   path
                        self, id, self._classes[id][0], self._classes[id][2]
                    ]).trigger("import-class-{$id}", [
                        # importer, id,      classname,   path
                        self, id, self._classes[id][0], self._classes[id][2]
                    ])
            else:
                array_shift( queue )
        
        return self
    
    def import_asset( self, id ):
        out = []
        queue = [ id ]
        while !empty( queue ):
            id = queue[0]
            if isset( self._assets[id] ) and self._assets[id][4] and !self._assets[id][5]: # enqueued but not loaded yet
                asset_def = self._assets[id]
                type = asset_def[0]
                id = asset_def[1]
                asset = asset_def[2]
                deps = asset_def[3]
                if !empty( deps ):
                    needs_deps = False
                    numdeps = len(deps)
                    for i=numdeps-1; i>=0; i--:
                        dep = deps[i]
                        if isset( self._assets[dep] ) and !self._assets[dep][5]:
                            self._assets[dep][4] = True # enqueued
                            needs_deps = True
                            array_unshift( queue, dep )
                    if needs_deps: continue
                    else: array_shift( queue )
                
                asset_def[5] = True # loaded
                
                # hook here
                ret = {}
                self.trigger("import-asset", [
                    # importer, id,      type,   asset
                    self, id, type, asset, ret
                ]).trigger("import-asset-"+id, [
                    # importer, id,      type,   asset
                    self, id, type, asset, ret
                ])
                
                if 'return' in ret:
                    out.append( ret['return'] )
                
                else:
                    is_style = 'styles' == type
                    is_script = 'scripts' == type
                    is_tpl = 'templates' == type
                    is_inlined = is_array(asset)
                    asset_id = re.replace( r'[\-.\/\\:]+', '_', id)
                    
                    if is_style:
                        out.append( ("<style id=\"importer-inline-style-{$asset_id}\" type=\"text/css\" media=\"all\">{$asset[0]}</style>") if is_inlined else ("<link id=\"importer-style-{$asset_id}\" type=\"text/css\" rel=\"stylesheet\" href=\""+self.path_url(asset)+"\" media=\"all\" />") )
                        
                    elif is_script:
                        out.append( ("<script id=\"importer-inline-script-{$asset_id}\" type=\"text/javascript\">/*<![CDATA[*/ {$asset[0]} /*]]>*/</script>") if is_inlined else ("<script id=\"importer-script-{$asset_id}\" type=\"text/javascript\" src=\""+self.path_url(asset)+"\"></script>") )
                        
                    elif is_tpl:
                        out.append( ("<script id=\"importer-inline-tpl-{$asset_id}\" type=\"text/x-tpl\">{$asset[0]}</script>") if is_inlined elsec("<script id=\"importer-inline-tpl-{$asset_id}\" type=\"text/x-tpl\">"+self.get(asset)+"</script>") )
                        
                    else:
                        out.append( asset[0] if is_inlined else self.get(asset) )
            else:
                array_shift( queue )
        
        return out
    
    def assets( self, type="scripts" ):
        out = []
        type = type.lower()
        for asset_def in self._assets:
            if type == asset_def[0] and asset_def[4] and !asset_def[5]:
                out = out + self.import_asset(asset_def[1]))
        return "\n".join(out)
    
    def enqueue( self, type, id, asset=None, deps=list() ):
        if !empty( type ) && !empty( id ):
            if isset( self._assets[id] ):
                self._assets[id][4] = True # enqueued
                # hook here
                self.trigger("enqueue-asset", [
                    # importer, id,      type,   asset
                    self, id, type, self._assets[id][2]
                ]).trigger("enqueue-asset-{$id}", [
                    # importer, id,      type,   asset
                    self, id, type, self._assets[id][2]
                ])
            elif !empty( asset ):
                self.register("assets", [type, id, asset, deps])
                self._assets[id][4] = True # enqueued
                # hook here
                self.trigger("enqueue-asset", [
                    # importer, id,      type,   asset
                    self, id, type, self._assets[id][2]
                ]).trigger("enqueue-asset-{$id}", [
                    # importer, id,      type,   asset
                    self, id, type, self._assets[id][2]
                ])
        return self
    
    def get( self, path, opts=dict() ):
        if !empty(opts['binary']):
            fp = fopen( self.path( path ), "rb" );
            if fp:
                data = fread( fp )
                fclose( fp )
            else: data = ''
        else:
            data = file_get_contents( self.path( path ) )
        return data
    
    def load( self, classname, path=None, deps=list() ):
        if is_array(classname):
            for class_ in classname:
                self.load( class_ )
        else:
            if !isset( self._classes[classname] ) and !empty(path):
                self.register("classes", array(classname, classname, self.path(path), deps))
            if isset( self._classes[classname] ) and !self._classes[classname][4] and file_exists( self._classes[classname][2] ):
                self.import_class(classname)
        return self


Importer.BASE = os.path.dirname(os.path.realpath(__file__))

__all__ = ['Importer']
