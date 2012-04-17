/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual, notStrictEqual, raises*/
require([
    'path!vendor:underscore',
    'path!vendor:jquery',
    'path!mesh:tests/example'
], function(_, $, Example) {
    module('queries');

    var ajax_failed = function() {
        ok(false, 'ajax request failed');
        start();
    };

    test('construction', function() {
        var query = Example.query(), retval;
        strictEqual(query.manager, Example.models);
        deepEqual(query.params, {});
        strictEqual(query.request.name, 'query');

        retval = query.exclude('alpha', 'beta');
        strictEqual(retval, query);
        deepEqual(query.params.exclude.sort(), ['alpha', 'beta']);

        var filters = {alpha: 'test', beta__in: [1, 2]};
        retval = query.filter(filters);
        strictEqual(retval, query);
        deepEqual(query.params.query, filters);

        retval = query.include('alpha', 'beta');
        strictEqual(retval, query);
        deepEqual(query.params.include.sort(), ['alpha', 'beta']);

        retval = query.limit(2);
        strictEqual(retval, query);
        strictEqual(query.params.limit, 2);

        retval = query.offset(2);
        strictEqual(retval, query);
        strictEqual(query.params.offset, 2);

        retval = query.sort('alpha', '-beta');
        strictEqual(retval, query);
        deepEqual(query.params.sort, ['alpha', '-beta']);

        retval = query.reset();
        strictEqual(retval, query);
        deepEqual(query.params, {});
    });

    asyncTest('count-only request', function() {
        var query = Example.query();
        query.count().then(function(total) {
            strictEqual(total, 0);
            start();
        }, ajax_failed);
    });

    asyncTest('empty result', function() {
        var query = Example.query();
        query.execute().then(function(data) {
            ok(data.complete);
            strictEqual(data.status, 'ok');
            strictEqual(data.total, 0);
            deepEqual(data.resources, []);
            start();
        }, ajax_failed);
    });

    start();
});
