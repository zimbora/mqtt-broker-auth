# Changelog

# 1.0.5
	!!temporary: dispatch packets to a different kafka topic
		If project is freeRTOS2 and packets keyword is detected as 3rd subpath, sends topic to a special topic inlocMsgsSniffed.
		The reason of this solution is to redirect all sniffed packets to a different topic in kafka. Allowing different servers to deal with it.
		This code is temporary until a final solution is reached.
		kafka topics retention must be supported on config file.
		Maybe its time to fork this repo for dedicated features

# 1.0.4
	Supports kafka
		If enabled, published mqtt messages started with topics defined in KAFKA_TOPICS will be dispatched to kafka

# 1.0.3
	new features (Authorization, subscribe and publish):
	 - on auth: checks if device is registered
	 - on auth: checks if client is registered
	 - on auth: don't add clients
	 - on subscribe: validates permissions (checks project, uid prefix and uid length)
	 - on publish: validates permissions (checks project, uid prefix and uid length)

# 1.0.2
	fixes vulnerability on websocket stream DOS attack - npm >= 20
	Uses node 22

# 1.0.1
	First stable version
	
# 1.0.0
	
