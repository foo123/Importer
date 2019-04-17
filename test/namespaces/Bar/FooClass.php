<?php
namespace Bar;

use Foo\FooClass as BaseFoo;

class FooClass extends BaseFoo
{
	public function __construct()
	{
		echo 'FooClass'.PHP_EOL;
	}
}
echo 'Bar\\FooClass.php' . PHP_EOL;