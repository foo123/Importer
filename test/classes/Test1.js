function Test1( )
{
    return 'Test1.js';    
}
console.log ('Test1.js');
if ( "undefined" !== typeof module && module.exports ) module.exports = Test1;