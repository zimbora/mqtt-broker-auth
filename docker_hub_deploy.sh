#!/bin/bash

# execute the following command before build
# docker buildx use iot

docker buildx build --push --platform linux/amd64 -t zimbora/mqtt-broker-auth .

# return to buildx default
# docker buildx use default
