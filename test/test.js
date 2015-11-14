var Importer = require( "../src/js/Importer.js" ), echo = console.log;

echo(Importer.BASE);

var importer = new Importer( __dirname, 'http://_mygit/Importer/test/' );
importer.register("classes", [

 ['Test1',             'Test1',             './classes/Test1.js']
,['Test2',             'Test2',             './classes/Test2.js', ['Test1'], function(){echo('Callback');echo(arguments);}]

]);

importer.importClass('Test2'/*, function( Test2 ){
    echo(Test2());
}*/);

importer.getFile('./classes/Test1.js', function( text ){
    echo( text );
});

importer.register("assets", [

 ['styles', 'asset1', './assets/asset1.css']
,['styles', 'asset2', './assets/asset2.css', ['asset1']]
,['styles', 'asset3', ['/* asset 3 */'], ['asset1','asset2']]

]);
importer.enqueue('styles', 'asset3');
echo(importer.assets('styles'));
