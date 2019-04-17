<?php

class ns_Bar_FooClass extends ns_Foo_FooClass
{
	public function __construct()
	{
		echo 'FooClass'.PHP_EOL;
	}
}
echo 'ns_Bar_FooClass.php' . PHP_EOL;