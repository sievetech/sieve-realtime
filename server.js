
/*************** SETUP/ ***************/

var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , redis = require('redis').createClient()
  , io = require('socket.io').listen(server)
  , _ = require ('underscore')
  , amqp = require('amqp');

//todo: conectar-se na fila real
var fila = amqp.createConnection({host: '50.57.175.89', 'login': 'sieve', 'password': '#dev@sieve5'});

app.configure('development', function() {
	server.listen(1337, function() {
		console.log("Listening on port 1337");
	});
});

app.configure('production', function() { 
	server.listen(8080, function() {
		console.log("Listening on port 8080");
	});
});

/*** /setup ***/


/*************** ROUTES/ ***************/

app.get('/', function(request, response) {
	response.send("Sieve realtime is up!");	
});

/*** /routes ***/


redis.on("error", function(err) {
	console.log("Redis error: " + err);
});


/*** /routes ***/



/*************** QUEUE/ ***************/

fila.addListener('ready', function() {
	console.log("A FILA ESTÁ PRONTA");
    var queue = fila.queue('cdp_realtime', {"passive": true}, function(queue) {
        queue.subscribe(function(message) {
            console.log("MUDANÇA RECEBIDA: " + message);
           
            //todo: remover pois está enviando tudo pra todo mundo.
            //io.sockets.emit('product updated', message);            

            //Filtra pra quais usuários devemos mandar esse update. Somente aqueles que se interessarem pelo ID do produto.
            redis.hgetall("online_users", function(err, obj) {
				_.each(obj, function(v, k) {
					//v é products e k é o socketID do usuário
					v = JSON.parse(v);

					if (_.contains(v.products, message.product_id)) {
						console.log("AEEEEEEEEEEE VOCÊ FOI PREMIADO");
						io.sockets.emit('product updated', message);

						io.sockets.socket(k).emit('system status', "Recebendo: " + message.product_id); //todo: não enviar mais isso
					}
					else {
						console.log("ESSE PRODUTO NÃO ERA PRA VOCÊ");
						//todo: não enviar nada
						io.sockets.socket(k).emit('system status', message.product_id + " foi rejeitado..."); //todo: não enviar mais isso
					}
				});
            });

            //Envia pras salas respectivas de brand, category e artefact
            io.sockets.in("category/" + message.category_id).emit('category updated', message);
            io.sockets.in("brand/" + message.brand_id).emit('brand updated', message);
            io.sockets.in("artefact/" + message.artefact_id).emit('artefact updated', message);
    	});
	});
});

/*** /queue ***/



/*************** SOCKET.IO/ ***************/

io.on('connection', function(user) {	

	io.sockets.socket(user.id).emit('user infos', function(data) {
		user_id = data.id;
		user_sent_key = data.key;
		user_rooms = data.rooms;

		fake();

		//Autentica o usuário checando se a key que ele disse é a mesma do Redis
	    redis.get("user_key:" + user_id, function(err, obj) {	
	    	
	    	obj = JSON.parse(obj); 

	    	if (obj === user_sent_key) {
		    	console.log("USUÁRIO AUTORIZADO");

		    	//Adiciona o usuário como online, com os produtos dele	    	
		    	redis.hget("user_data", user_id, function(err, obj) {
					obj = JSON.parse(obj);

					//"products" é um Array IDs das coisas que ele deve receber				
					userData = JSON.stringify({ 
						"products": obj.products
					});

					//Adicionamos o usuário na lista de usuários conectados
					redis.hset("online_users", user.id, userData);
				});	

				if (user_rooms) {

					_.each(user_rooms, function(room) {
						console.log("Entrando na sala: " + room)
						//todo: alguma lógica para verificar se o usuário tem permissão de entrar em tal sala. Ou até mesmo esse dado vir do Redis apenas (assim como o products acima)
						user.join(room);

						//Emit pra essa sala 'room' e só pra esse usuário. Ou seja, só ele recebe e ele só recebe se estiver na Room mesmo!						
						io.sockets.in(room).socket(user.id).emit('room joined', "Você entrou na Room: " + room); //todo: Remover esse emit pois era só pra testes
					});
					
				}
		    }

		    else {
		    	console.log("USUÁRIO REJEITADO");
		    	user.disconnect();
		    }
		});	
	});



	user.on('disconnect', function() {
		//Removemos o usuário da lista de usuários conectados	
		console.log("DESCONECTANDO USUÁRIO: " + user.id);

		redis.hdel("online_users", user.id);
	});

});

/*** /socket.io ***/

//Função "fake" executa coisas que em breve serão feitas por outros e de outra forma
fake = function() {
	//Setado no Python	
	redis.set("user_key:" + user_id, 12345, function(err, obj) {
		//Key expirando em 60 segundos
		redis.expire("user_key:" + user_id, 60)
	});

	redis.hset(
		"user_data", 
		user_id, 
		JSON.stringify({
			//products: _.range(1, _.random(0, 1000), _.random(0, 50)) 
			products: [14205, 14202, 14257, 14217, 27468, 1133, 1145, 34897, 28645, 22014, 24507, 55138, 1225, 34920, 1162, 25461]
		})
	);
}