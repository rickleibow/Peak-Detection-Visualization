import React from 'react';
import ReactDOM from 'react-dom';

import socketIOClient from 'socket.io-client';
import D3TsChart from '../d3-helpers/d3-ts-chart';

const MAX_POINTS_TO_STORE = 50;
const DEFAULT_X_TICKS = 20;
const SOCKETIO_ERRORS = ['reconnect_error', 'connect_error', 'connect_timeout', 'connect_failed', 'error'];

/**
*  Component cycle:
* 1. `componentDidMount()`
*     => Initialize a `D3TsChart()` with nod data
* 2. `socket.connect()` pings WebSocket then on each `on('reading')` event:
*     => `storeReading()` in component `state`
*     => `updateChart()` seperates original data from peak detection series
*         then calls `D3TsChart.setSeriesData()`
*
* 3. `componentWillUnmount()` disconects from socket.
*/
export class Chart extends React.Component {

  tsChart;
  socket;
  state = {
    data: [],
    lastTimestamp: null,
    connected: false,
    error: ''
  }

  componentDidMount() {
    if (this.props['sensorId'] === undefined) throw new Error('You have to pass \'sensorId\' prop to Chart component');
    if (this.props['x-ticks'] > MAX_POINTS_TO_STORE) throw new Error(`You cannot display more than ${MAX_POINTS_TO_STORE} 'x-ticks'. `);

    const parentRef = ReactDOM.findDOMNode(this);

    this.tsChart = new D3TsChart({
      elRef: parentRef.getElementsByClassName('chart-container')[0],
      classList: {
        svg: 'z-chart'
      }
    });

    this.tsChart.addSeries({
      name: 'sensor-data',
      type: 'LINE',
      id: 'sensor',
      stroke: 'steelblue',
    });

    this.tsChart.addSeries({
      name: 'z-score',
      type: 'AREA',
      id: 'zline',
      fill: 'rgba(255, 50, 50, 0.25)',
      stroke: 'transparent',
      strokeWidth: 0,
    });

    this.connect();
  }

  connect = () => {
    this.socket = socketIOClient(`http://localhost:4001?sensor=${this.props.sensorId}`);
    this.socket.on('reading', this.storeReading);

    // Various Errors handling
    SOCKETIO_ERRORS.forEach(errType => {
      this.socket.on(errType, (error) => this.setError(errType, error));
    });
  }
  componentWillUnmount() {
    this.socket.disconnect();
  }

  setError = (type, error) => {
    this.setState({ data: [], connected: false, error: `${error.toString()} | ${type}` });
  }

  /**
  * `pointsToStore` is the number of stored data points
  * - We need to cache more date than 20 
  * - This should be useful when implementing variable `x-ticks` in UI
  */
  storeReading = (response) => {
    const reading = JSON.parse(response);
    this.setState((prevState) => {
      const data = prevState.data;
      const pointsToStore = Math.max(data.length - MAX_POINTS_TO_STORE, 0);

      data.push(reading);

      return {
        data: data.slice(pointsToStore),
        connected: true,
        error: false,
        lastTimestamp: new Date(data[data.length - 1].timestamp).toLocaleTimeString()
      };
    });

    this.updateChart();
  }

  /**
   * `highestValueInView` is used to calculate out the highest value in the currently
   * shown data in order to normalize the zscores 0/1 to it
   */
  updateChart() {
    const xTicks = Math.max(this.state.data.length - (this.props['x-ticks'] || DEFAULT_X_TICKS), 0);
    const data = this.state.data.slice(xTicks);
    const highestValueInView = Math.max(...data.map(p => p.value));
    const zLine = data.map(p => ({ timestamp: p.timestamp, value: p.zscore ? highestValueInView : 0 }));

    this.tsChart.adjustAxes(data);
    this.tsChart.setSeriesData('sensor-data', data, false);
    this.tsChart.setSeriesData('z-score', zLine, false);
  }

  render = () => (
    <div className="card">

      <span className={'status ' + (this.state.connected ? 'success-bg' : 'danger-bg')}>
        {this.state.connected ? 'Connected to' : 'Disconnected from'} Sensor {this.props.sensorId}
      </span>

      <span className="error danger">{this.state.error}</span>
      <span className={'timestamp ' + (this.state.connected ? 'success' : 'danger')}>
        Showing last {this.props['x-ticks'] || DEFAULT_X_TICKS} readings
        |
        Last Reading: {this.state.lastTimestamp}
      </span>

      <div className={'chart-container ' + (this.state.error ? 'faded' : '')}></div>
    </div>
  )

}
export default Chart;
