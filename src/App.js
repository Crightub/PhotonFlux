import './App.css';
import { Paper, Grid, Box, Typography, Button, Container, Stack, Slider, Dialog, DialogTitle, DialogActions, DialogContent, TextField, InputAdornment, FormControl, OutlinedInput } from '@mui/material'
import { Bolt } from '@mui/icons-material';
import { ThemeProvider } from '@mui/material/styles';
import { XAxis, YAxis, ResponsiveContainer, AreaChart, Area, Tooltip, Legend } from 'recharts';
import { differenceInSeconds, addMinutes, format } from 'date-fns'
import React from 'react';
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import DateTimePicker from '@mui/lab/DateTimePicker';
import de from 'date-fns/locale/de';
import dark from './theme';
import Socket from './Socket';
import Car from './Car';

class App extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			//TODO replace hard coded values
			car: new Car('Tesla', 'Model S', 0, 0),

			battery: null,

			peak_power: null,

			time_completion: null,

			postal_code: 0,

			renderOutput: false,
			outputData: preData,
			total_power_grid: 0,
			total_power_solar: 0,

			renderError: false,
			errorMessage: ""
		}

	}

	handleBatteryChange = (event, battery_new) => {
		//Update range with the constraints: range_start <= range_new <= range_max
		if (battery_new < this.state.car.battery_status)
			return;


		this.setState({ battery: battery_new });
	}

	handleStartChargingClick = () => {

		if (this.state.battery === null || this.state.peak_power === null || this.state.time_completion === null || this.state.car.battery_capacity === 0) {
			this.outputErrorMessage("Please fill out every textfield.");
			return;
		} else {
			this.setState({ renderError: false });
		}

		let start = new Date();
        let time_completion_seconds = differenceInSeconds(this.state.time_completion, start);

        if (time_completion_seconds < 0) {
            this.outputErrorMessage("Please choose a finish time in the future.");
			return;
		} else {
			this.setState({ renderError: false });
		}

		if(this.state.battery === this.state.car.battery_status){
			this.outputErrorMessage("Please choose a higher desired percentage of battery.");
			return;
		} else {
			this.setState({renderError : false});
		}


		Socket.startChargingProcess(time_completion_seconds, this.state.car.battery_status, this.state.battery, this.state.car.battery_capacity, this.state.peak_power)
			.then(data => {
				console.log(data);
				let processedData = Socket.processPowerData(data);
				let totalGridPower = Socket.getTotalGridPower(processedData);
				let totalSolarPower = Socket.getTotalSolarPower(processedData);

				this.setState({ total_power_grid: totalGridPower, total_power_solar: totalSolarPower, outputData: processedData });
				console.log(Socket.processPowerData(data));
			})
			.catch(err => console.log(err));

		this.setState({ renderOutput: true });
	}

	outputErrorMessage(message) {
		this.setState({ renderError: true , errorMessage: message});
	}

	handleClose = () => {
		this.setState({ renderOutput: false });
	}

	handleBatteryCapcityTextChange = (event) => {
		this.state.car.battery_capacity = parseInt(event.target.value);
	}

	handleBatteryPercentageTextChange = (event) => {
		let battery_percentage = parseInt(event.target.value);
		this.state.car.battery_status = battery_percentage;

		if (battery_percentage > this.state.battery) {
			this.setState({ battery: battery_percentage });
		}
	}

	handlePeakPVPowerTextChange = (event) => {
		this.setState({ peak_power: parseInt(event.target.value) });
	}

	handlePostalCodeChange = (event) => {
		this.setState({ postal_code: event.target.value });
	}

	render() {

		return (
			<ThemeProvider theme={dark}>
				<Stack
					direction="column"
					justifyContent="flex-start"
					spacing={2}
					sx={{ m: 1 }}>

					<Container maxWidth="sm">
						<Typography variant="h5" color="textPrimary" align="center">PhotonFlux</Typography>
					</Container>

					<Box>

						<Grid container spacing={8}>

							<Grid item lg={4} xs={12}>
								<Stack
									direction="column"
									justifyContent="flex-start"
									spacing={2}>

									<Paper elevation={6}>
										<Box padding={4}>
											<Stack direction="column"
												justifyContent="flex-start"
												alignItems="center"
												spacing={3}>

												<Typography variant="h6" color="textPrimary">
													Car properties
												</Typography>


												<Typography variant="body1" color="textPrimary">
													Battery capacity
												</Typography>


												<FormControl sx={{ m: 1 }} variant="outlined">
													<OutlinedInput
														id="batteryCapacityTxt"
														placeholder={'90'}
														onChange={this.handleBatteryCapcityTextChange}
														endAdornment={<InputAdornment position="end">kWh</InputAdornment>}
													/>
												</FormControl>

												<Typography variant="body1" color="textPrimary">
													Current battery percentage
												</Typography>


												<FormControl sx={{ m: 1 }} variant="outlined">
													<OutlinedInput
														id="batteryCapacityTxt"
														placeholder={'20'}
														onChange={this.handleBatteryPercentageTextChange}
														endAdornment={<InputAdornment position="end">%</InputAdornment>}
													/>
												</FormControl>

												<Typography variant="body1" color="textPrimary">
													Peak power of photovoltaik system
												</Typography>


												<FormControl sx={{ m: 1 }} variant="outlined">
													<OutlinedInput
														id="peakPowerPVTxt"
														placeholder={'10'}
														onChange={this.handlePeakPVPowerTextChange}
														endAdornment={<InputAdornment position="end">kWp</InputAdornment>}
													/>

												</FormControl>

												{/* <Typography variant="body1" color="textPrimary">
													Postal code
												</Typography>

												<TextField id="postalCodeTxt" placeholder='80335' variant="outlined" onChange={this.handlePostalCodeChange} /> */}


												<Typography variant="body1" color="textPrimary">
													Desired percentage of battery
												</Typography>


												<Slider
													defaultValue={this.state.battery_start}
													aria-label="battery_slider"
													step={5}
													value={this.state.battery}
													valueLabelDisplay='auto'
													valueLabelFormat={(x) => x + "%"}
													marks={marksBatteryStatus}
													onChange={this.handleBatteryChange}
												/>


												<LocalizationProvider dateAdapter={AdapterDateFns} locale={de}>
													<DateTimePicker
														label="Finish Time"
														value={this.state.time_completion}
														onChange={(new_time_completion) => {
															this.setState({ time_completion: new_time_completion });
														}}

														renderInput={(params) => <TextField {...params} />}
													/>
												</LocalizationProvider>

												{this.state.renderError && (
													<Typography variant="body1" color="#f50a35">
														{this.state.errorMessage}
													</Typography>
												)}

												<Button variant="contained"
													onClick={this.handleStartChargingClick}
													startIcon={<Bolt />}>
													Start Charging
												</Button>


											</Stack>
										</Box>

									</Paper>

								</Stack>
							</Grid>

							<Dialog fullWidth={true}
								open={this.state.renderOutput}
								onClose={this.handleClose}>
								<DialogTitle>Optimal charging</DialogTitle>
								<DialogContent>
									<Box padding={0}>

										<ResponsiveContainer width="100%" height={400}>
											<AreaChart
												data={this.state.outputData}
											>

												<defs>
													<linearGradient id="colorGrid" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor="#edd147" stopOpacity={0.8} />
														<stop offset="95%" stopColor="#edd147" stopOpacity={0} />
													</linearGradient>
													<linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
														<stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
													</linearGradient>
												</defs>

												<XAxis dataKey="time" />
												<YAxis tickFormatter={kWFormatter} />

												<Tooltip
													separator=': '
													contentStyle={{ backgroundColor: "#282c34" }}
													formatter={function (value, name) {
														switch (name) {
															case 'grid': return [`${value} kWh`, 'Grid'];
															case 'pv': return [`${value} kWh`, 'PV'];
														}
														return `${value} kWh`;
													}}
													labelFormatter={function (value) {
														return ``;
													}} />

												<Legend verticalAlign="bottom"/>

												<Area type="monotone" dataKey="grid" stroke="#edd147" fillOpacity={1} fill="url(#colorGrid)" />
												<Area type="monotone" dataKey="pv" stroke="#82ca9d" fillOpacity={1} fill="url(#colorPv)" />

											</AreaChart>

										</ResponsiveContainer>


									</Box>
								</DialogContent>

								<DialogActions>
									<Button onClick={this.handleClose}>Close</Button>
								</DialogActions>
							</Dialog>

						</Grid>

					</Box>
				</Stack>
			</ThemeProvider>
		);
	}

}

const kWFormatter = (value) => {
	return value + " kW";
}

const marksBatteryStatus = [
	{
		value: 0,
		label: '0%',
	},
	{
		value: 20,
		label: '20%'
	},
	{
		value: 40,
		label: '40%'
	},
	{
		value: 60,
		label: '60%'
	},
	{
		value: 80,
		label: '80%'
	},
	{
		value: 100,
		label: '100%'
	}
]

const preData = [
	{
		time: '12:00',
		pv: 0,
		grid: 0,
	},
]

export default App;
