/*************** SETUP/ ***************/

var express = require('express')
, app = express()
, server = require('http').createServer(app)
, redis = require('redis').createClient()
, io = require('socket.io').listen(server);


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



/*************** SOCKET.IO/ ***************/

io.on('disconnect', function(){	
	//Já que a pessoa saiu, removemos ela da Hash
	redis.hdel(this.now.room, this.user.clientId);		   
});

io.on('connect', function(){	
	//Salvamos o recem-entrante no Redis em formato JSON e atualizamos a lista para todos nas 3 linhas seguintes
	userInfo = JSON.stringify({ "nid": this.now.nid, "name": this.now.name, "initials": this.now.initials, "avatar": this.now.avatar, "avatar_big": this.now.avatar_big, "broadcasting": "false" });   
	redis.hset(this.now.room, this.user.clientId, userInfo);  	   
});

/*** /socket.io ***/