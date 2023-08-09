
# Devices

In order to support a new type of device, you need to create a js file with the same name of topic before MACRO_UID_PREFIX

Example:

topic: freeRTOS2/uid:001122aabbcc

MACRO_UID_PREFIX = "uid:"

freeRTOS2 is the project
uid:001122aabbcc is the UID

All messages published on the topic freeRTOS2 will be processed by freeRTOS2 js file

In the same way, a model in models path has to be created.

If the topic after UID matches any db column, it will update that field.

A project defines the device architecture.


