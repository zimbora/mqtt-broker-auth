# Changelog

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
	
