#!/bin/bash

docker buildx build --push --platform linux/amd64 -t zimbora/rtls-mqtt-aedes .
