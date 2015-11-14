<?php
require( "../src/php/Importer.php" );

echo(Importer::$BASE . PHP_EOL);

$importer = new Importer( dirname(__FILE__), 'http://_mygit/Importer/test/' );
$importer->register("classes", array(

 array('Test1',             'Test1',             './classes/Test1.php')
,array('Test2',             'Test2',             './classes/Test2.php', array('Test1'))

));


$importer->importClass('Test2');

echo $importer->getFile('./classes/Test1.php') . PHP_EOL;

$importer->register("assets", array(

 array('styles', 'asset1', './assets/asset1.css')
,array('styles', 'asset2', './assets/asset2.css', array('asset1'))
,array('styles', 'asset3', array('/* asset 3 */'), array('asset1','asset2'))

));
$importer->enqueue('styles', 'asset3');
echo($importer->assets('styles'));
