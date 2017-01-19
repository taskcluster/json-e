suite('Parameterize', function() {
  var assume = require('assume');
  var parameterize = require('../lib/index.js');

  suite('non deep property access', function() {
    test('with property access', function() {
      var template = {id: '{{ clientId }}'};
      var context = {clientId: '123'};
      assume(parameterize(template, context)).deep.equals({id: '123'});
    });

    test('with array access', function() {
      var template = {id: '{{ $arr(0) }}', name: '{{ $arr(2) }}', count: '{{ $arr(1) }}'};
      var context = {arr: ['123', 248, 'doodle']};
      assume(parameterize(template, context)).deep.equals({id: '123', name: 'doodle', count: '248'}); 
    });

    test('function evaluation', function() {
      var template = {
        name: '{{ func("jim") }}',
        username: '{{ func(a) }}',
      };
      var context = {
        a: 'foobar',
        func: function(value) {
          return value;
        },
      };
      assume(parameterize(template, context)).deep.equals({name: 'jim', username: 'foobar'});
    });

    test('Modify string', function() {
      var template = {
        key1:     '{{ toUpper( "hello world") }}',
        key2:     '{{  toLower(toUpper("hello world"))   }}',
        key3:     '{{   toLower(  toUpper(  text))  }}',
      };
      var context = {
        toUpper: function(text) {
          return text.toUpperCase();
        },
        toLower: function(text) {
          return text.toLowerCase();
        },
        text: 'hello World',
      };
      var output = {
        key1:     'HELLO WORLD',
        key2:     'hello world',
        key3:     'hello world',
      };
      assume(parameterize(template, context)).deep.equals(output);
    });

    test('do not evaluate numbers', function() {
      let template = {a: {b: 1}};
      let context = {};
      assume(parameterize(template, context)).deep.equals(template);
    });

    test('do no evaluate simple strings', function() {
      let template = {a: {b: '1'}};
      let context = {};
      assume(parameterize(template, context)).deep.equals(template);
    });
  });

  suite('deep propert access', function() {
    test('with deep array access', function() {
      var template = {image_version: '{{task.$images(0).$versions(0)}}', name: '{{task.$images(0).name}}'};
      var context = {
        task: {
          images: [{versions: ['12.10'], name: 'ubuntu'}],
        },
      };
      assume(parameterize(template, context)).deep.equals({image_version: '12.10', name: 'ubuntu'});
    });
  });

  suite('non parameterized json template', function() {
    test('empty template', function() {
      var template = {};
      var context = {};
      assume(parameterize(template, context)).deep.equals({});
    });

    test('non parameterized template', function() {
      var template = {a: {b: {c: {d: 1}}}};
      var context = {};
      assume(parameterize(template, context)).deep.equals(template);
    });
  });

  suite('constructs', function() {
    test('if -> then non-deep', function() {
      var template = {
        a: {
          $if: '${ 1 < 2 }',
          $then: 'a',
          $else: 'b',
        },
      };
      var context = {};
      assume(parameterize(template, context)).deep.equals({a: 'a'});
    });

    test('if -> else non-deep', function() {
      var template = {
        a: {
          $if: '${ 1 > 2 }',
          $then: 'a',
          $else: 'b',
        },
      };
      var context = {};
      assume(parameterize(template, context)).deep.equals({a: 'b'});
    });

    test('if -> then deep', function() {
      var template = {
        b: {a: {
          $if: '${ 1 < 2 }',
          $then: 'a',
          $else: 'b',
        }},
      };
      var context = {};
      assume(parameterize(template, context)).deep.equals({b : {a: 'a'}});
    });

    test('if -> else deep', function() {
      var template = {
        b: {a: {
          $if: '${ 1 > 2 }',
          $then: 'a',
          $else: 'b',
        }},
      };
      var context = {};
      assume(parameterize(template, context)).deep.equals({b: {a: 'b'}});
    });

    test('switch with only one option', function() {
      var template = {
        a: {
          $switch: '{{ "case" + a }}',
          case1: 'foo',
        }};
      var context = {a: '1'};
      assume(parameterize(template, context)).deep.equals({a: 'foo'});
    });

    test('switch with multiple options', function() {
      var template = {
        a: {
          $switch: '{{ "case" + b }}',
          case1: 'foo',
          case2: 'bar',
        }};
      var context = {a: '1', b: '2'};
      assume(parameterize(template, context)).deep.equals({a: 'bar'});
    });

    test('eval with multiple function evaluations', function() {
      var template = {
        value: [
          {$eval: '${ func(0) }'},
          {$eval: '${ func(0) }'},
          {$eval: '${ func(-1) }'},
          {$eval: '${ func(-2) }'},
          {$eval: '${ func(0) }'},
          {$eval: '${ func(0) }'},
          {$eval: '${ func(0) }'},
          {$eval: '${ func(0) }'},
          {$eval: '${ func(0) }'},
          {$eval: '${ func(1+1) }'},
        ],
      };
      var i = 0;
      var context = {
        func:  function(x) { i += 1; return x + i; },
      };
      var output = {
        value: [1, 2, 2, 2, 5, 6, 7, 8, 9, 12],
      };
      assume(parameterize(template, context)).deep.equals(output);
    });

    test('nested if (then --> then) construct', function() {
      var template = {
        val: {
          $if: '${ key1 > key2 }',
          $then: {
            b: {
              $if: '${ key3 > key4 }',
              $then: '{{ foo }}',
              $else: '{{ bar }}',
            },
          },
          $else: {b: 'failed'},
        },
      };

      var context = {key1: 2, key2: 1, key3: 4, key4: 3, foo: 'a', bar: 'b'};
      assume(parameterize(template, context)).deep.equals({val: {b: 'a'}});
    });

    test('nested if (else --> else) construct', function() {
      var template = {
        val: {
          $if: '${ key1 < key2 }',
          $else: {
            b: {
              $if: '${ key3 < key4 }',
              $then: '{{ foo }}',
              $else: '{{ bar }}',
            },
          },
          $then: {b: 'failed'},
        },
      };

      var context = {key1: 2, key2: 1, key3: 4, key4: 3, foo: 'a', bar: 'b'};
      assume(parameterize(template, context)).deep.equals({val: {b: 'b'}});
    });

    test('nested if (then --> else) construct', function() {
      var template = {
        val: {
          $if: '${ key1 > key2 }',
          $then: {
            b: {
              $if: '${ key3 < key4 }',
              $then: '{{ foo }}',
              $else: '{{ bar }}',
            },
          },
          $else: {b: 'failed'},
        },
      };

      var context = {key1: 2, key2: 1, key3: 4, key4: 3, foo: 'a', bar: 'b'};
      assume(parameterize(template, context)).deep.equals({val: {b: 'b'}});
    });

    test('nested if (else --> then) construct', function() {
      var template = {
        val: {
          $if: '${ key1 < key2 }',
          $else: {
            b: {
              $if: '${ key3 > key4 }',
              $then: '{{ foo }}',
              $else: '{{ bar }}',
            },
          },
          $then: {b: 'failed'},
        },
      };

      var context = {key1: 2, key2: 1, key3: 4, key4: 3, foo: 'a', bar: 'b'};
      assume(parameterize(template, context)).deep.equals({val: {b: 'a'}});
    });

    test('nested if (else --> then ---> else) construct', function() {
      var template = {
        val: {
          $if: '${ key1 < key2 }',
          $else: {
            b: {
              $if: '${ key3 > key4 }',
              $then: {
                c: {
                  $if: '${ key5 < key6 }',
                  $then: 'abc',
                  $else: '{{ bar }}',
                },
              },
              $else: 'follow',
            },
          },
          $then: {b: 'failed'},
        },
      };

      var context = {key1: 2, key2: 1, key3: 4, key4: 3, key5: 6, key6: 5, foo: 'a', bar: 'b'};
      assume(parameterize(template, context)).deep.equals({val: {b: {c: 'b'}}});
    });

    test('if ($then) with ${ expression }', function() {
      var template = {
        a: {
          b: {
            $if: '${ 2 < 3 }',
            $then: '${ one() }',
            $else: '${ two() }',
          }}};
      var context = {
        one: () => 1,
        two: () => 2,
      };
      assume(parameterize(template, context)).deep.equals({a:{b:1}});
    });

    test('if (else) with ${ expression }', function() {
      var template = {
        a: {
          b: {
            $if: '${ 2 < 3 }',
            $then: '${ one() }',
            $else: '${ two() }',
          }}};
      var context = {
        one: () => 1,
        two: () => 2,
      };
      assume(parameterize(template, context)).deep.equals({a:{b:1}});
    });

    test('simple $eval with simple value', function() {
      var template = {a: {b: {$eval: '1'}}};
      var context = {
        one: () => 1,
        two: () => 2,
      };
      assume(parameterize(template, context)).deep.equals({a:{b:'1'}});
    });

    test('simple $eval with ${ expression }', function() {
      var template = {a: {b: {$eval: '${ one() }'}}};
      var context = {
        one: () => 1,
        two: () => 2,
      };
      assume(parameterize(template, context)).deep.equals({a:{b:1}});
    });

    test('switch case where case is an object', function() {
      var template = {
        a: {
          $switch: '{{ "case" + a }}',
          caseA: {b:1},
        }};
      var context = {a: 'A'};
      assume(parameterize(template, context)).deep.equals({a: {b: 1}});
    });

    test('switch case where case is an eval statement', function() {
      var template = {
        a: {
          $switch: '{{ "case" + a }}',
          caseA: '${ a }',
        }};
      var context = {a: 'A'};
      assume(parameterize(template, context)).deep.equals({a: 'A'});
    });
  });
});
