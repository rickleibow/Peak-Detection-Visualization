import React from 'react';
import ReactDOM from 'react-dom';
import './styles/main.scss';
import Chart from './components/Chart';

ReactDOM.render(
  <div>
    <a href="https://github.com/rickleibow/Peak-Detection-Visualization" target="_blank" rel="noopener noreferrer">[ GitHub ]</a>
    <a href="#" target="_blank" rel="noopener noreferrer">[ Research ]</a>
    
    <h1>Peak Detection Dashboard</h1>
    
    <Chart sensorId="1" />
    <Chart sensorId="2" x-ticks="20" />
    <Chart sensorId="3" x-ticks="20"/>
  </div>
  , document.getElementById('root'));
