<?php
require( '../src/php/Importer.php' );

echo('Importer.VERSION = ' . Importer::VERSION . PHP_EOL);

echo('Importer.BASE = ' . Importer::$BASE . PHP_EOL);

$importer = Importer::_( dirname(__FILE__), 'http://_mygit/Importer/test/' )
    ->register('psr-4', array(
        'Foo\\' => './namespaces/Foo',
        'Bar\\' => dirname(__FILE__) .'/namespaces/Bar'
    ))
    ->register('psr-0', array(
        'ns_' => dirname(__FILE__) .'/namespaces0'
    ))
    ->register('classes', array(
        array('Test1',  'Test1', './classes/Test1.php')
    ))
    ->register_autoload( )
    ->one('import-class-Bar\\FooClass', function($imp, $id, $class, $path){
        print_r(func_get_args());
    })
;


$foo = new Bar\FooClass();
$bar = new ns_Bar_FooClass();
$test = new Test1();