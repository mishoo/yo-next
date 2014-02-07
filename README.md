# Yo.next()

A lite “syntactic sugar” for your OO / monkey-patching needs.  There are many tools like it, but this one is mine.  It's not the first one I write, and perhaps not the last.  But it's small and cute so I thought I'd leave it here.

## Usage by examples

### Plain JavaScript

```js
function Foo(x) {
  this.foo = x.foo;
}

Foo.prototype.print = function(prefix, suffix) {
  console.log("In Foo: " + prefix + this.foo + suffix);
};

function Bar(x) {
  Foo.apply(this, arguments);
  this.bar = x.bar;
}

Bar.prototype = Object.create(Foo.prototype);

Bar.prototype.print = function(prefix, suffix) {
  Foo.prototype.print.apply(this, arguments);
  console.log("In Bar: " + prefix + this.bar + suffix);
};
```

### Yo

```js
var Foo = function(x) {
  this.foo = x.foo;
};

Foo.define("print", function(prefix, suffix){
  console.log("In Foo: " + prefix + this.foo + suffix);
});

var Bar = Foo.extend(function(x){
  // base class constructor is called automatically
  this.bar = x.bar;
});

//                           ↓↓ notice the name
Bar.define("print", function Yo(prefix, suffix){
  // with Yo.next() you don't need to name the base class,
  //                      or method, object, or arguments
  Yo.next();
  console.log("In Bar: " + prefix + this.bar + suffix);
});
```

But in this particular case where we want to call the base class first, you can do the following:

```js
Bar.after("print", function(prefix, suffix){
  console.log("In Bar: " + prefix + this.bar + suffix);
});
```

There's a `before` too which does what you imagine.

### Changing arguments that go to the base class' method

By default, `Yo.next()` supplies the arguments itself.  However, if you need to specify different arguments to the base class method, you can just pass them:

```js
Bar.define("print", function Yo(prefix, suffix){
  Yo.next(suffix, prefix); // tricked it!
  console.log("In Bar: " + prefix + this.bar + suffix);
});
```

You cannot supply a different object though; I'm not sure that would be useful.

### But wait, that's still ugly

If you need to define multiple methods, you can just pass a hash to `define` / `after` / `before`:

```js
Bar.define({
  print: function Yo(){ ... },
  someOtherMethod: function Yo(){ ... },
  ...
}).before({
  print: function (){
    console.log("This runs before every other `print` methods");
  }),
  ... // more "before" methods
}).after({
  print: function (){
    console.log("This runs after every other `print` methods");
  }),
  ... // more "after" methods
});
```

Incidentally note that they all return the constructor so you can do the dot-chaining that all JS devs are in love with.

### Wait, can we define *multiple* before/after methods?

Yep, we can.  And the order in which we define them is, of course, important.

```js
function Foo(){}
Foo.define("print", function(){
  console.log("The original print");
});
Foo.before("print", function(){
  console.log("The first 'before'");
});
Foo.before("print", function(){
  console.log("The second 'before'");
});
Foo.after("print", function(){
  console.log("The first 'after'");
});
Foo.after("print", function(){
  console.log("The second 'after'");
});
new Foo().print();
```

The output is:

    The second 'before'
    The first 'before'
    The original print
    The first 'after'
    The second 'after'

### The `around` methods

`before` and `after` are actually implemented in terms of `around`. `around` is similar to `define`, but not exactly the same.  `define` will overwrite an existing method if one is already present in the prototype that you are operating on.  Continuing the example above:

```js
Foo.define("print", function(){
  console.log("Tadaaaa");
});
new Foo().print(); // just outputs Tadaaaa, all the before/afters are gone
```

However, if we did:

```js
Foo.around("print", function Yo(){
  console.log("<WRAPPING>");
  Yo.next();
  console.log("</WRAPPING>");
});
new Foo().print();
```

the output would have been:

    <WRAPPING>
    The second 'before'
    The first 'before'
    The original print
    The first 'after'
    The second 'after'
    </WRAPPING>

Once defined, you cannot remove an individual `around` method (except by using `define` which removes them all).  Perhaps a better example for `around` is the following.  Let's say we wanted to make the Array's `join` function use a dash by default (instead of a comma) if no separator is provided. Here's the code:

```js
Array.around("join", function Yo(sep) {
  return Yo.next(sep || "-");
});

console.log([ 1, 2, 3, 4 ] + "");   // prints 1-2-3-4
```

So the difference between `define` and `around` is that the first overwrites, while the second wraps.  You almost always want to call `Yo.next()` in an `around` method.

The equivalent of the above code in plain JS would be:

```js
(function(prev_join){
  Array.prototype.join = function(sep) {
    return prev_join.call(this, sep || "-");
  };
})(Array.prototype.join);
```

### One last thing: what if I *don't* want to call the base class constructor?

The `extend` method will define a constructor that calls the base class automatically before doing anything else.  If you need more control over that, there's a `derive` method which works exactly the same, but you can use `Yo.next()` to call the base class constructor whenever you prefer:

```js
var Bar = Foo.derive(function Yo(x){
  x.foo = "Bar was here";
  Yo.next();
  // or we could have said
  // Yo.next({ foo: "Bar was here" });
  this.bar = x.bar;
});
```

## Summary

This library augments Function objects with the following methods:

- `F.extend(ctor, ext)`: create a new object that inherits from this one and calls the base class constructor automatically.  The optional `ext` object will be passed to `define`, if present.

- `F.derive(ctor, ext)`: like `extend` but it doesn't call the base class constructor.  You can call it with `Yo.next()` (supply arguments to override them).

- `define(key, val)`: define a method, or a property of the prototype (if `val` is not a function).  Optionally pass an object mapping property names to definitions.

- `before(name, impl)` or `after(name, impl)`: declare code that must be run before (or after) the named method executed.  Again, this can take an object to define multiple methods at once.

- `around(name, impl)`: declare code that must wrap a method.  Again, it can take an object instead of `name` for multiple definitions.

All of them return the current constructor, so you can chain calls.

## What's with the "Yo"?

The simplest implementation would be to have a `call_next` global variable that's always pointing at the next available method. Maintaining it is not a big deal, but I wanted to avoid the global. Options were:

- insert and maintain the `call_next` method in the object itself.  I didn't like the idea because it involved modifying the object.

- pass a wrapper object to these methods, containing the original object and the `call_next` method.  Dismissed because I'd like `this` to point to the real thing.

- pass `call_next` as an argument.  Again dismissed because of the headache to keep track of another argument in all these methods.

So it occurred to me that the `call_next` can actually be a property of the very function that you pass to `define`/`around`.  The only requirement, to be able to access it, is that you have to give it a name (or use `arguments.callee`, but that's long and out of fashion and won't work under `"use strict"`).

You don't have to name it `Yo`, but that's the first name that crossed my mind.
