run: node_modules
	@yarn start

deploy:
	@yarn build
	@surge -d https://synthetix.surge.sh -p build

node_modules:
	@yarn

gen-net-cfg:
	@node bin/networks.js 

.PHONY: \
	run \
	deploy \
	gen-net-cfg
