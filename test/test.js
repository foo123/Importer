var Importer = require( '../src/js/Importer.js' ), echo = console.log;

echo('Importer.VERSION = ' + Importer.VERSION);

echo('Importer.BASE = ' + Importer.BASE);

var importer = Importer( __dirname, 'http://_mygit/Importer/test/' )
    .register('classes', [

     ['Test1',             'Test1',             './classes/Test1.js']

    ]/*global ctx*/)
    .register('classes', [

    ['Test2',             'Test2',             './classes/Test2.js', ['Test1']]

    ], 'my-ctx')
    .register('assets', [

     ['styles', 'asset1', './assets/asset1.css']
    ,['styles', 'asset2', './assets/asset2.css', ['asset1']]

    ]/*global ctx*/)
    .register('assets', [

    ['styles', 'asset3', ['/* asset 3 */'], ['asset1','asset2']]

    ], 'my-ctx')
    .on('import-class-Test2', function( ){
        echo('Callback');
        echo(arguments);
    }, 'my-ctx')
;

importer.load('Test2', function( Test2 ){
    echo(Test2());
}, 'my-ctx');

importer.get('./classes/Test1.js', function( text ){
    echo( text );
});

importer.enqueue('styles', 'asset3', 'my-ctx');
echo(importer.assets('styles', 'my-ctx'));
