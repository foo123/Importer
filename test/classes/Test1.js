function Test1( )
{
    return 'Test1.js';    
}
console.log ('Test1.js');
if ( "undefined" !== typeof module && "object" === typeof exports ) exports.Test1 = Test1;