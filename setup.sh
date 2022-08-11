#!/bin/bash

set_default () {
    echo "ORIENT_HOST=localhost" > ./.env
    echo "ORIENT_PORT=2424" >> ./.env
    echo "ORIENT_USER=root" >> ./.env
    echo "ORIENT_PASS=pass" >> ./.env
    echo "DB_NAME=stoat" >> ./.env
    echo "DB_USER=root" >> ./.env
    echo "DB_PASS=pass" >> ./.env

    echo "PORT=3001" >> ./.env

    echo "REACT_APP_DB=http://localhost:3001" > ./client/.env
}

set_user_input () {
    echo "ORIENT_HOST [default: localhost]: "
    read -e host

    if [ -z $host ]
    then
        echo "ORIENT_HOST=localhost" > ./.env
    else
        echo "ORIENT_HOST=$host" > ./.env
    fi

    echo "ORIENT_PORT [default: 2424]: "
    read -e port

    if [ -z $port ]
    then
        echo "ORIENT_PORT=2424" >> ./.env
    else
        echo "ORIENT_PORT=$port" >> ./.env
    fi

    echo "ORIENT_USER [default: root]: "
    read -e user

    if [ -z $user ]
    then
        echo "ORIENT_USER=root" >> ./.env
    else
        echo "ORIENT_USER=$user" >> ./.env
    fi

    echo "ORIENT_PASS [default: OrientPW]: "
    read -e pass

    if [ -z $pass ]
    then
        echo "ORIENT_PASS=OrientPW" >> ./.env
    else
        echo "ORIENT_PASS=$pass" >> ./.env
    fi

    echo "DB_NAME [default: stoat]: "
    read -e name

    if [ -z $name ]
    then
        echo "DB_NAME=2424" >> ./.env
    else
        echo "DB_NAME=$name" >> ./.env
    fi

    echo "DB_USER [default: root]: "
    read -e dbuser

    if [ -z $dbuser ]
    then
        echo "DB_USER=root" >> ./.env
    else
        echo "DB_USER=$dbuser" >> ./.env
    fi

    echo "DB_PASS [default: OrientPW]: "
    read -e dbpass

    if [ -z $dbpass ]
    then
        echo "DB_PASS=OrientPW" >> ./.env
    else
        echo "DB_PASS=$dbpass" >> ./.env
    fi

    echo "Server PORT [default: 3001]: "
    read -e sport

    if [ -z $sport ]
    then
        echo "PORT=3001" >> ./.env
        echo "REACT_APP_DB=http://localhost:3001" > ./client/.env
    else
        echo "PORT=$sport" >> ./.env
        echo "REACT_APP_DB=http://localhost:$sport" > ./client/.env
    fi
    
}

echo "Setting up STOAT environment variables."

echo "Do you want to use the default values? (Y, n): "
read -e opt 

if [ -z $opt ]
then 
    opt='y'
fi

if [ $opt = 'n' ] || [ $opt = 'N' ]
then
    set_user_input
else
    set_default
fi

echo "Environment variables have been set up. They can be found in ./.env and ./client/.env"
echo "./.env :"
cat ./.env
echo "./client/.env :"
cat ./client/.env