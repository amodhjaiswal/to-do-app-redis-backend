#!/bin/bash

# Print the current working directory
echo "Current Directory:"
pwd

# Navigate to the specified directory
cd /home/ubuntu

# Start the application using PM2
pm2 start app.js
