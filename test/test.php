<?php
require( "../src/php/Importer.php" );

echo('Importer.VERSION = ' . Importer::VERSION . PHP_EOL);

echo('Importer.BASE = ' . Importer::$BASE . PHP_EOL);

function console_log()
{
    $args = func_get_args();
    echo ('Callback'.PHP_EOL);
    print_r($args);
}

$importer = Importer::_( dirname(__FILE__), 'http://_mygit/Importer/test/' )
    ->register("classes", array(

     array('Test1',             'Test1',             './classes/Test1.php')
    ,array('Test2',             'Test2',             './classes/Test2.php', array('Test1'))

    ))
    ->register("assets", array(

     array('styles', 'asset1', './assets/asset1.css')
    ,array('styles', 'asset2', './assets/asset2.css', array('asset1'))
    ,array('styles', 'asset3', array('/* asset 3 */'), array('asset1','asset2'))

    ))
    ->on('import-class-Test2', 'console_log')
;


$importer->load('Test2');

echo $importer->get('./classes/Test1.php') . PHP_EOL;
$importer->enqueue('styles', 'asset3');
echo($importer->assets('styles'));
