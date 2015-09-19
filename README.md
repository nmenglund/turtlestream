# TurtleStream

Slow down streams. Useful for simulating limited bandwidth.

## Example

    var TurtleStream = require('../turtlestream/lib/TurtleStream.js')
    var http = require('http')

    http.createServer(function(req,res){
        var turtle = new TurtleStream({ chunkSize: 1, interval: 50 })
        req.pipe(turtle).pipe(res)
    }).listen(8080)

Test with cURL:

    curl --no-buffer -d 'Hello world!' http://localhost:8080
