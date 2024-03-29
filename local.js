var	 _ 			= require('underscore')
	, path 			= require('path')
	, fs 			= require('fs')
	, express		= require('express')
	, http 			= require('http')
	, https 		= require('https')
	, cli 			= require('commander')
	, lessMiddleware = require('less-middleware')
	, options = {};



exports.init = function(){
	cli.version("0.0.1")
		.usage('[options] [file ...]')
		.option("-h, --host <url>","Host name: yourapp.lsq.io")
		.option("-p, --port [port]","Port: 8000",parseInt)
		.option("-d, --debug ","debug: false")
		.parse(process.argv);
	//console.log(cli.host,cli.port,cli)
	options.port = cli.port || 8000;
	options.host = cli.host;
	options.folder = cli.folder || __dirname;
	options.debug = cli.debug || false;
	if(_.isString(options.host))
		exports.run();
	else 
		console.log("Missing -h host")

}
// process.argv.forEach(function (val, index, array) {
//   if(index == 0 && val=="node")
//   	console.log(node)
//   console.log(index + ': ' + val);

// });
exports.console = function(){
	if(options.debug)
		console.log(arguments)
}
exports.run = function(){
 
//	console.log(options)
//	console.log(path.join(__dirname, '/org'),path.join(__dirname, '/org'))
	var app = express();

	app.configure(function(){
		app.set('port', options.port || 8000);
		app.set('views', path.join(__dirname, '/org'));
		app.set('view engine', "jade");
		app.set('view options', { layout: false });

	});
	app.use(express.bodyParser());
	app.use(lessMiddleware(path.join(__dirname, '/org')));
	app.use(express.static(path.join(__dirname,'/org')));

	app.get(/^\/jade\/*/,function(req,res){
		var url = req.url;
		url = url.replace("/jade/","");
		res.render(url+".jade", function(err, html){
		 	if(err) console.log("getd::/jade/render/:file",err)
		 	res.send(html);
		});
	})

	app.get(/.media\/get/, function(req, res){
		exports.console("forwarding MEDIA GET ",req.originalUrl);
		var request = https.request({
		  hostname: options.host,
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
		headers.host = options.host;
		delete headers["accept-encoding"];
		var buff = ""
		var request = https.request({
		  hostname: options.host,
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
		headers.host = options.host;
		var buff = ""
		var request = https.request({
		  hostname: options.host,
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
	console.log("Running LSQ Local",options.host ,"on port",options.port)

}

//exports.run({host:"www.lsq.io",port:8000})
