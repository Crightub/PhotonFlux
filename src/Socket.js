

import { differenceInSeconds, addMinutes, format } from 'date-fns'
const axios = require('axios');

const server_url = 'http://ec2-3-144-135-66.us-east-2.compute.amazonaws.com:9494';
const url_base = 'http://ec2-3-144-135-66.us-east-2.compute.amazonaws.com:9494/charge-thing-2c33963a-b294-581f-5dab-74dd08169898/';
const addon_start_charging = 'action/startcharging';
const addon_get_power_history = 'property/currentchargepowerkwhistory';
const addon_battery_capacity = 'property/batterycapacitykwh';

class Socket {

    static getPowerHistory() {
        axios.get(url_base + addon_get_power_history)
            .then(function (response) {
                // handle success
                console.log(response);
            })
            .catch(function (error) {
                // handle error
                console.log(error);
            });
    }

    static getBatteryCapacity() {
        axios.get(url_base + addon_battery_capacity)
            .then(function (response) {
                // handle success
                console.log(response);
            })
            .catch(function (error) {
                // handle error
                console.log(error);
            });
    }

    static startChargingProcess(time_completion, battery_start, battery_goal, battery_capacity, pv_power_peak) {
        //Calculate time until the charging has to be completed in seconds
        let start = new Date();
        console.log("start: " + start);
        console.log("end: " + time_completion);
        let time_completion_seconds = differenceInSeconds(time_completion, start);
        console.log(time_completion_seconds);

        if (time_completion_seconds < 0 || battery_goal === battery_start) {
            console.log("invalid input");
            return;
        }

        // console.log("Call AI: \nbattery_start: " + battery_start
        //     + "\nbattery_capacity: " + battery_capacity
        //     + "\ntime completion: " + time_completion_seconds
        //     + "\npeak power: " + pv_power_peak
        //     + "\nbattery_goal: " + battery_goal);

        //invoke start charging method on the AI server
        const promise = axios({
            method: 'post',
            url: url_base + addon_start_charging,
            data: {
                input: {
                    remainingTimeInSeconds: time_completion_seconds,
                    chargeStartPercent: battery_start,
                    chargeGoalPercent: battery_goal,
                    batteryCapacitykWh: battery_capacity,
                    solarPeakPowerkW: pv_power_peak
                }
            },
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
        });

        const dataPromise = promise.then(function (response) {

            let url = server_url + response.data.invocation;
            //Get Data returned by the AI API
            const getPromise = axios.get(url);
            const getDataPromise = getPromise.then(response => response.data.result);
            return getDataPromise;
        });

        return dataPromise
    }

    /**
     * Method takes the data generated by the AI and transforms it into a JSON understood by the areachart
     */
    static processPowerData(result) {
        //Retrieve data from response

        //Array containing the battery percentage 
        let battery_percent_history = result.chargeStatePercentHistory;

        //Array containg the total power (grid+solar) used for charging
        let charge_power_history = result.currentChargePowerkWHistory;

        //Array containg the power produced by the pv 
        let solar_production_history = result.currentSolarPowerkWHistory;

        let solar_power_history = [];
        let grid_power_history = [];


        //Calculate and round grid/solar power used for charging
        for (let i = 0; i < charge_power_history.length; i++) {
            const charge_power = charge_power_history[i];

            const solar_power = solar_production_history[i];

            // if (solar_power >= 1.4)
            //     solar_power_history[i] = Math.round((solar_power + Number.EPSILON) * 100) / 100;
            // else
            //     solar_power_history[i] = 0;


            if (charge_power - solar_power >= 0) {
                solar_power_history[i] = Math.round((solar_power + Number.EPSILON) * 100) / 100;
                grid_power_history[i] = Math.round(((charge_power - solar_power) + Number.EPSILON) * 100) / 100;
            } else {
                grid_power_history[i] = 0;
                solar_power_history[i] = 0;
            }

        }

        //Transform data into following format
        //data = [
        // {
        // 	time: '12:00',
        // 	pv: 0,
        // 	grid: 5,
        // }]

        const data = [];
        let time_charging = new Date();

        for (let i = 0; i < charge_power_history.length; i++) {
            data[i] = {
                time: format(time_charging, 'HH:mm'),
                pv: solar_power_history[i],
                grid: grid_power_history[i]
            }

            time_charging = addMinutes(time_charging, 30);
        }

        return data;

    }

    static getTotalGridPower(data) {
        let totalGridPower = 0;
        for (let i = 0; i < data.length; i++) {
            const element = data[i];

            totalGridPower += element.grid;
        }

        return Math.round(((0.5 * totalGridPower) + Number.EPSILON) * 100) / 100;
    }

    static getTotalSolarPower(data) {
        let totalSolarPower = 0;

        for (let i = 0; i < data.length; i++) {
            const element = data[i];

            totalSolarPower += element.pv;
        }

        return Math.round(((0.5 * totalSolarPower) + Number.EPSILON) * 100) / 100;
    }

}

export default Socket;
