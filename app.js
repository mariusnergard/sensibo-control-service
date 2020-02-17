const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const axios = require('axios');
require('dotenv').config();

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const key = process.env.APIKEY;
const nightTemp = process.env.NighttimeTargetTemp;
const nightStart = process.env.NighttimeStart;
const nightEnd = process.env.NighttimeEnd;
const autoCoolDown = process.env.AutoCoolDown;
const autoCoolDownNightTime = process.env.AutoCoolDownNightTime;
const autoCoolDownTrigger = process.env.autoCoolDownNightTime;

let isNight = false;
let resumeTo = 22;
let deviceId = false;
let autoCoolDownOn = false;

const TurnOff = (acState) => {
  return new Promise((resolve, reject) => {
    console.log('!! Turning off !!');
    const newState = {...acState, on: false};
    axios.put(`https://home.sensibo.com/api/v1/pods/${deviceId}/timer/?apiKey=${key}`, {
      minutesFromNow: 1,
      acState: newState,
    })
})};

const TurnOn = (acState) => {
  return new Promise((resolve, reject) => {
    console.log('!! Turning on !!');
    const newState = {...acState, on: true};
    axios.put(`https://home.sensibo.com/api/v1/pods/${deviceId}/timer/?apiKey=${key}`, {
      minutesFromNow: 1,
      acState: newState,
    })
  })};

const CoolModeOn = (acState) => {
  return new Promise((resolve, reject) => {
    console.log('!! Turning on cool mode !!');
    const newState = {...acState, on: true, mode: 'cool'};
    axios.put(`https://home.sensibo.com/api/v1/pods/${deviceId}/timer/?apiKey=${key}`, {
      minutesFromNow: 1,
      acState: newState,
    })
  })};

const HeatModeOn = (acState) => {
  return new Promise((resolve, reject) => {
    console.log('!! Turning on heat mode !!');
    const newState = {...acState, on: true, mode: 'heat'};
    axios.put(`https://home.sensibo.com/api/v1/pods/${deviceId}/timer/?apiKey=${key}`, {
      minutesFromNow: 1,
      acState: newState,
    })
  })};

const AutoCoolModeOn = (acState) => {
  return new Promise((resolve, reject) => {
    console.log('!! Turning on cool mode !!');
    const newState = {...acState, on: true, mode: 'cool'};
    axios.put(`https://home.sensibo.com/api/v1/pods/${deviceId}/timer/?apiKey=${key}`, {
      minutesFromNow: 1,
      acState: newState,
    })
  })};

const AutoCoolModeOff = (acState) => {
  return new Promise((resolve, reject) => {
    console.log('!! Turning on cool mode !!');
    const newState = {...acState, on: false, mode: 'heat'};
    axios.put(`https://home.sensibo.com/api/v1/pods/${deviceId}/timer/?apiKey=${key}`, {
      minutesFromNow: 1,
      acState: newState,
    })
  })};

const service = () => {
  axios.get('/')
    .then((res) => console.log(res));
  axios.get(`https://home.sensibo.com/api/v2/users/me/pods?fields=*&apiKey=${key}`, {
  })
    .then(async ({ data }) => {
      const { result } = data;
      const { acState, measurements, id } = result[0];
      const { on, targetTemperature, mode } = acState;
      const roundTemp = Math.round(measurements.temperature);
      const adjustedTemp = targetTemperature - 3;
      const useAdjustedTemp = true;
      deviceId = id;
      // const now = 4;
      const now = new Date().getHours();
      isNight = now >= nightStart || now < nightEnd;
      console.log({ now });
      // console.log({ acState });
      // console.log({ isNight });
      // console.log( { measurements });

      console.log(`-- Room temp: ${measurements.temperature}. Rounded to: ${roundTemp} --`);
      console.log(`-- Target temp: ${(useAdjustedTemp) ? adjustedTemp : targetTemperature} --`);
      console.log(`-- AC On: ${on} --`);
      console.log(`-- AC Mode: ${acState.mode} --`);

      // Todo - Set fans speed based on diff!
      // Todo - Add logger

      if (autoCoolDownOn) {
        console.log('-- Currently in cool mode --');
        // Check if we still want to cool down
        if (roundTemp < (targetTemperature - 2) + autoCoolDownTrigger) {
          if (isNight && !autoCoolDownNightTime) {
            // No cooltime at night
            console.log('-- Do not cool down at nighttime --');
            autoCoolDownOn = false;
            await AutoCoolModeOff()
              .catch(e => console.log(e));
            return;
          }
          // Return if yes
          console.log('-- Keep cooling down --');
          return;
        } else {
          // Turn of cool mode if no
          console.log('-- Temp below trigger, turn off cool mode --');
          autoCoolDownOn = false;
          await AutoCoolModeOff()
            .catch(e => console.log(e));
          return;
        }

      }

      if (!isNight) {
        console.log('-- Day time --');
        // Heat mode?
        if (acState.mode === 'heat') {
          // Heat Mode!
          if (roundTemp > ((useAdjustedTemp) ? adjustedTemp : targetTemperature) && on) {
            console.log('-- Temp above target and ac is currently on --');
            // Temp above target and ac is currently on
            // Turn off ac
            await TurnOff()
              .catch(e => console.log(e));
          } else if (roundTemp < ((useAdjustedTemp) ? adjustedTemp : targetTemperature) && !on) {
            console.log('-- Temp below target and ac currently off --');
            // Temp below target and currently off
            // Turn on ac
            await TurnOn()
              .catch(e => console.log(e));
          } else if (roundTemp < ((useAdjustedTemp) ? adjustedTemp : targetTemperature) + autoCoolDownTrigger && autoCoolDown) {
            console.log('-- Temp above auto-cool-down trigger - change to cool mode --');
            // Temp above auto-cool-down trigger
            // Change to cool mode
            autoCoolDownOn = true;
            await AutoCoolModeOn()
              .catch(e => console.log(e));
          } else {
            // AC State ok!
            console.log(`-- AC State ok! (On: ${acState.on}) --`);
          }
        } else {
          // Cool mode!
          if (roundTemp < ((useAdjustedTemp) ? adjustedTemp : targetTemperature) && on) {
            console.log('-- Temp below target and ac is currently on --');
            // Temp above target and ac is currently on
            // Turn off ac
            await TurnOff()
              .catch(e => console.log(e));
          } else if (roundTemp > ((useAdjustedTemp) ? adjustedTemp : targetTemperature) && !on) {
            console.log('-- Temp above target and ac currently off --');
            // Temp below target and currently off
            // Turn on ac
            await TurnOn()
              .catch(e => console.log(e));
          } else if (roundTemp < ((useAdjustedTemp) ? adjustedTemp : targetTemperature) + autoCoolDownTrigger && autoCoolDown) {
            autoCoolDownOn = true;
            await AutoCoolModeOn()
              .catch(e => console.log(e));
          } else {
            // AC State ok!
            console.log(`-- AC State ok! (On: ${acState.on}) --`);
          }
        }
      } else {
        console.log('-- Night time --');
        // It's night time!
        if (measurements.temperature > nightTemp && acState.on) {
          await TurnOff()
            .catch((e => console.log(e)));
        } else if (measurements.temperature < nightTemp && !acState.on) {
          await TurnOn()
            .catch(e => console.log(e));
        }
      }

    })
    .catch(err => console.log(err));
};


setInterval(function(){
  service();
}, process.env.IntervalMs);

// Run service at startup
service();

module.exports = app;
