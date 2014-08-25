var	 _ 			= require('underscore')
		, path 			= require('path')
		, fs 			= require('fs')
		, express		= require('express')
		, http 			= require('http')
		, https 		= require('https')
		, lessMiddleware = require('less-middleware')
		, options = {};
console.log(process.argv)
// process.argv.forEach(function (val, index, array) {
//   if(index == 0 && val=="node")
//   	console.log(node)
//   console.log(index + ': ' + val);

// });
exports.console = function(){
	if(options.debug)
		console.log(arguments)
}
exports.run = function(options){
 
		

	var app = express();

	/* choose which domain we are emulating */
	var mainHOST = options.host;

	app.set('port', options.port || 80 );
	app.use(express.bodyParser());
	app.use(lessMiddleware(path.join(__dirname, '/org')));
	app.use(express.static(__dirname + '/org'));
	app.set('views', __dirname + '/org/jade');
	app.set('view engine', 'jade');

	app.get(/^\/jade\/*/,function(req,res){
		var url = req.url;
		url = url.replace("/jade/","");
		res.render(url+".jade", function(err, html){
		 	if(err) console.log("getd::/jade/render/:file",err)
		 	res.send(html);
		});
	})

	app.get(/.media\/get/, function(req, res){
		console.log("forwarding MEDIA GET "+req.originalUrl);
		var request = https.request({
		  hostname: mainHOST,
		  port: 443,
		  path: req.originalUrl,
		  method: 'GET'
		},function(response){
			response.on('data', function(d) {
				res.write(d);
			});
			response.on('end',function(data){
				res.end();
			});
		});

		request.end();
	});

	app.get(/.*/, function(req, res){
		exports.console("forwarding GET "+req.originalUrl);
		var headers = req.headers;
		headers.host = mainHOST;
		delete headers["accept-encoding"];
		var buff = ""
		var request = https.request({
		  hostname: mainHOST,
		  port: 443,
		  path: req.originalUrl,
		  method: 'GET',
		  headers: headers
		},function(response){
			response.on('data', function(d) {
				buff += d;
			});
			response.on('end',function(data){
				_.each(response.headers,function(c,k){ res.set(k,c); });
				res.end(buff);
			});
		});
		request.end();
	});

	app.post(/.*/, function(req, res){
		exports.console("forwarding POST "+req.originalUrl,headers);
		var headers = req.headers;
		delete headers["accept-encoding"];
		headers.host = mainHOST;
		var buff = ""
		var request = https.request({
		  hostname: mainHOST,
		  port: 443,
		  path: req.originalUrl,
		  method: 'POST',
		  headers: headers
		},function(response){
			response.on('data', function(d) {
				buff += d;
			});
			response.on('end',function(data){
				res.status(response.statusCode);
				_.each(response.headers,function(c,k){ res.set(k,c); });
				res.end(buff);
			});
		});
		request.end(JSON.stringify(req.body));
	});

	app.listen(app.get('port') || 80);
	console.log('Running LSQ Local.')

}

exports.run({host:"www.lsq.io",port:8000})
