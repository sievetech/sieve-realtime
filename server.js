/*************** SETUP/ ***************/

var express = require('express')
, app = express()
, server = require('http').createServer(app)
, redis = require('redis').createClient()
, io = require('socket.io').listen(server)
, _ = require ('underscore')
, amqp = require('amqp');

var fila = amqp.createConnection({ host: '50.57.175.89', 'login': 'cdp_stream', 'password': 'a5172d5b6518a96e59e19463b3a6561e'});

app.configure('development', function(){
	server.listen(1337, function(){
		console.log("Listening on port 1337");
	});
//	redis = require("redis").createClient();
//	redis.auth("senha"); 
});

app.configure('production', function(){ 
	server.listen(8080, function(){
		console.log("Listening on port 8080");
	});
//	redis = require("redis").createClient();
//	redis.auth("senha); 
});

/*** /setup ***/


/*************** ROUTES/ ***************/

app.get('/', function(request, response) {
	response.send("Sieve realtime is up!");	
});

/*** /routes ***/


redis.on("error", function (err) {
	console.log("Redis Error " + err);
});


/*** /routes ***/



/*************** QUEUE/ ***************/
fila.addListener('ready', function(){
	console.log("A fila está pronta!");
    var queue = fila.queue('cdp_url_updater', {"passive": true}, function(queue){
        queue.subscribe(function(message){
            console.log("MUDANÇA RECEBIDA: ");
            console.log(message);
            io.sockets.emit('something changed', message);
    	});
	});
});
/*** /queue ***/



/*************** SOCKET.IO/ ***************/

io.on('connection', function(user){	

	//ids é um Array IDs das coisas que ele deve recever
	userInfo = JSON.stringify({ "ids": _.range(1, _.random(0, 1000), _.random(0, 50)) }); 

	console.log("user_id: " + user.id);

	//Adicionamos o usuário na lista de usuários conectados
	redis.hset("rt_connected_users", user.id, userInfo);  	
	 

	user.on('disconnect', function () {
		//Removemos o usuário da lista de usuários conectados	
		console.log("DISCONNECTING... " + user.id)
		redis.hdel("rt_connected_users", user.id);
	});

});

/*** /socket.io ***/