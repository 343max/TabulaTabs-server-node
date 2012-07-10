app.namespace('/hello', function() {
    
    app.get('/hello.json', function(req, res) {
        res.send({ 'greeted': 'Hello World!', version: 2 });
    });

    var basicAuth = express.basicAuth('Tester', 'greets');
    app.get('/hello_secure.json', basicAuth, function(req, res) {
        res.send({ 'greeted': 'Hello Tester!' });
    });

});
