//todo: Ser tudo que foi feito agora no namespace "/me". 
// O namespace "" tem que ser generico pra passar tanto pro usuário quanto pra quando formos conectar direto pra receber categorias, artefatos e marcas

/*************** SETUP/ ***************/

var express = require('express')
, app = express()
, server = require('http').createServer(app)
, redis = require('redis').createClient()
, io = require('socket.io').listen(server)
, _ = require ('underscore')
, amqp = require('amqp');

//todo: conectar-se na fila real
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
	console.log("Redis error: " + err);
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
            //todo: filtrar aqui pra quais usuários devemos mandar esse update. Somente aqueles que se interessarem pelo ID do produto.
            //mandar pro canal da categoria, artefato e marca.
    	});
	});
});

/*** /queue ***/



/*************** SOCKET.IO/ ***************/

io.on('connection', function(user){	

	io.sockets.socket(user.id).emit('user infos', null, function (data) {
		user_id = data.id;
		user_sent_key = data.key;
		fake();
		//Autentica o usuário checando se a key que ele disse é a mesma do Redis
	    redis.get("user_key:" + user_id, function (err, obj) {	
	    	
	    	obj = JSON.parse(obj); 

	    	if (obj === user_sent_key) {
		    	console.log("PASSOU");

		    	//Adiciona o usuário como online, com os produtos dele	    	
		    	redis.hget("user_data", user_id, function (err, obj) {
					obj = JSON.parse(obj);

					//"products" é um Array IDs das coisas que ele deve receber				
					userData = JSON.stringify({ 
						"products": obj.products
					});

					//Adicionamos o usuário na lista de usuários conectados
					redis.hset("online_users", user.id, userData);  		   

				});	

		    }
		    else {
		    	console.log("REJEITADO");
		    	user.disconnect();
		    }
		});	
	});

    
	




	user.on('disconnect', function () {
		//Removemos o usuário da lista de usuários conectados	
		console.log("DESCONECTANDO... " + user.id);

		redis.hdel("online_users", user.id);

	});

});

/*** /socket.io ***/


fake = function() {
	//setado no Python	
	redis.set("user_key:" + user_id, 12345, function (err, obj) {
		redis.expire("user_key:" + user_id, 60)
	});
	redis.hset("user_data", user_id, JSON.stringify({products: _.range(1, _.random(0, 1000), _.random(0, 50)) }));
}