function Test2( )
{
    return 'Test2.js';
}
console.log ('Test2.js');
if ( "undefined" !== typeof module && "object" === typeof exports ) exports.Test2 = Test2;