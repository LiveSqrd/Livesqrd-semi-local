var	 _ 			= require('underscore')
	, path 			= require('path')
	, fs 			= require('fs')
	, express		= require('express')
	, app 			= express()
	, server 		= require('http').Server(app)
	, http 			= require('http')
	, https 		= require('https')
	, cli 			= require('commander')
	, lessMiddleware = require('less-middleware')
	, io 			= require('socket.io')(server)
	, ioClient 		= require('socket.io-client')
	, ioWildcard 	= require('socketio-wildcard')
	, options = {};



exports.init = function(){
	cli.version("0.0.1")
		.usage('[options] [file ...]')
		.option("-h, --host <url>","Host name: yourapp.lsq.io")
		.option("-t, --token <token>","Token: token auth")
		.option("-f, --folder [path]","Folder: current path")
		.option("-p, --port [port]","Port: 8000",parseInt)
		.option("-d, --debug ","debug: false")
		.parse(process.argv);
	//console.log(cli.host,cli.port,cli)
	options.port = cli.port || 8000;
	options.host = cli.host;
	options.token = cli.token;
	if(!cli.folder)
		options.folder = process.cwd();
	else if(_.isString(cli.folder) && cli.folder[0] == "/")
		options.folder = cli.folder;
	else 
		options.folder = path.join(process.cwd(),cli.folder)
	options.debug = cli.debug || false;
	if(_.isString(options.host))
		exports.run();
	else 
		console.log("Missing -h host")

}

exports.console = function(){
	if(options.debug)
		console.log(arguments)
}
exports.run = function(){
 

	/* choose which domain we are emulating */
	var mainHOST = options.host;
	app.configure(function(){
		app.set('port', options.port || 8000);
		app.set('views', path.join(options.folder, '/org'));
		app.set('view engine', "jade");
		app.set('view options', { layout: false });

	});
	app.use(express.bodyParser());
	app.use(lessMiddleware(path.join(options.folder, '/org')));
	app.use(express.static(path.join(options.folder ,'/org')));

	var jadeRenderGet = function(req,res){
		var index = req.url.indexOf("?")
		var url   = (index != -1 ) ? req.url.substring(0,index) :req.url;
		url = url.replace(".jade","").replace(".j","").replace(".html","")

		var filePath =  path.join(options.folder ,'/org', url);
		res.render(filePath, function(err, html){
		 	if(err) console.log("get::/jade/render/:file",err)
		 	res.send(html);
		});
	}
	var jadeRenderPost = function(req,res){
		var index = req.url.indexOf("?")
		var url   = (index != -1 ) ? req.url.substring(0,index) :req.url;
		url = url.replace(".jade","").replace(".j","").replace(".html","")

		var filePath =  path.join(options.folder ,'/org', url);
		var info = (_.isString(req.body.data)) ? JSON.parse(req.body.data): req.body.data;
		info= _.isObject(info) ? info: {};
		res.render(filePath,info, function(err, html){
		 	if(err) console.log("post::/jade/render/:file",err)
		 	res.send(html);
		});
	}
	app.get(/^\/jade\/*/,jadeRenderGet)

	app.post(/^\/jade\/*/,jadeRenderPost)

	app.get(/.media\/get/, function(req, res){
		exports.console("forwarding MEDIA GET ",req.originalUrl);
		var request = https.request({
		  hostname: mainHOST,
		  port: 443,
		  path: req.originalUrl,
		  method: 'GET'
		},function(response){
			res.status(response.statusCode);
			_.each(response.headers,function(c,k){ res.set(k,c); });
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
			res.status(response.statusCode);
			_.each(response.headers,function(c,k){ res.set(k,c); });
			response.on('data', function(d) {
				res.write(d);
				buff += d;
			});
			response.on('end',function(data){
				res.end();
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
			res.status(response.statusCode);
			_.each(response.headers,function(c,k){ res.set(k,c); });
			response.on('data', function(d) {
				res.write(d);
				buff += d;
			});
			response.on('end',function(data){
				res.end();
			});
		});
		request.end(JSON.stringify(req.body));
	});

	server.listen(app.get('port') || 80);
	console.log("Running LSQ Local",options.host ,"on port",options.port)
	var socketClient = ioClient(options.host+"?token="+options.token)
	socketClient._onevent = socketClient.onevent;
	socketClient.onevent = function(packet){
		console.log("socketClient",packet,packet.data[0],packet.data[1]);	
		io.sockets.in("all").emit(packet.data[0],packet.data[1])
		socketClient._onevent(packet);
	}
	socketClient.on("connect_error",function(a){
		console.log("socket error",a)
	})
	socketClient.on("start",function(data){
		console.log("sc start",data)
	})
	socketClient.on('connect', function(){
	    socketClient.on('event', function(data){});
	    socketClient.on('disconnect', function(){});
	});
	io.use(function(socket,next){
		//console.log(socket)
		if(!socket._onevent){
			socket._onevent = socket.onevent;
			socket.onevent = function(packet){
				console.log(packet.data[0],packet.data[1]);
				socketClient.emit(packet.data[0],packet.data[1])
				socket._onevent(packet);
			}
		}
		next();
	})

	//io.use(ioWildcard)
	io.on('connection', function (socket) {
		socket.join("all");
		console.log("connect")
		socket.on('disconnect', function () {});
	});

}

//exports.run({host:"www.lsq.io",port:8000})
