<?php
require( '../src/php/Importer.php' );

echo('Importer.VERSION = ' . Importer::VERSION . PHP_EOL);

echo('Importer.BASE = ' . Importer::$BASE . PHP_EOL);

$importer = Importer::_( dirname(__FILE__), 'http://_mygit/Importer/test/' )
    ->register('namespaces', array(
        'Foo\\' => dirname(__FILE__) .'/namespaces/Foo',
        'Bar\\' => dirname(__FILE__) .'/namespaces/Bar'
    ))
    ->register_autoload( )
;


$foo = new Bar\FooClass();